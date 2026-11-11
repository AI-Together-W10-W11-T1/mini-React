import type { Page } from '@playwright/test';
import {
  test,
  expect,
  URL,
  holdNodes,
  sameNode,
  watchApp,
  watchSel,
  selectOnCanvas,
  selectInLayer,
  canvasLabels,
  buttonSel,
  layerSel,
  rowSel,
  inRow,
  overriddenFields,
  followingFields,
  rgb,
  bgOf,
  pickColor,
} from './mini-figma-helpers';
import type { PropField } from './mini-figma-helpers';

// [AI Note]: QA-10 ~ QA-13 · QA-26 ~ QA-28 (인스턴스 속성 편집 · override 표시 · ↻). 이 스펙의 테스트는 desktop · mobile 두 프로젝트에서 모두 돈다.
// 인스턴스 아이콘(QA-26 ~ 28)은 key 때문에 patch가 한 버튼 안에서만 일어나는 것을 "다른 버튼의 DOM 변경 0"으로 확인한다.

const IDS = ['main', 'b1', 'b2', 'b3'] as const;
const ALL_BUTTONS: Record<string, string> = Object.fromEntries(IDS.map((id) => [id, buttonSel(id)]));
const LABEL_SPANS: Record<string, string> = Object.fromEntries(IDS.map((id) => [`label-${id}`, `${buttonSel(id)} [data-testid="btn-label"]`]));

async function allSame(page: Page, names: Record<string, string>): Promise<boolean> {
  for (const [name, sel] of Object.entries(names)) {
    if (!(await sameNode(page, name, sel))) return false;
  }
  return true;
}

/** id별 캔버스 버튼의 class 글 */
async function classOf(page: Page, id: string): Promise<string> {
  return (await page.locator(buttonSel(id)).getAttribute('class')) ?? '';
}

/** id별 캔버스 버튼 안 아이콘 글자들 (아이콘이 없으면 빈 배열) */
function iconsOf(page: Page, id: string): Promise<string[]> {
  return page.locator(`${buttonSel(id)} [data-testid="btn-icon"]`).allTextContents();
}

test('QA-10 b1을 고르고 라벨을 `확인`으로 바꾸면 b1만 바뀌고(override 표시 + ↻), 이어서 크기 S · 색 초록도 b1만 바뀐다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'b1');
  // 칸 5개 모두 「메인 따름」
  expect(await followingFields(page)).toEqual(['label', 'size', 'hasIcon', 'icon', 'color']);
  expect(await overriddenFields(page)).toEqual([]);
  await expect(page.getByTestId('prop-reset')).toHaveCount(0);
  await holdNodes(page, ALL_BUTTONS);
  const watchers = Object.fromEntries(await Promise.all(IDS.map(async (id) => [id, await watchSel(page, id, buttonSel(id))] as const)));

  await page.getByTestId('prop-label').fill('확인');

  // b1만 확인, 나머지는 그대로 (그 버튼의 DOM 변경 없음)
  expect(await canvasLabels(page)).toEqual(['버튼', '확인', '취소', '삭제']);
  for (const id of ['main', 'b2', 'b3'] as const) expect((await watchers[id].take()).total, `${id}의 DOM 변경`).toBe(0);
  expect((await watchers.b1.take()).characterData).toBe(1);
  expect(await allSame(page, ALL_BUTTONS)).toBe(true);
  // 라벨 칸은 override 표시 + ↻, 나머지 4칸은 계속 「메인 따름」
  expect(await overriddenFields(page)).toEqual(['label']);
  expect(await followingFields(page)).toEqual(['size', 'hasIcon', 'icon', 'color']);
  await expect(page.locator(inRow('label', 'prop-reset'))).toHaveCount(1);
  await expect(page.getByTestId('prop-reset')).toHaveCount(1);
  // 레이어의 b1 행 이름도 확인, 머리도 따라감
  await expect(page.locator(`${layerSel('b1')} [data-testid="layer-name"]`)).toHaveText('확인');
  await expect(page.getByTestId('property-title')).toHaveText('인스턴스 · 확인');

  // 크기 S: b1만 btn-S (인스턴스 크기 override), 메인 · b2 · b3는 btn-M
  await page.getByTestId('prop-size').selectOption('S');
  expect((await classOf(page, 'b1')).split(' ')).toContain('btn-S');
  for (const id of ['main', 'b2', 'b3']) expect((await classOf(page, id)).split(' ')).toContain('btn-M');
  expect(await overriddenFields(page)).toEqual(['label', 'size']);

  // 색 초록(#05b169): b1만 배경이 초록, 메인 · b2는 #0052ff, b3는 #cf202f 그대로
  await pickColor(page, '#05b169');
  expect(await bgOf(page, 'b1')).toBe(rgb('#05b169'));
  expect(await bgOf(page, 'main')).toBe(rgb('#0052ff'));
  expect(await bgOf(page, 'b2')).toBe(rgb('#0052ff'));
  expect(await bgOf(page, 'b3')).toBe(rgb('#cf202f'));
  expect(await allSame(page, ALL_BUTTONS)).toBe(true);
});

