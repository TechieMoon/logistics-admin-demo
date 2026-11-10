import Link from "next/link";
import { getDb } from "@/lib/db";
import { listNotifications } from "@/lib/shipments";
import { when } from "@/lib/format";

export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = { sent: "보냄", failed: "실패", skipped: "기록만" };

export default async function NotificationsPage() {
  const rows = await listNotifications(await getDb());
  const hook = Boolean(process.env.NOTIFY_WEBHOOK_URL);
  return (
    <main className="wrap">
      <div className="head">
        <div>
          <h1>고객 알림 기록</h1>
          <p className="muted small">
            상태가 바뀔 때마다 고객에게 보낼 문구를 만들어 남깁니다.{" "}
            {hook ? "웹훅 주소로 전송합니다." : "웹훅 주소가 없어 실제로 보내지 않고 기록만 합니다."}
          </p>
        </div>
      </div>
      <div className="tablebox">
        <table>
          <thead>
            <tr><th>시각</th><th>주문번호</th><th>결과</th><th>문구</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="muted">{when(r.created_at)}</td>
                <td>{r.order_no}</td>
                <td><span className={`badge ${r.result}`}>{LABEL[r.result]}</span>{r.detail && <div className="muted small">{r.detail}</div>}</td>
                <td>{r.message}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={4} className="muted">아직 기록이 없습니다. <Link href="/admin">주문 목록</Link>에서 상태를 바꿔 보세요.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}
