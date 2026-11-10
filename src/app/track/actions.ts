"use server";

import { headers } from "next/headers";
import { getDb } from "@/lib/db";
import { allow } from "@/lib/ratelimit";
import { trackShipment } from "@/lib/shipments";

type Input = { orderNo: string; last4: string };
export type TrackState =
  | ({ kind: "found"; data: NonNullable<Awaited<ReturnType<typeof trackShipment>>> } & Input)
  | ({ kind: "none" | "limited" | "bad" } & Input)
  | null;

export async function track(_: TrackState, form: FormData): Promise<TrackState> {
  const orderNo = String(form.get("order_no") ?? "").slice(0, 40);
  const last4 = String(form.get("last4") ?? "").slice(0, 10);
  const input = { orderNo, last4 };
  if (!orderNo.trim() || !/^\d{4}$/.test(last4.trim())) return { kind: "bad", ...input };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allow(`track:${ip}`)) return { kind: "limited", ...input };
  const data = await trackShipment(await getDb(), orderNo, last4.trim());
  return data ? { kind: "found", data, ...input } : { kind: "none", ...input };
}
