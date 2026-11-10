"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminPassword, COOKIE, createToken, sessionMaxAge } from "@/lib/session";

export type LoginState = { error: string; name: string } | null;

export async function login(_: LoginState, form: FormData): Promise<LoginState> {
  const name = String(form.get("name") ?? "").trim().slice(0, 20);
  const pw = String(form.get("password") ?? "");
  const expected = adminPassword();
  if (!name) return { error: "이름을 입력하세요.", name };
  if (!expected || pw !== expected) return { error: "비밀번호가 맞지 않습니다.", name };
  (await cookies()).set(COOKIE, await createToken(name), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: sessionMaxAge,
    path: "/",
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(COOKIE);
  redirect("/admin/login");
}
