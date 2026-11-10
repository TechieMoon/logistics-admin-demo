import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, verifyToken } from "./session";

/** 서버 액션 안에서 다시 확인합니다. middleware만 믿지 않습니다. */
export async function requireStaff(): Promise<string> {
  const name = await verifyToken((await cookies()).get(COOKIE)?.value);
  if (!name) redirect("/admin/login");
  return name;
}
