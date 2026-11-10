import type { Page } from '@playwright/test';
import {
  test,
  expect,
  URL,
  captureAlert,
  edit,
  editorValue,
  expectNoConsoleWarnings,
  expectThreeSame,
  holdNodes,
  observeMutations,
  sameNode,
  structureOf,
} from './phase1-helpers';

// [AI Note]: 공격적 시나리오 (QA-A1 ~ QA-A3 · QA-A5 ~ QA-A11). 특수문자 · 연타 · 빈 입력 · 들여쓰기 · 주석 · 복수 루트 · boolean · style ·
// 검사 알림 뒤 복구 · 경계에서 미저장 편집. QA-A4(새로고침)는 phase1-render.spec.ts, QA-A12(Patch 도중 예외)는 phase1-guard.spec.ts에 있다.
// alert는 captureAlert로 선언한 것만 허용되고 콘솔 error가 한 건이라도 있으면 실패한다 (공통 장치).

async function open(page: Page): Promise<void> {
  await page.goto(URL);
  await expect(page.getByTestId('real-area').locator('section#card')).toBeVisible();
}

const patchButton = (page: Page) => page.getByTestId('btn-patch');
const backButton = (page: Page) => page.getByTestId('btn-back');
const forwardButton = (page: Page) => page.getByTestId('btn-forward');
const real = (page: Page) => page.getByTestId('real-area');
const testArea = (page: Page) => page.getByTestId('test-area');

async function patchWith(page: Page, fn: (current: string) => string): Promise<string> {
  const typed = await edit(page, fn);
  await patchButton(page).click();
  return typed;
}

/** 영역 안 주석 노드의 글 (번호 순서) */
async function commentsIn(page: Page, area: string): Promise<string[]> {
  return page.evaluate((id) => {
    const out: string[] = [];
    const walk = (n: Node): void => {
      if (n.nodeType === Node.COMMENT_NODE) out.push(n.nodeValue ?? '');
      n.childNodes.forEach(walk);
    };
    walk(document.querySelector(`[data-testid="${id}"]`)!);
    return out;
  }, area);
}

test('QA-A1 특수문자(&lt; &amp; 이모지)를 Patch하면 글자 그대로 실제 영역에 들어가고 뒤로 → 앞으로 해도 같다', async ({ page }) => {
  await open(page);
  const initial = await structureOf(page, 'real-area');
  await page.getByTestId('html-editor').fill('<p>&lt;b&gt;굵게 아님&lt;/b&gt; &amp;amp; 😀</p>');
  await patchButton(page).click();

  await expect(real(page).locator('p')).toHaveText('<b>굵게 아님</b> &amp; 😀');
  await expect(real(page).locator('b')).toHaveCount(0);
  await expectThreeSame(page);
  const patched = await structureOf(page, 'real-area');

  await backButton(page).click();
  expect(await structureOf(page, 'real-area')).toEqual(initial);
  await expectThreeSame(page);

  await forwardButton(page).click();
  expect(await structureOf(page, 'real-area')).toEqual(patched);
  await expect(real(page).locator('p')).toHaveText('<b>굵게 아님</b> &amp; 😀');
  await expect(real(page).locator('b')).toHaveCount(0);
  await expect(testArea(page).locator('b')).toHaveCount(0);
  // 편집창 글도 같은 글자를 나타낸다 (이스케이프 왕복이 어긋나지 않는다)
  expect(await editorValue(page)).toContain('&lt;b&gt;');
  expect(await editorValue(page)).not.toContain('<b>');
  await expectThreeSame(page);
  expectNoConsoleWarnings(page);
});

