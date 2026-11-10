import Link from "next/link";
import { TrackForm } from "./track-form";

export default function TrackPage() {
  const demo = process.env.DEMO_MODE === "true" || process.env.NODE_ENV !== "production";
  return (
    <>
      <header className="topbar">
        <div className="in"><Link className="brand" href="/">퀵스타 배송 조회</Link></div>
      </header>
      <main className="wrap narrow">
        <h1 style={{ marginTop: 16 }}>내 배송 조회</h1>
        <p className="muted">주문번호와 주문할 때 적은 전화번호 뒷자리 4자리를 넣어 주세요.</p>
        {demo && <div className="notice info small">데모: 주문번호 QS2611-0008, 뒷자리 4자리 3352</div>}
        <TrackForm />
      </main>
    </>
  );
}
