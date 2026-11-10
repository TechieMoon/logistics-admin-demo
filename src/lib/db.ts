import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { seedIfEmpty } from "./seed";

/** 서비스 코드가 쓰는 최소한의 DB 인터페이스. Supabase(Postgres)와 로컬 PGlite가 같은 SQL을 씁니다. */
export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  tx<R>(fn: (db: Db) => Promise<R>): Promise<R>;
}

const schemaSql = () => readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8");

async function createPostgres(url: string): Promise<Db> {
  const { default: postgres } = await import("postgres");
  // Supabase 연결 풀러(transaction 모드)에서는 prepared statement를 쓰지 않습니다.
  const sql = postgres(url, { prepare: false, max: 3, ssl: url.includes("localhost") ? false : "require" });
  const wrap = (s: typeof sql): Db => ({
    query: async (q, p = []) => (await s.unsafe(q, p as never[])) as never,
    tx: (fn) => s.begin((t) => fn(wrap(t as unknown as typeof sql))) as never,
  });
  return wrap(sql);
}

export async function createPglite(dataDir?: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = dataDir ? new PGlite(dataDir) : new PGlite();
  await pg.exec(schemaSql());
  type Q = { query: (q: string, p?: unknown[]) => Promise<{ rows: unknown[] }> };
  const wrap = (c: Q, inTx: boolean): Db => ({
    query: async (q, p = []) => (await c.query(q, p)).rows as never,
    tx: (fn) => (inTx ? fn(wrap(c, true)) : pg.transaction((t) => fn(wrap(t as unknown as Q, true)))),
  });
  return wrap(pg as unknown as Q, false);
}

const g = globalThis as unknown as { __qsDb?: Promise<Db> };

/** DATABASE_URL이 있으면 Supabase Postgres, 없으면 로컬 PGlite(데모 데이터 자동 생성)를 씁니다. */
export function getDb(): Promise<Db> {
  if (!g.__qsDb) {
    g.__qsDb = (async () => {
      const url = process.env.DATABASE_URL;
      if (url) {
        const db = await createPostgres(url);
        // 데모 배포에서는 비어 있는 DB에 가상 주문을 한 번 넣습니다.
        if (process.env.SEED_DEMO === "true") await seedIfEmpty(db);
        return db;
      }
      const dir = process.env.VERCEL ? undefined : path.join(process.cwd(), ".data", "pglite");
      if (dir) mkdirSync(path.dirname(dir), { recursive: true });
      const db = await createPglite(dir);
      await seedIfEmpty(db);
      return db;
    })();
    g.__qsDb.catch(() => (g.__qsDb = undefined));
  }
  return g.__qsDb;
}
