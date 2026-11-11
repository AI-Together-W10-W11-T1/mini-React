import type { Page } from '@playwright/test';
import { test, expect, URL, edit, editorValue, expectThreeSame, holdNodes, isStillConnected, observeMutations, sameNode, structureOf } from './phase1-helpers';

// [AI Note]: 편집창 왕복 · 다양한 태그 인수 시나리오 (QA-23 ~ QA-28, B4 ~ B10, C1). 편집창 글 → 파싱 → VNode → 글이 어긋나지 않는지,
// 빈 태그 · 인라인 중첩 · 표가 Patch로 정확히 반영되는지 본다. alert가 뜨면 공통 장치가 실패시킨다 (검사기가 정상 글을 잘못 막는지도 잡는다).

async function open(page: Page): Promise<void> {
  await page.goto(URL);
  await expect(page.getByTestId('real-area').locator('section#card')).toBeVisible();
}

const patchButton = (page: Page) => page.getByTestId('btn-patch');
const backButton = (page: Page) => page.getByTestId('btn-back');
const forwardButton = (page: Page) => page.getByTestId('btn-forward');
const real = (page: Page) => page.getByTestId('real-area');

/** 편집창 글을 일부 바꿔 Patch한다 */
async function patchWith(page: Page, fn: (current: string) => string): Promise<void> {
  await edit(page, fn);
  await patchButton(page).click();
}

async function expectRealEqualsPreview(page: Page): Promise<void> {
  expect(await structureOf(page, 'real-area')).toEqual(await structureOf(page, 'test-area'));
  await expectThreeSame(page);
}

test('QA-23 글을 쳤다 지워 원래 글로 되돌리거나 스냅샷 글(뒤로 뒤 편집창)을 그대로 Patch해도 DOM 변경 0건이고 기록이 안 늘어난다', async ({ page }) => {
  await open(page);
  const watcher = await observeMutations(page);
  const initial = await editorValue(page);
  const initialStruct = await structureOf(page, 'real-area');

  // (a) 글자를 쳤다가 지워 원래 글로 되돌린 뒤 Patch (미리보기가 편집창 글로 다시 그려짐)
  await page.getByTestId('html-editor').fill(initial.replace('안녕', '안녕하세요'));
  await expect(page.getByTestId('test-area').locator('p.note')).toHaveText('안녕하세요');
  await page.getByTestId('html-editor').fill(initial);
  await expect(page.getByTestId('test-area').locator('p.note')).toHaveText('안녕');
  await patchButton(page).click();
  expect((await watcher.takeSummary()).total, '(a) 실제 영역 DOM 변경이 없어야 한다').toBe(0);
  // 기록이 안 늘어났다: 뒤로는 무시된다
  await backButton(page).click();
  expect((await watcher.takeSummary()).total).toBe(0);
  expect(await structureOf(page, 'real-area')).toEqual(initialStruct);

  // (b) Patch 한 번(글자 하나) → 뒤로 → 편집창(스냅샷을 HTML 글로 바꾼 글)을 건드리지 않고 Patch
  await patchWith(page, (t) => t.replace('안녕', '반가워'));
  const s1 = await structureOf(page, 'real-area');
  await backButton(page).click();
  expect(await editorValue(page), '뒤로 뒤 편집창 글 = 스냅샷 글 = 처음 글').toBe(initial);
  await watcher.takeSummary();
  await patchButton(page).click();
  expect((await watcher.takeSummary()).total, '(b) 편집창 글 → 파싱 → VNode 왕복이 어긋나지 않아 DOM 변경 0건').toBe(0);
  // 기록이 안 늘어났다: 무변경 Patch가 앞쪽(redo) 기록을 끊지 않아 앞으로가 아직 S1로 간다
  await forwardButton(page).click();
  expect(await structureOf(page, 'real-area')).toEqual(s1);
  await expectRealEqualsPreview(page);
});

test('QA-24 편집창에서 안녕 → 반가워 → 안녕으로 고쳐 두고 Patch하면 값이 같아 DOM 변경 0건이고 기록이 안 늘어난다', async ({ page }) => {
  await open(page);
  const watcher = await observeMutations(page);
  const initial = await editorValue(page);
  const initialStruct = await structureOf(page, 'real-area');

  await edit(page, (t) => t.replace('안녕', '반가워'));
  await expect(page.getByTestId('test-area').locator('p.note')).toHaveText('반가워');
  await edit(page, (t) => t.replace('반가워', '안녕'));
  await expect(page.getByTestId('test-area').locator('p.note')).toHaveText('안녕');
  expect(await editorValue(page)).toBe(initial);
  await patchButton(page).click();

  expect((await watcher.takeSummary()).total, '"고친 적 있음"이 아니라 값으로 비교한다').toBe(0);
  await backButton(page).click();
  expect((await watcher.takeSummary()).total, '기록이 안 늘어났다').toBe(0);
  expect(await structureOf(page, 'real-area')).toEqual(initialStruct);
});

test('QA-25 글자를 치자마자(기다림 없이) Patch해도 마지막 글자까지 실제 영역에 반영된다', async ({ page }) => {
  await open(page);
  const editor = page.getByTestId('html-editor');
  // `안녕` 바로 뒤에 커서를 두고 한 글자씩 입력한 뒤, 기다리지 않고 곧바로 Patch를 누른다
  await editor.focus();
  await editor.evaluate((el: HTMLTextAreaElement) => {
    const i = el.value.indexOf('안녕') + '안녕'.length;
    el.setSelectionRange(i, i);
  });
  await page.keyboard.type('요!!');
  await patchButton(page).click();

  await expect(real(page).locator('p.note')).toHaveText('안녕요!!');
  await expectRealEqualsPreview(page);
});

