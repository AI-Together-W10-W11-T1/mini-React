import type { Page } from '@playwright/test';
import { test, expect, URL, captureAlert, edit, editorValue, observeMutations, structureOf } from './phase1-helpers';

// [AI Note]: Patch 때 검사(QA-16 ~ QA-21 · QA-29 · QA-30 · QA-32)와 페이지 보호 · 오류 복구(QA-31 · QA-A12).
// alert는 captureAlert로 선언한 것만 허용한다 (선언 없는 alert는 헬퍼가 실패시킨다, A5).

async function open(page: Page): Promise<void> {
  await page.goto(URL);
  await expect(page.getByTestId('real-area').locator('section#card')).toBeVisible();
}

async function typeInEditor(page: Page, html: string): Promise<void> {
  await page.getByTestId('html-editor').fill(html);
}

/**
 * Patch를 눌러 alert가 정확히 한 번 뜨는지 확인하고, 실제 영역 · 기록이 그대로임을 확인한다.
 * 돌려주는 값은 alert 글이다.
 */
async function patchBlocked(page: Page): Promise<string> {
  const watcher = await observeMutations(page);
  const before = await structureOf(page, 'real-area');
  const typed = await editorValue(page);

  const message = await captureAlert(page, () => page.getByTestId('btn-patch').click());

  expect(await watcher.takeSummary(), 'Patch가 막혔으므로 실제 영역 DOM 변경이 없어야 한다').toMatchObject({ total: 0 });
  expect(await structureOf(page, 'real-area')).toEqual(before);
  // 기록이 늘지 않았다: 뒤로를 눌러도 아무 일 없다
  await page.getByTestId('btn-back').click();
  expect(await structureOf(page, 'real-area')).toEqual(before);
  expect(await watcher.takeSummary()).toMatchObject({ total: 0 });
  // 편집창 글은 친 그대로다
  expect(await editorValue(page)).toBe(typed);
  return message;
}

test('QA-16 위험한 코드(on… 속성 · script · javascript:)를 넣고 Patch하면 [위험한 코드] alert로 막힌다', async ({ page }) => {
  await open(page);
  const cases: Array<[string, string, string]> = [
    ['(a) onerror', '<img src="data:," onerror="window.__pwned=1">', 'onerror'],
    ['(b) script', '<script>window.__pwned=1</script>', 'script'],
    ['(c) javascript:', '<a href="javascript:window.__pwned=1">링크</a>', 'javascript:'],
  ];
  const initial = await editorValue(page);
  for (const [label, html, word] of cases) {
    // 샘플 뒤에 위험한 글을 덧붙인다 (경우마다 샘플 글에서 다시 시작)
    await typeInEditor(page, initial + html);
    const message = await patchBlocked(page);
    expect(message, label).toContain('[위험한 코드]');
    expect(message, label).toContain(word);
    expect(message, label).toContain('다시 작성해 주세요');
  }
  expect(await page.evaluate(() => (window as unknown as { __pwned?: unknown }).__pwned)).toBeUndefined();
});

test('QA-17 </ul>을 지우고 Patch하면 [태그 짝] alert로 막힌다', async ({ page }) => {
  await open(page);
  await edit(page, (t) => t.replace('</ul>', ''));
  const message = await patchBlocked(page);
  expect(message).toContain('[태그 짝]');
  expect(message).toContain('다시 작성해 주세요');
});

test('QA-18 짝은 맞지만 브라우저가 고쳐 읽는 <p><div>x</div></p>를 Patch하면 [구조 불일치] alert로 막힌다', async ({ page }) => {
  await open(page);
  await typeInEditor(page, '<p><div>x</div></p>');
  const message = await patchBlocked(page);
  expect(message).toContain('[구조 불일치]');
  expect(message).not.toContain('[태그 짝]');
  expect(message).toContain('다시 작성해 주세요');
});

test('QA-19 <svg>를 넣고 Patch하면 [SVG 미지원] alert로 막힌다', async ({ page }) => {
  await open(page);
  await typeInEditor(page, '<svg><circle r="3"></circle></svg>');
  const message = await patchBlocked(page);
  expect(message).toContain('[SVG 미지원]');
  expect(message).toContain('다시 작성해 주세요');
});

