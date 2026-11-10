import { beforeEach, describe, expect, it } from "vitest";
import { createPglite, type Db } from "@/lib/db";
import { changeStatus, getShipment, importShipments, listShipments, trackShipment, countByStatus } from "@/lib/shipments";
import { notifyStatusChange } from "@/lib/notify";
import { seedIfEmpty } from "@/lib/seed";

let db: Db;
const row = (order_no: string, phone = "01012345678") => ({ order_no, customer_name: "홍길동", phone, item_name: "의자", quantity: 1, tracking_cn: null });

beforeEach(async () => {
  db = await createPglite();
});

describe("상태 변경", () => {
  it("변경과 이력이 함께 저장된다", async () => {
    await importShipments(db, "t.csv", 1, [row("A-1")], "직원1");
    const [s] = await listShipments(db);
    const r = await changeStatus(db, s.id, "pending", "received", "직원2");
    expect(r.ok).toBe(true);
    const d = await getShipment(db, s.id);
    expect(d!.shipment.status).toBe("received");
    expect(d!.history.map((h) => [h.from_status, h.to_status, h.changed_by])).toEqual([
      [null, "pending", "직원1"],
      ["pending", "received", "직원2"],
    ]);
  });

  it("두 직원이 동시에 같은 단계를 누르면 한 명만 성공한다", async () => {
    await importShipments(db, "t.csv", 1, [row("A-1")], "직원1");
    const [s] = await listShipments(db);
    const results = await Promise.all([
      changeStatus(db, s.id, "pending", "received", "갑"),
      changeStatus(db, s.id, "pending", "received", "을"),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toEqual({ ok: false, reason: "conflict" });
    const d = await getShipment(db, s.id);
    expect(d!.history).toHaveLength(2);
  });

  it("건너뛰는 변경은 DB에 닿기 전에 막는다", async () => {
    await importShipments(db, "t.csv", 1, [row("A-1")], "직원1");
    const [s] = await listShipments(db);
    expect(await changeStatus(db, s.id, "pending", "customs", "갑")).toEqual({ ok: false, reason: "invalid_transition" });
    expect(await changeStatus(db, 9999, "pending", "received", "갑")).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("엑셀 가져오기", () => {
  it("이미 있는 주문번호는 건너뛰고 나머지만 넣는다", async () => {
    await importShipments(db, "a.csv", 1, [row("A-1")], "직원1");
    const r = await importShipments(db, "b.csv", 2, [row("A-1"), row("A-2")], "직원1");
    expect(r).toEqual({ inserted: 1, skipped: 1 });
    expect((await listShipments(db)).map((s) => s.order_no).sort()).toEqual(["A-1", "A-2"]);
  });
});

describe("고객 조회", () => {
  it("주문번호와 뒷자리 4자리가 모두 맞아야 하고, 연락처는 돌려주지 않는다", async () => {
    await importShipments(db, "a.csv", 1, [row("A-1", "01012345678")], "직원1");
    expect(await trackShipment(db, "A-1", "0000")).toBeNull();
    expect(await trackShipment(db, "A-2", "5678")).toBeNull();
    const r = await trackShipment(db, "a-1", "5678");
    expect(r?.customer).toBe("홍*동");
    expect(JSON.stringify(r)).not.toContain("01012345678");
    expect(JSON.stringify(r)).not.toContain("직원1");
  });

  it("검색어의 %와 _는 글자 그대로 찾는다", async () => {
    await importShipments(db, "a.csv", 2, [row("A_1"), row("AB1")], "직원1");
    expect((await listShipments(db, { q: "A_" })).map((s) => s.order_no)).toEqual(["A_1"]);
  });
});

describe("알림", () => {
  it("웹훅이 실패해도 기록은 남고 상태는 그대로다", async () => {
    await importShipments(db, "a.csv", 1, [row("A-1")], "직원1");
    const [s] = await listShipments(db);
    await changeStatus(db, s.id, "pending", "received", "갑");
    const res = await notifyStatusChange(db, s, "received", {
      webhookUrl: "https://example.invalid/hook",
      fetcher: async () => new Response("no", { status: 500 }),
    });
    expect(res).toBe("failed");
    const d = await getShipment(db, s.id);
    expect(d!.shipment.status).toBe("received");
    expect(d!.notifications[0]).toMatchObject({ result: "failed", detail: "HTTP 500" });
  });

  it("웹훅 주소가 없으면 보내지 않고 기록만 남긴다", async () => {
    await importShipments(db, "a.csv", 1, [row("A-1")], "직원1");
    const [s] = await listShipments(db);
    delete process.env.NOTIFY_WEBHOOK_URL;
    expect(await notifyStatusChange(db, s, "received")).toBe("skipped");
  });
});

describe("데모 데이터", () => {
  it("36건을 만들고 두 번 실행해도 늘지 않는다", async () => {
    await seedIfEmpty(db);
    await seedIfEmpty(db);
    const c = await countByStatus(db);
    expect(Object.values(c).reduce((a, b) => a + b, 0)).toBe(36);
  });
});
