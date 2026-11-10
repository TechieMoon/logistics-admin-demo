import Link from "next/link";

export default function Home() {
  return (
    <main className="wrap">
      <div className="hero">
        <p className="muted small">연습용 데모 · 가상의 배송대행 주문 데이터</p>
        <h1>퀵스타 물류 어드민 데모</h1>
        <p className="muted">중국에서 한국으로 오는 배송대행 주문을 직원이 관리하고, 고객이 직접 배송 상태를 확인하는 화면입니다.</p>
      </div>
      <div className="choices">
        <Link className="card" href="/admin">
          <h2>직원용 관리 화면 →</h2>
          <p className="muted">주문 목록과 상태 변경, 엑셀·CSV로 주문 한꺼번에 등록, 고객 알림 기록</p>
        </Link>
        <Link className="card" href="/track">
          <h2>고객용 배송 조회 →</h2>
          <p className="muted">주문번호와 전화번호 뒷자리 4자리로 내 배송 단계 확인</p>
        </Link>
      </div>
      <p className="muted small">실제 회사의 데이터나 시스템과는 관계없습니다. 소스: github.com/TechieMoon/quickstar-logistics-admin</p>
    </main>
  );
}
