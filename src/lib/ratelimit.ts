/**
 * 아주 단순한 메모리 기반 제한. 같은 IP에서 10분에 10번까지 조회할 수 있습니다.
 * 서버가 여러 대이거나 재시작되면 초기화되므로, 실제 서비스라면 DB나 Redis에 두어야 합니다.
 */
const hits = new Map<string, number[]>();

export function allow(key: string, limit = 10, windowMs = 10 * 60 * 1000, now = Date.now()): boolean {
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= limit) {
    hits.set(key, list);
    return false;
  }
  list.push(now);
  hits.set(key, list);
  return true;
}
