import Link from "next/link";
import { cookies } from "next/headers";
import { COOKIE, verifyToken } from "@/lib/session";
import { logout } from "./login/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const name = await verifyToken((await cookies()).get(COOKIE)?.value);
  return (
    <>
      <header className="topbar">
        <div className="in">
          <Link className="brand" href="/">배송대행 어드민 데모</Link>
          {name && (
            <>
              <Link href="/admin">주문 목록</Link>
              <Link href="/admin/import">엑셀 가져오기</Link>
              <Link href="/admin/notifications">알림 기록</Link>
              <span className="sp" />
              <span className="who hide-sm">{name} 님</span>
              <form action={logout}>
                <button type="submit">로그아웃</button>
              </form>
            </>
          )}
        </div>
      </header>
      {children}
    </>
  );
}