test('QA-11 b1 라벨 override `확인`은 메인 라벨을 `저장`으로 바꿔도 그대로이고, 다시 b1을 고르면 라벨 칸 `확인`에 ↻가 있다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'b1');
  await page.getByTestId('prop-label').fill('확인');
  await selectOnCanvas(page, 'main');
  await holdNodes(page, ALL_BUTTONS);

  await page.getByTestId('prop-label').fill('저장');

  expect(await canvasLabels(page)).toEqual(['저장', '확인', '취소', '삭제']);
  expect(await allSame(page, ALL_BUTTONS)).toBe(true);
  await selectOnCanvas(page, 'b1');
  await expect(page.getByTestId('prop-label')).toHaveValue('확인');
  await expect(page.locator(inRow('label', 'prop-reset'))).toHaveCount(1);
});

test('QA-12 b1 라벨 ↻를 누르면 메인 값 `저장`을 따르고(글자가 사라지지 않음), 이어서 메인을 `보관`으로 바꾸면 b1도 따라간다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'b1');
  await page.getByTestId('prop-label').fill('확인');
  await selectOnCanvas(page, 'main');
  await page.getByTestId('prop-label').fill('저장');
  await selectOnCanvas(page, 'b1');
  await holdNodes(page, ALL_BUTTONS);

  await page.locator(inRow('label', 'prop-reset')).click();

  expect(await canvasLabels(page)).toEqual(['저장', '저장', '취소', '삭제']);
  await expect(page.getByTestId('prop-label')).toHaveValue('저장');
  expect(await overriddenFields(page)).toEqual([]);
  await expect(page.locator(inRow('label', 'prop-follow'))).toHaveCount(1);
  await expect(page.getByTestId('prop-reset')).toHaveCount(0);

  await selectOnCanvas(page, 'main');
  await page.getByTestId('prop-label').fill('보관');

  expect(await canvasLabels(page)).toEqual(['보관', '보관', '취소', '삭제']);
  expect(await allSame(page, ALL_BUTTONS)).toBe(true);
});

