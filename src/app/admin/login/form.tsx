"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action}>
      <label htmlFor="name">이름</label>
      <input id="name" name="name" type="text" placeholder="예: 문선웅" style={{ width: "100%" }} autoComplete="name" defaultValue={state?.name} key={state?.name ?? ""} />
      <label htmlFor="password">비밀번호</label>
      <input id="password" name="password" type="password" style={{ width: "100%" }} autoComplete="current-password" />
      {state?.error && <p className="errs small" role="alert">{state.error}</p>}
      <button className="btn" style={{ marginTop: 16, width: "100%" }} disabled={pending}>
        {pending ? "확인 중…" : "로그인"}
      </button>
    </form>
  );
}
