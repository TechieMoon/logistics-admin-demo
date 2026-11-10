"use client";

import { useActionState } from "react";
import { advance } from "./actions";
import { STATUS_LABEL, type Status } from "@/lib/status";

export function AdvanceForm({ id, current, next }: { id: number; current: Status; next: Status | null }) {
  const [state, action, pending] = useActionState(advance, null);
  return (
    <div>
      {state && <div className={`notice ${state.kind}`}>{state.text}</div>}
      {next ? (
        <form action={action} className="inline">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="expected" value={current} />
          <input type="hidden" name="to" value={next} />
          <button className="btn" disabled={pending}>
            {pending ? "저장 중…" : `다음 단계로: ${STATUS_LABEL[next]}`}
          </button>
          <span className="muted small">한 단계씩만 앞으로 갈 수 있습니다.</span>
        </form>
      ) : (
        <p className="muted">배송이 끝난 주문입니다.</p>
      )}
    </div>
  );
}