test('QA-13 b2 · b3 · b1을 차례로 고르면 override 칸만 색 구분 + ↻이고 나머지는 「메인 따름」이다', async ({ page }) => {
  await page.goto(URL);
  const all: PropField[] = ['label', 'size', 'hasIcon', 'icon', 'color'];

  // b2 = { label: '취소' }
  await selectOnCanvas(page, 'b2');
  expect(await overriddenFields(page)).toEqual(['label']);
  expect(await followingFields(page)).toEqual(all.filter((f) => f !== 'label'));
  await expect(page.getByTestId('prop-reset')).toHaveCount(1);
  await expect(page.getByTestId('prop-label')).toHaveValue('취소');
  await expect(page.getByTestId('prop-size')).toHaveValue('M');
  await expect(page.getByTestId('prop-color')).toHaveValue('#0052ff');

  // b3 = { label: '삭제', color: 'red' } (MF-16: 라벨도 override)
  await selectOnCanvas(page, 'b3');
  expect(await overriddenFields(page)).toEqual(['label', 'color']);
  expect(await followingFields(page)).toEqual(['size', 'hasIcon', 'icon']);
  await expect(page.getByTestId('prop-reset')).toHaveCount(2);
  await expect(page.getByTestId('prop-label')).toHaveValue('삭제');
  await expect(page.getByTestId('prop-color')).toHaveValue('#cf202f');

  // b1 = {}: 5칸 모두 「메인 따름」, ↻ 0개, 값은 메인 값
  await selectOnCanvas(page, 'b1');
  expect(await overriddenFields(page)).toEqual([]);
  expect(await followingFields(page)).toEqual(all);
  await expect(page.getByTestId('prop-reset')).toHaveCount(0);
  await expect(page.getByTestId('prop-label')).toHaveValue('버튼');
  await expect(page.getByTestId('prop-hasicon')).not.toBeChecked();
  await expect(page.getByTestId('prop-icon')).toHaveValue('star');

  // 메인을 고르면 override 표시가 없다 (「메인 따름」도 ↻도 없음)
  await selectOnCanvas(page, 'main');
  await expect(page.getByTestId('prop-reset')).toHaveCount(0);
  await expect(page.getByTestId('prop-follow')).toHaveCount(0);
  await expect(page.locator(rowSel('label'))).toHaveCount(1);
});

test('QA-26 b2의 아이콘 보이기를 켜고 ♥로 바꾸면 b2에만 아이콘이 생기고(override 표시), 다른 버튼 DOM은 변하지 않는다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'b2');
  await holdNodes(page, { ...ALL_BUTTONS, ...LABEL_SPANS });
  const watchers = Object.fromEntries(await Promise.all(IDS.map(async (id) => [id, await watchSel(page, id, buttonSel(id))] as const)));

  await page.getByTestId('prop-hasicon').check();

  expect(await iconsOf(page, 'b2')).toEqual(['★']);
  for (const id of ['main', 'b1', 'b3']) expect(await iconsOf(page, id)).toEqual([]);
  // 아이콘은 b2의 글자 앞
  expect(await page.locator(`${buttonSel('b2')} [data-testid="btn-icon"]`).evaluate((el) => el.nextElementSibling?.getAttribute('data-testid'))).toBe('btn-label');
  expect(await overriddenFields(page)).toEqual(['label', 'hasIcon']);

  await page.getByTestId('prop-icon').selectOption('heart');

  expect(await iconsOf(page, 'b2')).toEqual(['♥']);
  for (const id of ['main', 'b1', 'b3']) expect(await iconsOf(page, id)).toEqual([]);
  // b2 패널: 라벨 · 아이콘 보이기 · 아이콘 종류가 override, 크기 · 색은 메인 따름. 라벨 `취소`는 그대로
  expect(await overriddenFields(page)).toEqual(['label', 'hasIcon', 'icon']);
  expect(await followingFields(page)).toEqual(['size', 'color']);
  expect(await canvasLabels(page)).toEqual(['버튼', '버튼', '취소', '삭제']);
  // 모든 버튼 · 글자 <span> 노드는 같은 참조, 메인 · b1 · b3의 DOM 변경 0
  expect(await allSame(page, ALL_BUTTONS)).toBe(true);
  expect(await allSame(page, LABEL_SPANS)).toBe(true);
  for (const id of ['main', 'b1', 'b3'] as const) expect((await watchers[id].take()).total, `${id}의 DOM 변경`).toBe(0);
  const b2 = await watchers.b2.take();
  expect(b2.childList).toBe(1); // 아이콘 INSERT 한 번
  expect(b2.characterData).toBe(1); // ★ → ♥ 글자 변경 한 번
});

