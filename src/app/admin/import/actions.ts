"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { readSheet } from "@/lib/sheet";
import { existingOrderNos, importShipments } from "@/lib/shipments";
import { mapHeaders, validateRows, type RowResult } from "@/lib/validate";

export type Preview =
  | { kind: "error"; text: string }
  | { kind: "preview"; fileName: string; missing: string[]; results: RowResult[]; valid: number; invalid: number }
  | { kind: "done"; fileName: string; inserted: number; skipped: number };

async function check(file: File) {
  const { headers, rows } = await readSheet(file.name, await file.arrayBuffer());
  const db = await getDb();
  const col = mapHeaders(headers).map.order_no;
  const orderNos = col === undefined ? [] : rows.map((r) => String(r[col] ?? "").trim().toUpperCase()).filter(Boolean);
  const existing = await existingOrderNos(db, orderNos);
  return { db, ...validateRows(headers, rows, existing) };
}

/** 1단계: 올린 파일을 검사만 하고 저장하지 않습니다. */
export async function previewImport(_: Preview | null, form: FormData): Promise<Preview> {
  await requireStaff();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return { kind: "error", text: "파일을 고르세요." };
  try {
    const { missing, results } = await check(file);
    if (missing.length) return { kind: "preview", fileName: file.name, missing, results: [], valid: 0, invalid: 0 };
    const valid = results.filter((r) => r.value).length;
    return { kind: "preview", fileName: file.name, missing, results, valid, invalid: results.length - valid };
  } catch (e) {
    return { kind: "error", text: e instanceof Error ? e.message : "파일을 읽지 못했습니다." };
  }
}

/**
 * 2단계: 같은 파일을 다시 받아 서버에서 다시 검사한 뒤 문제없는 행만 저장합니다.
 * 브라우저가 보낸 미리보기 결과를 그대로 믿지 않습니다.
 */
export async function commitImport(_: Preview | null, form: FormData): Promise<Preview> {
  const by = await requireStaff();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return { kind: "error", text: "파일을 고르세요." };
  try {
    const { db, missing, results } = await check(file);
    if (missing.length) return { kind: "error", text: `필수 열이 없습니다: ${missing.join(", ")}` };
    const ok = results.flatMap((r) => (r.value ? [r.value] : []));
    const r = await importShipments(db, file.name, results.length, ok, by);
    revalidatePath("/admin");
    return { kind: "done", fileName: file.name, ...r };
  } catch (e) {
    return { kind: "error", text: e instanceof Error ? e.message : "저장하지 못했습니다." };
  }
}
