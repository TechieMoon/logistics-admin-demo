const { chromium } = require('playwright');
const B = process.env.BASE_URL || 'http://localhost:3100', OUT = require('path').join(__dirname, '../../docs/screenshots/');
const assert = (c, m) => { if (!c) throw new Error('ASSERT: ' + m); console.log('ok -', m); };
(async () => {
  for (let i = 0; i < 30; i++) { try { await fetch(B); break; } catch { await new Promise(r => setTimeout(r, 1000)); } }
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  // 로그인 없이 접근 → 로그인으로
  await p.goto(B + '/admin');
  assert(p.url().endsWith('/admin/login'), '미로그인 시 로그인 화면으로 이동');
  await p.fill('#name', '문선웅'); await p.fill('#password', 'wrong'); await p.click('button:has-text("로그인")');
  await p.waitForSelector('text=비밀번호가 맞지 않습니다');
  assert(true, '틀린 비밀번호 거부');
  await p.fill('#password', 'demo1234'); await p.click('button:has-text("로그인")');
  await p.waitForSelector('h1:has-text("주문 목록")');
  const rows = await p.locator('tbody tr').count();
  assert(rows === 36, '데모 주문 36건 표시: ' + rows);
  await p.screenshot({ path: OUT + '01-list.png' });
  // 필터
  await p.click('.counts a:has-text("통관 중")');
  await p.waitForURL(/status=customs/, { waitUntil: 'commit' }); await p.waitForTimeout(800);
  const c = await p.locator('tbody tr').count();
  assert(c === 6, '통관 중 필터 6건: ' + c);
  // 상세 → 다음 단계
  await p.goto(B + '/admin?q=QS2611-0008');
  await p.click('a:has-text("QS2611-0008")');
  await p.waitForSelector('h1:has-text("QS2611-0008")');
  // 두 번째 탭에서 먼저 변경 → 충돌
  const p2 = await ctx.newPage(); await p2.goto(p.url());
  await p.click('button:has-text("다음 단계로")');
  await p.waitForSelector('.notice.ok');
  assert((await p.textContent('.notice.ok')).includes('국내 배송'), '상태 변경 성공');
  await p.reload();
  await p.screenshot({ path: OUT + '02-detail.png', fullPage: true });
  await p2.click('button:has-text("다음 단계로")');
  await p2.waitForSelector('.notice.bad');
  assert((await p2.textContent('.notice.bad')).includes('다른 직원'), '오래된 화면에서 누르면 충돌 안내');
  await p2.screenshot({ path: OUT + '03-conflict.png' });
  await p2.close();
  // 엑셀 가져오기
  await p.goto(B + '/admin/import');
  await p.setInputFiles('input[type=file]', require('path').join(__dirname, '../../public/sample-orders.csv'));
  await p.click('button:has-text("검사하기")');
  await p.waitForSelector('text=검사 결과');
  const errRows = await p.locator('tr.err').count();
  assert(errRows === 5, '문제 행 5개 표시: ' + errRows);
  await p.screenshot({ path: OUT + '04-import-preview.png', fullPage: true });
  await p.click('button:has-text("문제없는")');
  await p.waitForSelector('.notice.ok');
  const msg = await p.textContent('.notice.ok');
  assert(msg.includes('3건 저장') && msg.includes('5건은'), '3건 저장·5건 건너뜀: ' + msg);
  // 알림 기록
  await p.goto(B + '/admin/notifications');
  assert((await p.locator('tbody tr').count()) === 1, '알림 기록 1건');
  await p.screenshot({ path: OUT + '05-notifications.png' });
  // 고객 조회
  const c2 = await b.newContext({ viewport: { width: 420, height: 860 }, deviceScaleFactor: 2 });
  const q = await c2.newPage();
  await q.goto(B + '/track');
  await q.fill('#order_no', 'QS2611-0008'); await q.fill('#last4', '0000'); await q.click('button:has-text("배송 조회")');
  await q.waitForSelector('text=일치하는 주문이 없습니다');
  assert(true, '틀린 뒷자리는 조회 안 됨');
  await q.fill('#last4', '3352'); await q.click('button:has-text("배송 조회")');
  await q.waitForSelector('h2:has-text("국내 배송")');
  const body = await q.textContent('body');
  assert(!body.includes('01020063352') && !body.includes('문선웅') && body.includes('*'), '고객 화면에 연락처·직원 이름 없음, 이름 가림');
  await q.screenshot({ path: OUT + '06-track-mobile.png', fullPage: true });
  // 고객 조회 횟수 제한
  let limited = false;
  for (let i = 0; i < 10; i++) { await q.click('button:has-text("배송 조회")'); await q.waitForTimeout(300); if (await q.locator('text=너무 많이').count()) { limited = true; break; } }
  assert(limited, '반복 조회 제한');
  // 로그아웃 후 서버 액션 직접 호출 차단 확인은 단위 수준에서: 쿠키 없이 /admin/import 접근
  const c3 = await b.newContext(); const r = await c3.newPage(); await r.goto(B + '/admin/import');
  assert(r.url().endsWith('/admin/login'), '쿠키 없이 엑셀 화면 접근 차단');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
