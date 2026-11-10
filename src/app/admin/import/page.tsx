import { getDb } from "@/lib/db";
import { listImports } from "@/lib/shipments";
import { when } from "@/lib/format";
import { ImportForm } from "./import-form";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const batches = await listImports(await getDb());
  return (
    <main className="wrap">
      <div className="head">
        <div>
          <h1>엑셀로 주문 한꺼번에 등록</h1>
          <p className="muted small">먼저 검사 결과를 보여 주고, 저장 버튼을 눌러야 저장됩니다. 문제가 있는 행은 건너뜁니다.</p>
        </div>
      </div>
      <ImportForm />
      <div className="card">
        <h2>최근 가져오기 기록</h2>
        {batches.length ? (
          <ul className="plain">
            {batches.map((b) => (
              <li key={b.id}>
                <b>{b.file_name}</b> · 전체 {b.total_rows}행 중 {b.inserted}건 저장, {b.skipped}건 건너뜀
                <div className="muted small">{when(b.created_at)} · {b.created_by}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">아직 기록이 없습니다.</p>
        )}
      </div>
    </main>
  );
}
