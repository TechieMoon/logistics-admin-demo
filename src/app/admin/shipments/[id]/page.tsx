import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { getShipment } from "@/lib/shipments";
import { nextStatus, STATUS_LABEL, STATUSES } from "@/lib/status";
import { when } from "@/lib/format";
import { AdvanceForm } from "./advance-form";

export const dynamic = "force-dynamic";

const RESULT_LABEL: Record<string, string> = { sent: "보냄", failed: "실패", skipped: "기록만" };

export default async function ShipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const data = await getShipment(await getDb(), id);
  if (!data) notFound();
  const { shipment: s, history, notifications } = data;
  const idx = STATUSES.indexOf(s.status);

  return (
    <main className="wrap">
      <p className="small"><Link href="/admin">← 주문 목록</Link></p>
      <div className="head">
        <div>
          <h1>{s.order_no}</h1>
          <p className="muted">{s.customer_name} · {s.item_name} × {s.quantity}</p>
        </div>
        <span className={`badge ${s.status}`} style={{ fontSize: 14, padding: "4px 12px" }}>{STATUS_LABEL[s.status]}</span>
      </div>

      <div className="card">
        <div className="steps">
          {STATUSES.map((st, i) => (
            <div key={st} className={`s ${i <= idx ? "done" : ""} ${i === idx ? "cur" : ""}`}>{STATUS_LABEL[st]}</div>
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          <AdvanceForm id={s.id} current={s.status} next={nextStatus(s.status)} />
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h2>주문 정보</h2>
          <dl className="kv">
            <dt>고객명</dt><dd>{s.customer_name}</dd>
            <dt>연락처</dt><dd>{s.phone.replace(/^(\d{3})(\d{3,4})(\d{4})$/, "$1-$2-$3")}</dd>
            <dt>품목</dt><dd>{s.item_name}</dd>
            <dt>수량</dt><dd>{s.quantity}</dd>
            <dt>중국 송장번호</dt><dd>{s.tracking_cn ?? <span className="muted">없음</span>}</dd>
            <dt>등록</dt><dd>{when(s.created_at)}</dd>
          </dl>
        </div>
        <div className="card">
          <h2>상태 변경 이력</h2>
          <ul className="plain">
            {history.map((h, i) => (
              <li key={i}>
                <b>{STATUS_LABEL[h.to_status]}</b>
                {h.from_status ? <span className="muted"> ← {STATUS_LABEL[h.from_status]}</span> : <span className="muted"> (등록)</span>}
                <div className="muted small">{when(h.changed_at)} · {h.changed_by}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card">
        <h2>고객 알림 기록</h2>
        {notifications.length ? (
          <ul className="plain">
            {notifications.map((n, i) => (
              <li key={i}>
                <span className={`badge ${n.result}`}>{RESULT_LABEL[n.result]}</span> {n.message}
                <div className="muted small">{when(n.created_at)}{n.detail ? ` · ${n.detail}` : ""}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">아직 보낸 알림이 없습니다.</p>
        )}
      </div>
    </main>
  );
}