test('QA-27 b2가 아이콘 override를 가진 채 메인 아이콘을 켜고 ♥ → ★로 바꿔도 b2는 ♥ 그대로이고, 메인을 끄면 b2의 아이콘만 남는다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'b2');
  await page.getByTestId('prop-hasicon').check();
  await page.getByTestId('prop-icon').selectOption('heart');
  await holdNodes(page, { b2icon: `${buttonSel('b2')} [data-testid="btn-icon"]` });
  await selectOnCanvas(page, 'main');

  // 메인 아이콘 켜기: 메인 · b1 · b3에 ★이 생기고 b2는 이미 있던 ♥ 그대로
  await page.getByTestId('prop-hasicon').check();
  for (const id of ['main', 'b1', 'b3']) expect(await iconsOf(page, id)).toEqual(['★']);
  expect(await iconsOf(page, 'b2')).toEqual(['♥']);
  expect(await sameNode(page, 'b2icon', `${buttonSel('b2')} [data-testid="btn-icon"]`)).toBe(true);

  // 메인 종류 ♥ → 메인 · b1 · b3가 ♥, 다시 ★ → ★로 돌아가는데 b2는 계속 ♥
  await page.getByTestId('prop-icon').selectOption('heart');
  for (const id of ['main', 'b1', 'b3']) expect(await iconsOf(page, id)).toEqual(['♥']);
  expect(await iconsOf(page, 'b2')).toEqual(['♥']);
  await page.getByTestId('prop-icon').selectOption('star');
  for (const id of ['main', 'b1', 'b3']) expect(await iconsOf(page, id)).toEqual(['★']);
  expect(await iconsOf(page, 'b2')).toEqual(['♥']);

  // 메인 아이콘 보이기를 다시 끄면 메인 · b1 · b3의 아이콘만 사라지고 b2의 아이콘은 남음 (hasIcon override)
  await page.getByTestId('prop-hasicon').uncheck();
  for (const id of ['main', 'b1', 'b3']) expect(await iconsOf(page, id)).toEqual([]);
  expect(await iconsOf(page, 'b2')).toEqual(['♥']);
  expect(await sameNode(page, 'b2icon', `${buttonSel('b2')} [data-testid="btn-icon"]`)).toBe(true);
});

test('QA-28 b2의 아이콘 보이기 ↻로 아이콘이 사라지고, 종류 ↻는 눈에 보이는 변화가 없으며, 메인을 켜면 b2도 메인을 따라 ★이 된다', async ({ page }) => {
  await page.goto(URL);
  // QA-27 마친 상태: 메인 아이콘 꺼짐 · 종류 ★, b2는 켜짐 + ♥ override
  await selectOnCanvas(page, 'b2');
  await page.getByTestId('prop-hasicon').check();
  await page.getByTestId('prop-icon').selectOption('heart');
  expect(await iconsOf(page, 'b2')).toEqual(['♥']);

  // 아이콘 보이기 ↻ → 메인(꺼짐)을 따라 b2의 아이콘이 사라진다
  await page.locator(inRow('hasIcon', 'prop-reset')).click();
  expect(await iconsOf(page, 'b2')).toEqual([]);
  await expect(page.locator(inRow('hasIcon', 'prop-follow'))).toHaveCount(1);
  await expect(page.getByTestId('prop-hasicon')).not.toBeChecked();

  // 아이콘 종류 ↻ → 꺼진 상태라 눈에 보이는 변화 없음, 그 칸만 「메인 따름」
  const watcher = await watchApp(page, 'canvas');
  await page.locator(inRow('icon', 'prop-reset')).click();
  expect((await watcher.take()).body.total).toBe(0);
  await expect(page.locator(inRow('icon', 'prop-follow'))).toHaveCount(1);
  await expect(page.getByTestId('prop-icon')).toHaveValue('star');
  expect(await overriddenFields(page)).toEqual(['label']);

  // 메인 아이콘 보이기를 켜면 4개 버튼 모두 ★ (b2도 메인을 따라 ★, ♥ 아님)
  await selectOnCanvas(page, 'main');
  await page.getByTestId('prop-hasicon').check();
  for (const id of IDS) expect(await iconsOf(page, id)).toEqual(['★']);
  // undefined가 글자 · 클래스에 나오지 않는다
  expect(await page.getByTestId('figma-button').evaluateAll((els) => els.map((el) => el.className + el.textContent))).not.toContainEqual(expect.stringContaining('undefined'));
});
