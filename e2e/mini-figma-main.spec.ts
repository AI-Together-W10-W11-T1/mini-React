import type { Page } from '@playwright/test';
import { test, expect, URL, holdNodes, sameNode, watchApp, selectOnCanvas, canvasLabels, buttonSel, rgb, bgOf, textOf, pickColor } from './mini-figma-helpers';

// [AI Note]: QA-5 ~ QA-9 (메인 속성 편집 5칸 + 아이콘). 이 스펙의 테스트는 desktop · mobile 두 프로젝트에서 모두 돈다.
// 화면에는 patch 줄 수가 없으므로(MF-05) "바뀐 곳만 고침"은 같은 DOM 노드 + MutationObserver로 확인하고, patch 종류 · 개수는 app.test.ts가 본다.

const IDS = ['main', 'b1', 'b2', 'b3'] as const;
const ALL_BUTTONS: Record<string, string> = Object.fromEntries(IDS.map((id) => [id, buttonSel(id)]));
const LABEL_SPANS: Record<string, string> = Object.fromEntries(IDS.map((id) => [`label-${id}`, `${buttonSel(id)} [data-testid="btn-label"]`]));

/** 각 캔버스 버튼의 class 글 (메인 → b1 → b2 → b3) */
function buttonClasses(page: Page): Promise<string[]> {
  return page.getByTestId('figma-button').evaluateAll((els) => els.map((el) => el.className));
}

async function allSame(page: Page, names: Record<string, string>): Promise<boolean> {
  for (const [name, sel] of Object.entries(names)) {
    if (!(await sameNode(page, name, sel))) return false;
  }
  return true;
}

test('QA-5 메인 라벨 칸 끝에 `!` `?`를 한 글자씩 입력하면 메인 · b1만 바로 바뀌고(b2 · b3는 override) 노드 · 입력칸 포커스가 유지된다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');
  const input = page.getByTestId('prop-label');
  await expect(input).toHaveValue('버튼');
  await holdNodes(page, { ...ALL_BUTTONS, ...LABEL_SPANS, labelInput: '[data-testid="prop-label"]' });
  const canvasWatch = await watchApp(page, 'canvas');

  await input.focus();
  await page.keyboard.press('End');
  await input.pressSequentially('!');
  expect(await canvasLabels(page)).toEqual(['버튼!', '버튼!', '취소', '삭제']);
  await input.pressSequentially('?');
  expect(await canvasLabels(page)).toEqual(['버튼!?', '버튼!?', '취소', '삭제']);

  // 노드 · 입력칸이 같은 참조, 포커스와 커서 유지
  expect(await allSame(page, ALL_BUTTONS)).toBe(true);
  expect(await allSame(page, LABEL_SPANS)).toBe(true);
  expect(await sameNode(page, 'labelInput', '[data-testid="prop-label"]')).toBe(true);
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('버튼!?');
  expect(await input.evaluate((el) => (el as HTMLInputElement).selectionStart === (el as HTMLInputElement).value.length)).toBe(true);

  // 캔버스 DOM 변경은 글자 변경(characterData)뿐: 글자 하나당 메인 · b1 두 곳 × 2글자 = 4건
  const m = (await canvasWatch.take()).body;
  expect(m.characterData).toBe(4);
  expect(m.childList).toBe(0);
  expect(m.attributes).toBe(0);
});

test('QA-6 크기 선택을 `L`로 바꾸면 override 없는 4개 버튼이 모두 btn-L이 되고 노드는 같은 참조다. 다시 `S`로 → btn-S', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');
  await holdNodes(page, ALL_BUTTONS);

  await page.getByTestId('prop-size').selectOption('L');

  await expect(page.getByTestId('prop-size')).toHaveValue('L');
  for (const c of await buttonClasses(page)) expect(c.split(' ')).toContain('btn-L');
  for (const c of await buttonClasses(page)) expect(c.split(' ')).not.toContain('btn-M');
  expect(await allSame(page, ALL_BUTTONS)).toBe(true);

  await page.getByTestId('prop-size').selectOption('S');

  for (const c of await buttonClasses(page)) expect(c.split(' ')).toContain('btn-S');
  expect(await allSame(page, ALL_BUTTONS)).toBe(true);
});

