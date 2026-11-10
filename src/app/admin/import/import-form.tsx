"use client";

import { useActionState, useRef, useState, startTransition } from "react";
import Link from "next/link";
import { commitImport, previewImport } from "./actions";

const FIELDS: [string, string][] = [
  ["order_no", "주문번호"],
  ["customer_name", "고객명"],
  ["phone", "연락처"],
  ["item_name", "품목"],
  ["quantity", "수량"],
  ["tracking_cn", "중국송장번호"],
];

export function ImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, previewAction, previewing] = useActionState(previewImport, null);
  const [done, commitAction, committing] = useActionState(commitImport, null);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const send = (fn: (fd: FormData) => void) => {
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    startTransition(() => fn(fd));
  };

  const result = done && done.kind !== "preview" ? done : null;

  return (
    <>
      <div className="card">
        <div className="inline" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            aria-label="엑셀 또는 CSV 파일"
          />
          <button className="btn" disabled={!file || previewing} onClick={() => send(previewAction)}>
            {previewing ? "검사 중…" : "검사하기"}
          </button>
          <a className="btn ghost" href="/sample-orders.csv" download>예시 파일 받기</a>
        </div>
        <p className="muted small" style={{ marginBottom: 0 }}>
          첫 줄은 머리글입니다. 필수: 주문번호, 고객명, 연락처, 품목, 수량 · 선택: 중국송장번호 · xlsx/csv, 2MB·1,000행까지
        </p>
      </div>

      {result?.kind === "error" && <div className="notice bad">{result.text}</div>}
      {result?.kind === "done" && (
        <div className="notice ok">
          {result.fileName}: {result.inserted}건 저장했습니다.
          {result.skipped > 0 && ` ${result.skipped}건은 문제가 있거나 이미 있는 주문이라 건너뛰었습니다.`}{" "}
          <Link href="/admin">주문 목록 보기</Link>
        </div>
      )}
      {preview?.kind === "error" && <div className="notice bad">{preview.text}</div>}

      {preview?.kind === "preview" && !result && (
        <div className="card">
          {preview.missing.length ? (
            <div className="notice bad">필수 열이 없습니다: {preview.missing.join(", ")}. 머리글 이름을 확인하세요.</div>
          ) : (
            <>
              <div className="head" style={{ marginBottom: 12 }}>
                <div>
                  <h2 style={{ margin: 0 }}>{preview.fileName} 검사 결과</h2>
                  <p className="muted small" style={{ margin: 0 }}>
                    전체 {preview.results.length}행 · 저장 가능 <b>{preview.valid}</b> · 문제 있음{" "}
                    <b className={preview.invalid ? "errs" : ""}>{preview.invalid}</b>
                  </p>
                </div>
                <div className="inline" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <label className="small" style={{ margin: 0, fontWeight: 500 }}>
                    <input type="checkbox" checked={onlyErrors} onChange={(e) => setOnlyErrors(e.target.checked)} /> 문제 있는 행만
                  </label>
                  <button className="btn" disabled={!preview.valid || committing} onClick={() => send(commitAction)}>
                    {committing ? "저장 중…" : `문제없는 ${preview.valid}건 저장`}
                  </button>
                </div>
              </div>
              <div className="tablebox">
                <table>
                  <thead>
                    <tr>
                      <th>행</th>
                      {FIELDS.map(([, l]) => <th key={l}>{l}</th>)}
                      <th>문제</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.results
                      .filter((r) => !onlyErrors || r.errors.length)
                      .map((r) => (
                        <tr key={r.row} className={r.errors.length ? "err" : ""}>
                          <td>{r.row}</td>
                          {FIELDS.map(([k]) => <td key={k}>{r.raw[k]}</td>)}
                          <td className="errs small">{r.errors.join(", ")}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