test('QA-20 구조도 틀리고 닫는 태그도 빠진 글은 alert 한 번에 [태그 짝]과 [구조 불일치]가 함께 담긴다', async ({ page }) => {
  await open(page);
  await typeInEditor(page, '<p><div>x</div></p><span>');
  const message = await patchBlocked(page); // captureAlert가 alert가 정확히 한 번임을 확인한다
  expect(message).toContain('[태그 짝]');
  expect(message).toContain('[구조 불일치]');
});

test('QA-21 편집창에 위험한 코드를 쳐도(Patch 안 함) 코드가 실행되지 않고 미리보기에서는 빠진다', async ({ page }) => {
  await open(page);
  await typeInEditor(
    page,
    '<img src="data:," onerror="window.__pwned=1"><script>window.__pwned=1</script><a href="javascript:window.__pwned=1">링크</a>',
  );
  const testArea = page.getByTestId('test-area');
  await expect(testArea.locator('a')).toHaveText('링크');
  // 입력 중에는 alert가 안 뜬다 (선언 없는 alert는 헬퍼가 실패시킨다). 코드는 실행되지 않는다
  expect(await page.evaluate(() => (window as unknown as { __pwned?: unknown }).__pwned)).toBeUndefined();
  await expect(testArea.locator('img')).toHaveCount(1);
  expect(await testArea.locator('img').evaluate((e) => e.hasAttribute('onerror'))).toBe(false);
  await expect(testArea.locator('script')).toHaveCount(0);
  expect(await testArea.locator('a').evaluate((e) => e.hasAttribute('href'))).toBe(false);
  // 잠시 기다려도 (onerror가 늦게 돌 수 있으므로) 그대로다
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => (window as unknown as { __pwned?: unknown }).__pwned)).toBeUndefined();
});

test('QA-29 <iframe srcdoc> · <object> · <embed>는 미리보기에서 빠지고 Patch는 [위험한 코드]로 막힌다', async ({ page }) => {
  await open(page);
  const cases: Array<[string, string, string]> = [
    ['iframe srcdoc', '<iframe srcdoc="<script>parent.__pwned=1</script>"></iframe>', 'iframe'],
    ['object', '<object data="x.html"></object>', 'object'],
    ['embed', '<embed src="x.html">', 'embed'],
  ];
  const testArea = page.getByTestId('test-area');
  for (const [label, html, name] of cases) {
    // (a) 칠 때: alert 없음, 실행 없음, 미리보기에 요소 없음
    await typeInEditor(page, html);
    await expect(testArea.locator('iframe, object, embed'), label).toHaveCount(0);
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => (window as unknown as { __pwned?: unknown }).__pwned), label).toBeUndefined();
    // (b)(c) Patch: [위험한 코드] + 요소 이름, 실제 영역 · 기록 그대로
    const message = await patchBlocked(page);
    expect(message, label).toContain('[위험한 코드]');
    expect(message, label).toContain(`<${name}>`);
  }
});

test('QA-30 javascript:를 문자 참조 · 앞 공백 · 대문자 · 탭으로 숨겨도 미리보기에서 빠지고 Patch는 막힌다', async ({ page }) => {
  await open(page);
  const cases: Array<[string, string]> = [
    ['문자 참조', '<a href="jav&#x61;script:window.__pwned=1">링크</a>'],
    ['앞 공백 + 대문자 + 값 안 탭', '<a href=" JAVA\tscript:window.__pwned=1">링크</a>'],
  ];
  const link = page.getByTestId('test-area').locator('a');
  for (const [label, html] of cases) {
    await typeInEditor(page, html);
    await expect(link, label).toHaveText('링크');
    // 파싱한 뒤의 값으로 검사하므로 href가 빠진다. alert 없음 · 실행 없음
    expect(await link.evaluate((e) => e.hasAttribute('href')), label).toBe(false);
    expect(await page.evaluate(() => (window as unknown as { __pwned?: unknown }).__pwned), label).toBeUndefined();
    const message = await patchBlocked(page);
    expect(message, label).toContain('[위험한 코드]');
    expect(message, label).toContain('javascript:');
  }
});

