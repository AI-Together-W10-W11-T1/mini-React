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
