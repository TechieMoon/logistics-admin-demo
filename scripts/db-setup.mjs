// Supabase(또는 다른 Postgres)에 스키마를 만듭니다. 사용법: DATABASE_URL=... npm run db:setup
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL이 없습니다. .env.local 또는 환경변수를 확인하세요.");
  process.exit(1);
}
const sql = postgres(url, { prepare: false, max: 1, ssl: url.includes("localhost") ? false : "require" });
await sql.unsafe(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
console.log("스키마 적용 완료");
await sql.end();
