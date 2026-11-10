const fmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function when(v: string | Date): string {
  return fmt.format(new Date(v));
}

export function phoneMask(p: string): string {
  return p.length >= 10 ? `${p.slice(0, 3)}-****-${p.slice(-4)}` : p;
}
