import type { Db } from "./db";
import { canTransition, isStatus, STATUSES, type Status } from "./status";
import { maskName, normalizePhone, type ShipmentInput } from "./validate";

export interface Shipment {
  id: number;
  order_no: string;
  customer_name: string;
  phone: string;
  item_name: string;
  quantity: number;
  tracking_cn: string | null;
  status: Status;
  created_at: string;
  updated_at: string;
}

export interface HistoryRow {
  from_status: Status | null;
  to_status: Status;
  changed_by: string;
  changed_at: string;
}

const COLS = "id::int as id, order_no, customer_name, phone, item_name, quantity, tracking_cn, status, created_at, updated_at";

export async function listShipments(db: Db, opts: { status?: string; q?: string } = {}) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.status && isStatus(opts.status)) {
    params.push(opts.status);
    where.push(`status = $${params.length}`);
  }
  const q = opts.q?.trim();
  if (q) {
    params.push(`%${q.replace(/[\\%_]/g, (m) => "\\" + m)}%`);
    where.push(`(order_no ilike $${params.length} or customer_name ilike $${params.length})`);
  }
  const sql = `select ${COLS} from shipments ${where.length ? "where " + where.join(" and ") : ""} order by updated_at desc, id desc limit 200`;
  return db.query<Shipment>(sql, params);
}

export async function countByStatus(db: Db): Promise<Record<Status, number>> {
  const rows = await db.query<{ status: Status; n: number }>("select status, count(*)::int as n from shipments group by status");
  const out = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  for (const r of rows) out[r.status] = r.n;
  return out;
}

export async function getShipment(db: Db, id: number) {
  const [s] = await db.query<Shipment>(`select ${COLS} from shipments where id = $1`, [id]);
  if (!s) return null;
  const history = await db.query<HistoryRow>(
    "select from_status, to_status, changed_by, changed_at from status_history where shipment_id = $1 order by changed_at, id",
    [id],
  );
  const notifications = await db.query<{ message: string; result: string; detail: string | null; created_at: string }>(
    "select message, result, detail, created_at from notifications where shipment_id = $1 order by created_at desc, id desc",
    [id],
  );
  return { shipment: s, history, notifications };
}

export type ChangeResult =
  | { ok: true; shipment: { id: number; order_no: string } }
  | { ok: false; reason: "not_found" | "invalid_transition" | "conflict" };

/**
 * 상태를 한 단계 앞으로 바꿉니다.
 * 화면에서 본 상태(expected)가 그사이 바뀌었으면 저장하지 않습니다.
 * 두 직원이 같은 주문을 동시에 누르면 한 명만 성공합니다.
 */
export async function changeStatus(db: Db, id: number, expected: Status, to: Status, by: string): Promise<ChangeResult> {
  if (!canTransition(expected, to)) return { ok: false, reason: "invalid_transition" };
  return db.tx(async (t) => {
    const updated = await t.query<{ id: number; order_no: string }>(
      "update shipments set status = $1, updated_at = now() where id = $2 and status = $3 returning id::int as id, order_no",
      [to, id, expected],
    );
    if (!updated.length) {
      const exists = await t.query("select 1 from shipments where id = $1", [id]);
      return { ok: false as const, reason: exists.length ? ("conflict" as const) : ("not_found" as const) };
    }
    await t.query("insert into status_history (shipment_id, from_status, to_status, changed_by) values ($1, $2, $3, $4)", [
      id,
      expected,
      to,
      by,
    ]);
    return { ok: true as const, shipment: updated[0] };
  });
}

export async function existingOrderNos(db: Db, orderNos: string[]): Promise<Set<string>> {
  if (!orderNos.length) return new Set();
  const rows = await db.query<{ order_no: string }>("select order_no from shipments where order_no = any($1::text[])", [orderNos]);
  return new Set(rows.map((r) => r.order_no));
}

/** 검증을 통과한 행을 한 트랜잭션으로 넣습니다. 그사이 다른 사람이 같은 주문번호를 넣었으면 그 행만 건너뜁니다. */
export async function importShipments(db: Db, fileName: string, total: number, rows: ShipmentInput[], by: string) {
  return db.tx(async (t) => {
    let inserted = 0;
    for (const r of rows) {
      const res = await t.query<{ id: number }>(
        `insert into shipments (order_no, customer_name, phone, item_name, quantity, tracking_cn)
         values ($1, $2, $3, $4, $5, $6) on conflict (order_no) do nothing returning id::int as id`,
        [r.order_no, r.customer_name, r.phone, r.item_name, r.quantity, r.tracking_cn],
      );
      if (res.length) {
        inserted++;
        await t.query("insert into status_history (shipment_id, from_status, to_status, changed_by) values ($1, null, 'pending', $2)", [
          res[0].id,
          by,
        ]);
      }
    }
    const skipped = total - inserted;
    await t.query("insert into import_batches (file_name, total_rows, inserted, skipped, created_by) values ($1, $2, $3, $4, $5)", [
      fileName,
      total,
      inserted,
      skipped,
      by,
    ]);
    return { inserted, skipped };
  });
}

/**
 * 고객 조회. 주문번호와 전화번호 뒷자리 4자리가 모두 맞아야 결과를 줍니다.
 * 틀렸을 때 "주문번호는 있는데 번호가 틀림"을 구분해 알려 주지 않습니다(주문번호 추측 방지).
 */
export async function trackShipment(db: Db, orderNo: string, phoneLast4: string) {
  const last4 = normalizePhone(phoneLast4);
  if (!/^\d{4}$/.test(last4) || !orderNo.trim()) return null;
  const [s] = await db.query<Shipment>(`select ${COLS} from shipments where order_no = $1 and right(phone, 4) = $2`, [
    orderNo.trim().toUpperCase(),
    last4,
  ]);
  if (!s) return null;
  const history = await db.query<{ to_status: Status; changed_at: string }>(
    "select to_status, changed_at from status_history where shipment_id = $1 order by changed_at, id",
    [s.id],
  );
  // 고객 화면에는 이름 일부, 품목, 상태만 보냅니다. 연락처·직원 이름은 보내지 않습니다.
  return {
    order_no: s.order_no,
    customer: maskName(s.customer_name),
    item_name: s.item_name,
    quantity: s.quantity,
    status: s.status,
    history,
  };
}

export async function listNotifications(db: Db) {
  return db.query<{ id: number; order_no: string; message: string; result: string; detail: string | null; created_at: string }>(
    `select n.id::int as id, s.order_no, n.message, n.result, n.detail, n.created_at
     from notifications n join shipments s on s.id = n.shipment_id order by n.created_at desc, n.id desc limit 100`,
  );
}

export async function listImports(db: Db) {
  return db.query<{ id: number; file_name: string; total_rows: number; inserted: number; skipped: number; created_by: string; created_at: string }>(
    "select id::int as id, file_name, total_rows, inserted, skipped, created_by, created_at from import_batches order by created_at desc limit 20",
  );
}
