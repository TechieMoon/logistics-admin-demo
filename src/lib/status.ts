export const STATUSES = ["pending", "received", "shipped", "customs", "domestic", "delivered"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  pending: "입고 대기",
  received: "중국 창고 입고",
  shipped: "출고",
  customs: "통관 중",
  domestic: "국내 배송",
  delivered: "배송 완료",
};

export function isStatus(v: unknown): v is Status {
  return typeof v === "string" && (STATUSES as readonly string[]).includes(v);
}

/** 다음 단계. 마지막 단계면 null. */
export function nextStatus(s: Status): Status | null {
  const i = STATUSES.indexOf(s);
  return i < STATUSES.length - 1 ? STATUSES[i + 1] : null;
}

/** 한 단계 앞으로만 갈 수 있습니다. 건너뛰기·되돌리기는 막습니다. */
export function canTransition(from: Status, to: Status): boolean {
  return nextStatus(from) === to;
}
