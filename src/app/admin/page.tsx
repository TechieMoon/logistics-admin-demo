import Link from "next/link";
import { getDb } from "@/lib/db";
import { countByStatus, listShipments } from "@/lib/shipments";
import { isStatus, STATUS_LABEL, STATUSES } from "@/lib/status";
import { phoneMask, when } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminList({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const status = isStatus(sp.status) ? sp.status : undefined;
  const q = (sp.q ?? "").slice(0, 50);
  const db = await getDb();
  const [rows, counts] = await Promise.all([listShipments(db, { status, q }), countByStatus(db)]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const href = (s?: string) => {
    const p = new URLSearchParams();
    if (s) p.set("status", s);
    if (q) p.set("q", q);
    const qs = p.toString();
    return qs ? `/admin?${qs}` : "/admin";
  };

  return (
    <main className="wrap">
      <div className="head">
        <div>
          <h1>주문 목록</h1>
          <p className="muted small">최근에 바뀐 주문이 위에 옵니다. 최대 200건까지 보여 줍니다.</p>
        </div>
        <form className="inline" action="/admin">
          {status && <input type="hidden" name="status" value={status} />}
          <input type="search" name="q" defaultValue={q} placeholder="주문번호 또는 고객명" aria-label="검색" />
          <button className="btn ghost">검색</button>
        </form>
      </div>

      <nav className="counts" aria-label="상태별 건수">
        <Link href={href()} className={!status ? "on" : ""}>
          <div className="n">{total}</div>
          <div className="l">전체</div>
        </Link>
        {STATUSES.map((s) => (
          <Link key={s} href={href(s)} className={status === s ? "on" : ""}>
            <div className="n">{counts[s]}</div>
            <div className="l">{STATUS_LABEL[s]}</div>
          </Link>
        ))}
      </nav>

      <div className="tablebox">
        <table>
          <thead>
            <tr>
              <th>주문번호</th>
              <th>고객</th>
              <th className="hide-sm">연락처</th>
              <th>품목</th>
              <th className="hide-sm">중국 송장</th>
              <th>상태</th>
              <th className="hide-sm">최근 변경</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/admin/shipments/${r.id}`}>{r.order_no}</Link></td>
                <td>{r.customer_name}</td>
                <td className="hide-sm">{phoneMask(r.phone)}</td>
                <td>{r.item_name} × {r.quantity}</td>
                <td className="hide-sm">{r.tracking_cn ?? <span className="muted">없음</span>}</td>
                <td><span className={`badge ${r.status}`}>{STATUS_LABEL[r.status]}</span></td>
                <td className="hide-sm muted">{when(r.updated_at)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={7} className="muted">조건에 맞는 주문이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