test('QA-A2 Patch 5회 · 뒤로 10회 · 앞으로 10회를 연타해도 오류 없이 뒤로를 누른 만큼만 이동하고 경계에서 멈춘다', async ({ page }) => {
  await open(page);
  const initial = await structureOf(page, 'real-area');
  await patchWith(page, (t) => t.replace('안녕', '하나'));
  const s1 = await structureOf(page, 'real-area');
  await patchWith(page, (t) => t.replace('<li>셋</li>', '<li>셋</li><li>넷</li>'));
  const s2 = await structureOf(page, 'real-area');

  // Patch 5회 연타: 첫 번째만 변경, 나머지 네 번은 무변경 (같은 편집창 글)
  await edit(page, (t) => t.replace('제목', '새제목'));
  const watcher = await observeMutations(page);
  await page.evaluate(() => {
    const button = document.querySelector<HTMLButtonElement>('[data-testid="btn-patch"]')!;
    for (let i = 0; i < 5; i++) button.click(); // 한 번에 연달아 (사이에 쉬지 않음)
  });
  const burst = await watcher.takeSummary();
  expect(burst, '첫 번째 Patch만 글자 하나를 바꾸고 나머지 4회는 무변경').toMatchObject({ characterData: 1, childList: 0, attributes: 0, total: 1 });
  const s3 = await structureOf(page, 'real-area');
  expect(s3).not.toEqual(s2);
  await expectThreeSame(page);

  // 뒤로 연타 10회 (한 번에): 기록은 0 · 1 · 2 · 3번뿐이므로 끝(0번)에서 멈춘다
  await page.evaluate(() => {
    const button = document.querySelector<HTMLButtonElement>('[data-testid="btn-back"]')!;
    for (let i = 0; i < 10; i++) button.click();
  });
  expect(await structureOf(page, 'real-area')).toEqual(initial);
  await expectThreeSame(page);
  // 앞으로 연타 10회: 끝(3번)에서 멈춘다
  await page.evaluate(() => {
    const button = document.querySelector<HTMLButtonElement>('[data-testid="btn-forward"]')!;
    for (let i = 0; i < 10; i++) button.click();
  });
  expect(await structureOf(page, 'real-area')).toEqual(s3);
  await expectThreeSame(page);

  // 누른 만큼만 이동한다: 뒤로 2번 → S1(기록 3 → 1), 앞으로 1번 → S2
  await backButton(page).click();
  await backButton(page).click();
  expect(await structureOf(page, 'real-area')).toEqual(s1);
  await expectThreeSame(page);
  await forwardButton(page).click();
  expect(await structureOf(page, 'real-area')).toEqual(s2);
  await expectThreeSame(page);
  expectNoConsoleWarnings(page);
});

test('QA-A3 편집창을 비우고 Patch하면 영역이 비고 오류가 없으며, 뒤로 하면 이전 샘플 상태로 돌아오고 편집창에 글이 다시 채워진다', async ({ page }) => {
  await open(page);
  const initial = await structureOf(page, 'real-area');
  const initialEditor = await editorValue(page);

  await page.getByTestId('html-editor').fill('');
  await patchButton(page).click(); // alert가 뜨면 공통 장치가 실패시킨다 (빈 입력은 허용)
  expect(await real(page).evaluate((el) => el.childNodes.length), '실제 영역이 빈 상태').toBe(0);
  expect(await testArea(page).evaluate((el) => el.childNodes.length), '테스트 영역도 빈 상태').toBe(0);
  expect(await editorValue(page)).toBe('');

  await backButton(page).click();
  expect(await structureOf(page, 'real-area')).toEqual(initial);
  expect(await editorValue(page), '편집창에 글이 다시 채워진다').toBe(initialEditor);
  await expectThreeSame(page);

  // 앞으로 하면 다시 빈 상태
  await forwardButton(page).click();
  expect(await real(page).evaluate((el) => el.childNodes.length)).toBe(0);
  expect(await editorValue(page)).toBe('');
});

test('QA-A5 들여쓰기만 바꾸고 Patch하면 공백 글자가 실제 영역에 반영되고 요소는 같은 참조다', async ({ page }) => {
  await open(page);
  await holdNodes(page, {
    ul: 'ul',
    li1: 'li:nth-of-type(1)',
    li2: 'li:nth-of-type(2)',
    ws: { sel: 'ul', child: 2 }, // <li>하나</li>와 <li>둘</li> 사이 공백 글자
  });
  const watcher = await observeMutations(page);

  await patchWith(page, (t) => t.replace('</li>\n    <li>둘', '</li>\n          <li>둘'));
  const text = await real(page).evaluate((el) => el.querySelector('ul')!.childNodes[2].nodeValue);
  expect(text, '공백 글자가 그대로 반영된다').toBe('\n          ');
  expect(await sameNode(page, 'ws', { sel: 'ul', child: 2 }), '공백 글자 노드는 같은 참조(글자만 바뀜)').toBe(true);
  expect(await sameNode(page, 'ul', 'ul')).toBe(true);
  expect(await sameNode(page, 'li1', 'li:nth-of-type(1)')).toBe(true);
  expect(await sameNode(page, 'li2', 'li:nth-of-type(2)')).toBe(true);
  expect(await watcher.takeSummary()).toMatchObject({ characterData: 1, childList: 0, attributes: 0, total: 1 });
  await expectThreeSame(page);
});

