import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "퀵스타 물류 어드민 데모",
  description: "배송대행 주문의 상태 관리, 엑셀 가져오기, 고객 조회를 연습한 데모입니다.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