test('QA-26 빈 태그(img · br · hr · input)를 넣고 속성을 바꾸고 지워도 매번 실제 영역이 테스트 영역과 같다', async ({ page }) => {
  await open(page);

  await patchWith(page, (t) => t + '<img alt="a">');
  await expect(real(page).locator('img')).toHaveCount(1);
  await expect(real(page).locator('img')).toHaveAttribute('alt', 'a');
  await expectRealEqualsPreview(page);

  // 빈 태그의 속성 변경(alt)은 같은 <img> 참조
  await holdNodes(page, { img: 'img' });
  await patchWith(page, (t) => t.replace('alt="a"', 'alt="b"'));
  await expect(real(page).locator('img')).toHaveAttribute('alt', 'b');
  expect(await sameNode(page, 'img', 'img'), '<img>는 같은 참조').toBe(true);
  await expectRealEqualsPreview(page);

  // <br> · <hr> · <input>을 넣고 Patch
  await patchWith(page, (t) => t.replace('<img alt="b">', '<img alt="b"><br><hr><input>'));
  await expect(real(page).locator('br')).toHaveCount(1);
  await expect(real(page).locator('hr')).toHaveCount(1);
  await expect(real(page).locator('input')).toHaveCount(1);
  expect(await sameNode(page, 'img', 'img'), '<img>는 그대로 같은 참조').toBe(true);
  await expectRealEqualsPreview(page);

  // 셋을 지우고 Patch
  await patchWith(page, (t) => t.replace('<br><hr><input>', ''));
  await expect(real(page).locator('br, hr, input')).toHaveCount(0);
  await expect(real(page).locator('img')).toHaveCount(1);
  await expectRealEqualsPreview(page);
});

test('QA-27 글자 사이 요소(안<b>녕</b>하세요)에서 <b>만 <i>로 바꾸면 <i>는 새 노드이고 앞뒤 글자 노드 · <p>는 같은 참조다', async ({ page }) => {
  await open(page);
  await patchWith(page, (t) => t.replace('안녕', '안<b>녕</b>하세요'));
  await expect(real(page).locator('p.note b')).toHaveText('녕');
  await expectRealEqualsPreview(page);
  await expect(real(page).locator('p.note')).toHaveText('안녕하세요');

  await holdNodes(page, { p: 'p.note', before: { sel: 'p.note', child: 0 }, b: 'p.note b', after: { sel: 'p.note', child: 2 } });
  await patchWith(page, (t) => t.replace('<b>녕</b>', '<i>녕</i>'));

  await expect(real(page).locator('p.note i')).toHaveText('녕');
  await expect(real(page).locator('p.note b')).toHaveCount(0);
  expect(await isStillConnected(page, 'b'), '<b>는 분리된다').toBe(false);
  expect(await sameNode(page, 'p', 'p.note')).toBe(true);
  expect(await sameNode(page, 'before', { sel: 'p.note', child: 0 }), '앞 글자 노드(안) 같은 참조 · 같은 위치(자식 0번)').toBe(true);
  expect(await sameNode(page, 'after', { sel: 'p.note', child: 2 }), '뒤 글자 노드(하세요) 같은 참조 · 같은 위치(자식 2번)').toBe(true);
  expect(await sameNode(page, 'b', 'p.note i'), '<i>는 새 노드(옛 <b>와 다른 참조)').toBe(false);
  await expectRealEqualsPreview(page);
});

test('QA-28 표: tbody 있는 표를 넣고 고치고 행을 더해도 맞고, tbody 없는 표는 [구조 불일치] alert 없이 반영된다 (C1)', async ({ page }) => {
  await open(page);

  // (a) tbody가 있는 표
  await patchWith(page, (t) => t + '<table><tbody><tr><td>1</td></tr></tbody></table>');
  await expect(real(page).locator('table td')).toHaveText('1');
  await expectRealEqualsPreview(page);
  await patchWith(page, (t) => t.replace('<td>1</td>', '<td>2</td>'));
  await expect(real(page).locator('table td')).toHaveText('2');
  await expectRealEqualsPreview(page);
  await patchWith(page, (t) => t.replace('</tr></tbody>', '</tr><tr><td>3</td></tr></tbody>'));
  await expect(real(page).locator('table tr')).toHaveCount(2);
  await expect(real(page).locator('table tr').nth(1).locator('td')).toHaveText('3');
  await expectRealEqualsPreview(page);

  // (b) 초기 상태에서 tbody 없이 쓴 표 (브라우저가 tbody를 끼워 넣지만 alert 없이 정상 반영: 선언 없는 alert는 실패한다)
  await open(page);
  await patchWith(page, (t) => t + '<table><tr><td>1</td></tr></table>');
  await expect(real(page).locator('table > tbody > tr > td')).toHaveText('1');
  expect(await structureOf(page, 'real-area')).toEqual(await structureOf(page, 'test-area'));
  await expectThreeSame(page); // 편집창 글(tbody 없음)도 브라우저가 읽은 구조는 같다
  // 이어서 고친 칸 글자도 반영된다
  await patchWith(page, (t) => t.replace('<td>1</td>', '<td>2</td>'));
  await expect(real(page).locator('table td')).toHaveText('2');
  await expect(real(page).locator('table > tbody')).toHaveCount(1);
  await expectRealEqualsPreview(page);
});