test('QA-A6 주석 글을 고치고 지우고 새로 넣어도 실제 영역의 주석이 편집창과 같다', async ({ page }) => {
  await open(page);
  expect(await commentsIn(page, 'real-area')).toEqual([' 안내 문구 ']);

  await patchWith(page, (t) => t.replace('<!-- 안내 문구 -->', '<!-- 수정한 안내 -->'));
  expect(await commentsIn(page, 'real-area')).toEqual([' 수정한 안내 ']);
  await expectThreeSame(page);

  await patchWith(page, (t) => t.replace('<!-- 수정한 안내 -->', ''));
  expect(await commentsIn(page, 'real-area')).toEqual([]);
  await expectThreeSame(page);

  await patchWith(page, (t) => t.replace('<ul>', '<!-- 새 주석 --><ul>'));
  expect(await commentsIn(page, 'real-area')).toEqual([' 새 주석 ']);
  await expect(real(page).locator('li')).toHaveCount(3);
  await expectThreeSame(page);
  // 주석은 화면에 글자로 보이지 않는다
  await expect(real(page)).not.toContainText('새 주석');
});

test('QA-A7 최상위가 두 개인 상태(<p>a</p><p>b</p>)도 반영되고 뒤로 하면 <section> 하나로 돌아온다', async ({ page }) => {
  await open(page);
  const initial = await structureOf(page, 'real-area');

  await page.getByTestId('html-editor').fill('<p>a</p><p>b</p>');
  await patchButton(page).click();
  expect(await real(page).evaluate((el) => el.childNodes.length), '최상위 두 개').toBe(2);
  await expect(real(page).locator(':scope > p')).toHaveText(['a', 'b']);
  await expect(real(page).locator('section')).toHaveCount(0);
  await expectThreeSame(page);

  await backButton(page).click();
  expect(await structureOf(page, 'real-area')).toEqual(initial);
  await expect(real(page).locator('section#card')).toHaveCount(1);
  await expectThreeSame(page);

  await forwardButton(page).click();
  await expect(real(page).locator(':scope > p')).toHaveText(['a', 'b']);
  await expectThreeSame(page);
});

test('QA-A8 boolean 속성: disabled를 지우면 사라지고 다시 넣으면 ""로 생기며 <button>은 같은 참조다', async ({ page }) => {
  await open(page);
  await holdNodes(page, { button: 'button' });
  const watcher = await observeMutations(page);
  await expect(real(page).locator('button')).toHaveAttribute('disabled', '');

  await patchWith(page, (t) => t.replace('<button disabled="">', '<button>'));
  await expect(real(page).locator('button')).not.toHaveAttribute('disabled');
  expect(await sameNode(page, 'button', 'button'), '교체하지 않았다').toBe(true);
  expect(await watcher.takeSummary()).toMatchObject({ attributes: 1, childList: 0, characterData: 0, total: 1 });
  await expectThreeSame(page);

  await patchWith(page, (t) => t.replace('<button>', '<button disabled>'));
  await expect(real(page).locator('button')).toHaveAttribute('disabled', '');
  expect(await sameNode(page, 'button', 'button'), '다시 넣어도 같은 참조').toBe(true);
  expect(await watcher.takeSummary()).toMatchObject({ attributes: 1, childList: 0, characterData: 0, total: 1 });
  await expectThreeSame(page);
});