test('QA-7 메인 색을 `초록`(칩 #05b169)으로 바꾸면 메인 · b1 · b2는 초록(글자는 먹색)이고 b3는 빨강 그대로다 (이미 색을 바꿨으므로 메인이 바꿔도 영향 없음)', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');
  await holdNodes(page, ALL_BUTTONS);

  await pickColor(page, '#05b169');

  for (const id of ['main', 'b1', 'b2']) {
    expect(await bgOf(page, id), `${id} 배경`).toBe(rgb('#05b169'));
    expect(await textOf(page, id), `${id} 글자 — 밝은 배경이라 먹색`).toBe(rgb('#0a0b0d'));
  }
  expect(await bgOf(page, 'b3')).toBe(rgb('#cf202f'));
  expect(await textOf(page, 'b3')).toBe(rgb('#ffffff'));
  expect(await allSame(page, ALL_BUTTONS)).toBe(true);
});

test('QA-8 메인 아이콘 보이기를 켜면 4개 버튼 글자 앞에 ★이 생기고(글자 <span>은 같은 참조), 끄면 사라진다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');
  await expect(page.getByTestId('prop-hasicon')).not.toBeChecked();
  await holdNodes(page, { ...ALL_BUTTONS, ...LABEL_SPANS });
  const canvasWatch = await watchApp(page, 'canvas');

  await page.getByTestId('prop-hasicon').check();

  await expect(page.getByTestId('btn-icon')).toHaveCount(4);
  expect(await page.getByTestId('btn-icon').allTextContents()).toEqual(['★', '★', '★', '★']);
  // 아이콘은 글자 앞: btn-icon의 다음 형제가 btn-label
  const nextTestIds = await page.getByTestId('btn-icon').evaluateAll((els) => els.map((el) => el.nextElementSibling?.getAttribute('data-testid')));
  expect(nextTestIds).toEqual(['btn-label', 'btn-label', 'btn-label', 'btn-label']);
  // 글자 <span> 노드는 4개 모두 같은 참조, 버튼도 같은 참조
  expect(await allSame(page, LABEL_SPANS)).toBe(true);
  expect(await allSame(page, ALL_BUTTONS)).toBe(true);
  let m = (await canvasWatch.take()).body;
  expect(m.childList).toBe(4);
  expect(m.characterData).toBe(0);
  expect(m.attributes).toBe(0);

  await page.getByTestId('prop-hasicon').uncheck();

  await expect(page.getByTestId('btn-icon')).toHaveCount(0);
  expect(await allSame(page, LABEL_SPANS)).toBe(true);
  expect(await allSame(page, ALL_BUTTONS)).toBe(true);
  m = (await canvasWatch.take()).body;
  expect(m.childList).toBe(4);
  expect(m.characterData).toBe(0);
  expect(m.attributes).toBe(0);
});

test('QA-9 아이콘 종류를 `♥`로 바꾸면 4개 아이콘 글자가 ♥이 되고 아이콘 <span>은 같은 참조다 (Instance swap, 글자 변경으로만 보임)', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');
  await page.getByTestId('prop-hasicon').check();
  await expect(page.getByTestId('btn-icon')).toHaveCount(4);
  await holdNodes(page, Object.fromEntries(IDS.map((id) => [`icon-${id}`, `${buttonSel(id)} [data-testid="btn-icon"]`])));
  const canvasWatch = await watchApp(page, 'canvas');

  await page.getByTestId('prop-icon').selectOption('heart');

  expect(await page.getByTestId('btn-icon').allTextContents()).toEqual(['♥', '♥', '♥', '♥']);
  for (const id of IDS) expect(await sameNode(page, `icon-${id}`, `${buttonSel(id)} [data-testid="btn-icon"]`)).toBe(true);
  const m = (await canvasWatch.take()).body;
  expect(m.characterData).toBe(4);
  expect(m.childList).toBe(0);
  expect(m.attributes).toBe(0);
});