test('QA-32 <style> · <link rel="stylesheet">는 미리보기에서 빠져 모양이 안 바뀌고 Patch는 [위험한 코드]로 막힌다', async ({ page }) => {
  await open(page);
  const requested: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('x.css')) requested.push(r.url());
  });
  const testArea = page.getByTestId('test-area');
  const colorOf = (selector: string): Promise<string> => page.evaluate((s) => getComputedStyle(document.querySelector(s)!).color, selector);
  const realColorBefore = await colorOf('[data-testid="real-area"] h2');

  const cases: Array<[string, string, string]> = [
    ['style', '<h2>글</h2><style>h2 { color: blue }</style>', '<style>'],
    ['link', '<h2>글</h2><link rel="stylesheet" href="x.css">', '<link rel="stylesheet">'],
  ];
  for (const [label, html, word] of cases) {
    await typeInEditor(page, html);
    await expect(testArea.locator('h2'), label).toHaveText('글');
    await expect(testArea.locator('style, link'), label).toHaveCount(0);
    // 페이지 모양이 바뀌지 않는다: 두 영역 글자 색이 파랑이 아니고 실제 영역도 그대로
    expect(await colorOf('[data-testid="test-area"] h2'), label).not.toBe('rgb(0, 0, 255)');
    expect(await colorOf('[data-testid="real-area"] h2'), label).toBe(realColorBefore);
    const message = await patchBlocked(page);
    expect(message, label).toContain('[위험한 코드]');
    expect(message, label).toContain(word);
  }
  expect(requested, '스타일 시트를 요청하지 않았다').toEqual([]);
});

test('QA-31 두 영역 안의 링크(<a> · <area> · SVG <a>) 클릭 · 폼 버튼 클릭에도 페이지가 이동하거나 새로고침되지 않는다', async ({ page }) => {
  await open(page);
  const initialReal = await structureOf(page, 'real-area');
  // 검수 1회차 B-2: <a href> · 폼 버튼 말고도 이미지 맵의 <area href> 두 영역을 함께 넣는다
  const imageMap =
    '<img src="data:," width="100" height="100" usemap="#m"><map name="m">' +
    '<area shape="rect" coords="0,0,50,100" href="https://example.com/left">' +
    '<area shape="rect" coords="50,0,100,100" href="https://example.com/right"></map>';
  const typed = await edit(page, (t) => t + '<a href="https://example.com">링크</a>' + imageMap + '<form><button>보내기</button></form>');
  await page.getByTestId('btn-patch').click(); // 두 영역에 모두 있고 기록이 한 칸 있다 (alert가 뜨면 헬퍼가 실패시킨다)
  const real = page.getByTestId('real-area');
  const testArea = page.getByTestId('test-area');
  await expect(real.locator('a[href]')).toHaveCount(1);
  await expect(real.locator('form button')).toHaveCount(1);
  await expect(real.locator('area[href]')).toHaveCount(2);
  await expect(testArea.locator('a[href]')).toHaveCount(1);
  await expect(testArea.locator('form button')).toHaveCount(1);
  await expect(testArea.locator('area[href]')).toHaveCount(2);

  // 페이지가 살아 있다는 표시와 문서 이동 요청 감시
  const urlBefore = page.url();
  await page.evaluate(() => ((window as unknown as { __stay?: boolean }).__stay = true));
  let navigations = 0;
  page.on('framenavigated', () => navigations++);
  const documentRequests: string[] = [];
  page.on('request', (r) => {
    if (r.isNavigationRequest()) documentRequests.push(r.url());
  });
  const structBefore = await structureOf(page, 'real-area');

  await testArea.locator('a').click();
  await testArea.locator('form button').click();
  await real.locator('a').click();
  await real.locator('form button').click();
  // 이미지 맵: 클릭 대상은 <area>다. 이미지 위 두 영역 자리를 눌러 <area> 두 개를 모두 누른다 (양쪽 영역)
  for (const box of [testArea, real]) {
    await box.locator('img[usemap]').click({ position: { x: 25, y: 50 } });
    await box.locator('img[usemap]').click({ position: { x: 75, y: 50 } });
  }
  await page.waitForTimeout(300); // 이동이 일어난다면 이 사이에 일어난다

  expect(page.url()).toBe(urlBefore);
  expect(await page.evaluate(() => (window as unknown as { __stay?: boolean }).__stay)).toBe(true);
  expect(navigations, '프레임 이동(framenavigated)이 없어야 한다').toBe(0);
  expect(documentRequests, '문서 이동 요청이 없어야 한다').toEqual([]);
  // 클릭 뒤에도 Patch한 상태가 그대로다 (새로고침됐다면 초기 샘플로 돌아갔을 것). 편집창 글도 그대로
  expect(await structureOf(page, 'real-area')).toEqual(structBefore);
  expect(await editorValue(page)).toBe(typed);

  // 검수 1회차 B-2: SVG <a xlink:href>는 Patch는 못 하지만(SVG 미지원) 미리보기(테스트 영역)에는 그려진다. 클릭해도 이동하지 않는다
  await edit(page, (t) => t + '<svg width="200" height="40"><a xlink:href="https://example.com/svg"><text x="5" y="25">svg 링크</text></a></svg>');
  await expect(testArea.locator('svg a')).toHaveCount(1);
  await testArea.locator('svg a text').click();
  await page.waitForTimeout(300);
  expect(page.url()).toBe(urlBefore);
  expect(await page.evaluate(() => (window as unknown as { __stay?: boolean }).__stay)).toBe(true);
  expect(navigations, 'SVG 링크 클릭에도 프레임 이동이 없어야 한다').toBe(0);
  expect(documentRequests, 'SVG 링크 클릭에도 문서 이동 요청이 없어야 한다').toEqual([]);
  // 기록이 살아 있다: 뒤로를 누르면 Patch 전(초기 샘플) 상태로 돌아가고 세 칸이 일치한다
  await page.getByTestId('btn-back').click();
  expect(await structureOf(page, 'real-area')).toEqual(initialReal);
  expect(await structureOf(page, 'test-area')).toEqual(initialReal);
  await expect(real.locator('a[href]')).toHaveCount(0);
  await expect(testArea.locator('a[href]')).toHaveCount(0);
});

