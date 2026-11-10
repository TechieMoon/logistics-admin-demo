import { LoginForm } from "./form";

export default function LoginPage() {
  const demo = process.env.DEMO_MODE === "true" || process.env.NODE_ENV !== "production";
  return (
    <main className="wrap narrow">
      <div className="card" style={{ marginTop: 40 }}>
        <h1>직원 로그인</h1>
        <p className="muted small">상태를 바꾼 사람으로 기록될 이름을 입력하세요.</p>
        {demo && <div className="notice info small">데모 비밀번호: demo1234</div>}
        <LoginForm />
      </div>
    </main>
  );
}
