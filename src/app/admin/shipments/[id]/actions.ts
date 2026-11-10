"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { notifyStatusChange } from "@/lib/notify";
import { changeStatus } from "@/lib/shipments";
import { isStatus, STATUS_LABEL } from "@/lib/status";

export type AdvanceState = { kind: "ok" | "bad"; text: string } | null;

export async function advance(_: AdvanceState, form: FormData): Promise<AdvanceState> {
  const by = await requireStaff();
  const id = Number(form.get("id"));
  const expected = form.get("expected");
  const to = form.get("to");
  if (!Number.isInteger(id) || !isStatus(expected) || !isStatus(to)) return { kind: "bad", text: "잘못된 요청입니다." };

  const db = await getDb();
  const r = await changeStatus(db, id, expected, to, by);
  revalidatePath(`/admin/shipments/${id}`);
  revalidatePath("/admin");
  if (!r.ok) {
    const text = {
      conflict: "그사이 다른 직원이 상태를 바꿨습니다. 화면을 새로 고쳐 최신 상태를 확인하세요.",
      invalid_transition: "한 단계씩만 바꿀 수 있습니다.",
      not_found: "주문을 찾을 수 없습니다.",
    }[r.reason];
    return { kind: "bad", text };
  }
  const sent = await notifyStatusChange(db, r.shipment, to);
  const note = { sent: "고객 알림을 보냈습니다.", failed: "고객 알림 전송은 실패했습니다(기록 남김).", skipped: "알림 문구를 기록했습니다." }[sent];
  return { kind: "ok", text: `'${STATUS_LABEL[to]}'(으)로 바꿨습니다. ${note}` };
}
