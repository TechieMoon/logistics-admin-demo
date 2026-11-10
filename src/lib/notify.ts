import type { Db } from "./db";
import { STATUS_LABEL, type Status } from "./status";

export function buildMessage(orderNo: string, status: Status): string {
  return `[배송 알림 데모] 주문 ${orderNo}의 배송 상태가 '${STATUS_LABEL[status]}'(으)로 바뀌었습니다.`;
}

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

/**
 * 상태 변경 알림을 보내고 결과를 기록합니다.
 * 상태 변경이 이미 저장된 뒤에 부르므로, 알림이 실패해도 상태는 되돌리지 않습니다.
 */
export async function notifyStatusChange(
  db: Db,
  shipment: { id: number; order_no: string },
  status: Status,
  opts: { webhookUrl?: string; fetcher?: Fetcher; timeoutMs?: number } = {},
): Promise<"sent" | "failed" | "skipped"> {
  const message = buildMessage(shipment.order_no, status);
  const url = opts.webhookUrl ?? process.env.NOTIFY_WEBHOOK_URL;
  let result: "sent" | "failed" | "skipped" = "skipped";
  let detail: string | null = "웹훅 주소가 없어 기록만 남김";

  if (url) {
    const f = opts.fetcher ?? fetch;
    try {
      const res = await f(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Slack·Discord 웹훅이 각각 text·content를 읽으므로 둘 다 넣습니다.
        body: JSON.stringify({ text: message, content: message, order_no: shipment.order_no, status }),
        signal: AbortSignal.timeout(opts.timeoutMs ?? 3000),
      });
      result = res.ok ? "sent" : "failed";
      detail = res.ok ? null : `HTTP ${res.status}`;
    } catch (e) {
      result = "failed";
      detail = e instanceof Error && e.name === "TimeoutError" ? "응답 시간 초과" : "전송 오류";
    }
  }

  await db.query(
    "insert into notifications (shipment_id, message, result, detail) values ($1, $2, $3, $4)",
    [shipment.id, message, result, detail],
  );
  return result;
}