test('QA-A9 style 항목: 바뀐 항목만 바뀌고 <p>는 같은 참조이며 마지막 항목을 지우면 style이 없어진다 (모르는 항목도 속성 글 기준으로 같다)', async ({ page }) => {
  await open(page);
  await holdNodes(page, { p: 'p.note' });
  const p = real(page).locator('p.note');
  const styleAttr = (): Promise<string | null> => p.evaluate((el) => el.getAttribute('style'));

  // font-size만 바꾼다 (color는 그대로)
  await patchWith(page, (t) => t.replace('font-size: 16px', 'font-size: 20px'));
  expect(await p.evaluate((el) => (el as HTMLElement).style.color)).toBe('red');
  expect(await p.evaluate((el) => (el as HTMLElement).style.fontSize)).toBe('20px');
  expect(await sameNode(page, 'p', 'p.note')).toBe(true);
  await expectThreeSame(page);

  // color 항목 삭제 → font-size만 남는다
  await patchWith(page, (t) => t.replace('color: red; ', ''));
  expect(await p.evaluate((el) => (el as HTMLElement).style.color)).toBe('');
  expect(await p.evaluate((el) => (el as HTMLElement).style.fontSize)).toBe('20px');
  expect(await sameNode(page, 'p', 'p.note')).toBe(true);
  await expectThreeSame(page);

  // 마지막 항목까지 지우면 style 속성이 없어진다
  await patchWith(page, (t) => t.replace(' style="font-size: 20px"', ''));
  expect(await styleAttr()).toBeNull();
  expect(await sameNode(page, 'p', 'p.note')).toBe(true);
  await expectThreeSame(page);

  // 별도 판: 브라우저가 버리는 모르는 항목(foo: bar)을 추가해도 속성 글 항목 집합이 실제 영역 · 테스트 영역에서 같다 (A4)
  await open(page);
  await holdNodes(page, { p: 'p.note' });
  await patchWith(page, (t) => t.replace('font-size: 16px', 'font-size: 16px; foo: bar'));
  const attr = await real(page).locator('p.note').evaluate((el) => el.getAttribute('style'));
  expect(attr, '속성 글에는 모르는 항목이 남는다').toContain('foo: bar');
  expect(await real(page).locator('p.note').evaluate((el) => (el as HTMLElement).style.cssText), 'cssText에는 안 보인다 (브라우저가 모름)').not.toContain('foo');
  expect(await sameNode(page, 'p', 'p.note')).toBe(true);
  // structureOf는 속성 글 항목 집합까지 비교한다: 두 영역이 같고, 그 집합에 foo가 들어 있다
  const realStruct = await structureOf(page, 'real-area');
  expect(realStruct).toEqual(await structureOf(page, 'test-area'));
  expect(JSON.stringify(realStruct)).toContain('["foo","bar"]');
  await expectThreeSame(page);
});

test('QA-A10 검사 알림으로 막힌 뒤 글을 고치고 다시 Patch하면 정상 반영되고 기록이 한 칸만 늘어난다', async ({ page }) => {
  await open(page);
  const initial = await structureOf(page, 'real-area');
  const initialEditor = await editorValue(page);

  // 짝이 틀린 글 → 막힘 (실제 영역 · 기록 그대로)
  await edit(page, (t) => t.replace('</ul>', ''));
  const watcher = await observeMutations(page);
  const message = await captureAlert(page, () => patchButton(page).click());
  expect(message).toContain('[태그 짝]');
  expect(await watcher.takeSummary()).toMatchObject({ total: 0 });
  expect(await structureOf(page, 'real-area')).toEqual(initial);

  // 고친 뒤(짝을 맞추고 글자도 바꿈) 다시 Patch → 정상 반영
  await page.getByTestId('html-editor').fill(initialEditor.replace('안녕', '고친 뒤'));
  await patchButton(page).click();
  await expect(real(page).locator('p.note')).toHaveText('고친 뒤');
  await expectThreeSame(page);

  // 기록은 정확히 한 칸: 뒤로 한 번 → 초기, 한 번 더 뒤로는 무시
  await backButton(page).click();
  expect(await structureOf(page, 'real-area')).toEqual(initial);
  await watcher.takeSummary();
  await backButton(page).click();
  expect((await watcher.takeSummary()).total).toBe(0);
  expect(await structureOf(page, 'real-area')).toEqual(initial);
});

test('QA-A11 처음 상태에서 편집창에 글을 치고 뒤로를 누르면 이동이 없어 친 글 · 미리보기가 그대로 남는다', async ({ page }) => {
  await open(page);
  const typed = await edit(page, (t) => t.replace('안녕', '쳐 둔 글'));
  await expect(testArea(page).locator('p.note')).toHaveText('쳐 둔 글');
  const watcher = await observeMutations(page);

  await backButton(page).click();
  expect(await editorValue(page)).toBe(typed);
  await expect(testArea(page).locator('p.note')).toHaveText('쳐 둔 글');
  await expect(real(page).locator('p.note')).toHaveText('안녕');
  expect((await watcher.takeSummary()).total).toBe(0);

  // Patch → 뒤로(처음으로 돌아옴) → 다시 처음에서 글을 치고 뒤로: 같은 결과
  await patchButton(page).click();
  await backButton(page).click();
  await expect(real(page).locator('p.note')).toHaveText('안녕');
  const typedAgain = await edit(page, (t) => t.replace('안녕', '다시 쳐 둔 글'));
  await backButton(page).click();
  expect(await editorValue(page)).toBe(typedAgain);
  await expect(testArea(page).locator('p.note')).toHaveText('다시 쳐 둔 글');
  await expect(real(page).locator('p.note')).toHaveText('안녕');
});
