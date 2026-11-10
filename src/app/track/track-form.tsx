"use client";

import { useActionState } from "react";
import { track } from "./actions";
import { STATUS_LABEL, STATUSES } from "@/lib/status";
import { when } from "@/lib/format";

const MSG = {
  none: "일치하는 주문이 없습니다. 주문번호와 전화번호 뒷자리를 다시 확인해 주세요.",
  limited: "조회를 너무 많이 시도했습니다. 10분 뒤에 다시 시도해 주세요.",
  bad: "주문번호와 전화번호 뒷자리 4자리를 입력해 주세요.",
};

export function TrackForm() {
  const [state, action, pending] = useActionState(track, null);
  const found = state?.kind === "found" ? state.data : null;
  const idx = found ? STATUSES.indexOf(found.status) : -1;

  return (
    <>
      <form action={action} className="card" key={state ? `${state.orderNo}|${state.last4}|${state.kind}` : "init"}>
        <label htmlFor="order_no" style={{ marginTop: 0 }}>주문번호</label>
        <input id="order_no" name="order_no" type="text" placeholder="예: SH2611-0012" style={{ width: "100%" }} defaultValue={state?.orderNo} />
        <label htmlFor="last4">전화번호 뒷자리 4자리</label>
        <input id="last4" name="last4" type="text" inputMode="numeric" maxLength={4} placeholder="1234" style={{ width: "100%" }} defaultValue={state?.last4} />
        <button className="btn" style={{ marginTop: 16, width: "100%" }} disabled={pending}>
          {pending ? "조회 중…" : "배송 조회"}
        </button>
      </form>

      {state && state.kind !== "found" && <div className={`notice ${state.kind === "limited" ? "info" : "bad"}`}>{MSG[state.kind]}</div>}

      {found && (
        <div className="card">
          <p className="muted small" style={{ margin: 0 }}>{found.order_no} · {found.customer} 님</p>
          <h2 style={{ margin: "4px 0 2px" }}>{STATUS_LABEL[found.status]}</h2>
          <p className="muted" style={{ marginTop: 0 }}>{found.item_name} × {found.quantity}</p>
          <div className="steps">
            {STATUSES.map((s, i) => (
              <div key={s} className={`s ${i <= idx ? "done" : ""} ${i === idx ? "cur" : ""}`}>{STATUS_LABEL[s]}</div>
            ))}
          </div>
          <ul className="plain" style={{ marginTop: 14 }}>
            {[...found.history].reverse().map((h, i) => (
              <li key={i}><b>{STATUS_LABEL[h.to_status]}</b> <span className="muted small">{when(h.changed_at)}</span></li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