test('QA-A12 Patch 도중 예외가 나면 [Patch 오류] alert 뒤 실제 영역이 마지막 기록 상태로 복구되고 다시 Patch하면 성공한다', async ({ page }) => {
  await open(page);
  const initialReal = await structureOf(page, 'real-area');
  // 실제 영역의 <ul>을 바깥에서 뗀다 (경로가 사라진다)
  await page.evaluate(() => document.querySelector('[data-testid="real-area"] ul')!.remove());
  const typed = await edit(page, (t) => t.replace('<li>하나</li>', '<li>하나!</li>').replace('안녕', '바뀜'));

  const message = await captureAlert(page, () => page.getByTestId('btn-patch').click());
  expect(message).toContain('[Patch 오류]');
  expect(message).toContain('되돌렸습니다');

  // 적용되다 만 <p> 글자 변경도 되돌려지고 <ul>도 돌아와 마지막 기록(초기 샘플) 상태가 된다
  const real = page.getByTestId('real-area');
  await expect(real.locator('ul')).toHaveCount(1);
  await expect(real.locator('p.note')).toHaveText('안녕');
  expect(await structureOf(page, 'real-area')).toEqual(initialReal);
  // 편집창 글 · 테스트 영역(미리보기)은 친 그대로다
  expect(await editorValue(page)).toBe(typed);
  const previewStruct = await structureOf(page, 'test-area');
  expect(previewStruct).not.toEqual(initialReal);
  await expect(page.getByTestId('test-area').locator('p.note')).toHaveText('바뀜');
  // 기록 그대로: 새 기록이 안 생겼으므로 뒤로는 무시된다 (실제 영역 · 편집창 변화 없음)
  const watcher = await observeMutations(page);
  await page.getByTestId('btn-back').click();
  expect((await watcher.takeSummary()).total).toBe(0);
  expect(await structureOf(page, 'real-area')).toEqual(initialReal);
  expect(await editorValue(page)).toBe(typed);

  // 다시 Patch하면 정상 반영된다 (기록이 오류 때 앞으로 가지 않았다는 증거: 기준이 여전히 초기 샘플이라 diff가 비지 않는다)
  await page.getByTestId('btn-patch').click();
  await expect(real.locator('p.note')).toHaveText('바뀜');
  await expect(real.locator('li').first()).toHaveText('하나!');
  expect(await structureOf(page, 'real-area')).toEqual(await structureOf(page, 'test-area'));
  // 기록이 정확히 한 칸 늘었다: 뒤로 한 번 → 초기 샘플, 한 번 더 뒤로는 무시
  await page.getByTestId('btn-back').click();
  expect(await structureOf(page, 'real-area')).toEqual(initialReal);
  expect(await structureOf(page, 'test-area')).toEqual(initialReal);
  await watcher.takeSummary();
  await page.getByTestId('btn-back').click();
  expect((await watcher.takeSummary()).total).toBe(0);
  expect(await structureOf(page, 'real-area')).toEqual(initialReal);
});
