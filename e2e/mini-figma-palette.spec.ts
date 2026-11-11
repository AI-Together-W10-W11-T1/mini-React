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
  selectedOnCanvas,
  canvasOrder,
  buttonSel,
  inRow,
  overriddenFields,
  followingFields,
  pressBack,
  realBgOf,
  rgb,
  bgOf,
  textOf,
  colorsOf,
  pickColor,
  pickColorInput,
} from './mini-figma-helpers';

// [AI Note]: QA-35 ~ QA-39 (팔레트 판 · 칩 8개 + 색 입력칸) · QA-A22 · A24 · A25 (색 연타 · 같은 색 · 칩 연타).
// 이 스펙의 테스트는 desktop · mobile 두 프로젝트에서 모두 돈다. 색은 클래스가 아니라 style이라 computed style(`rgb(r, g, b)`)로 읽는다.
// 글자색 표(④-1 A: 흰색 · 먹색 #0a0b0d 중 WCAG 대비가 큰 쪽)는 일부러 소스(color.ts)를 가져오지 않고 값을 직접 적는다 — 구현과 같은 틀린 식을 따라 하지 않으려고.

const IDS = ['main', 'b1', 'b2', 'b3'] as const;
const ALL_BUTTONS: Record<string, string> = Object.fromEntries(IDS.map((id) => [id, buttonSel(id)]));
const CHIPS = ['#0052ff', '#cf202f', '#05b169', '#f4b000', '#0a0b0d', '#5b616e', '#a8acb3', '#eef0f3'] as const;
const WHITE = '#ffffff';
const INK = '#0a0b0d';
/** 칩 8개의 글자색 (흰 글자: 어두운 칩 4개 / 먹 글자: 밝은 칩 4개) */
const TEXT_OF_CHIP: Record<string, string> = {
  '#0052ff': WHITE,
  '#cf202f': WHITE,
  '#05b169': INK,
  '#f4b000': INK,
  '#0a0b0d': WHITE,
  '#5b616e': WHITE,
  '#a8acb3': INK,
  '#eef0f3': INK,
};

async function allSame(page: Page, names: Record<string, string>): Promise<boolean> {
  for (const [name, sel] of Object.entries(names)) {
    if (!(await sameNode(page, name, sel))) return false;
  }
  return true;
}

/** 지금 `aria-pressed="true"`인 칩들의 색 (칩 순서대로) */
function pressedChips(page: Page): Promise<string[]> {
  return page
    .locator('[data-testid="color-chip"][aria-pressed="true"]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-color') ?? ''));
}

const CHANGED = [rgb('#0052ff'), rgb('#0052ff'), rgb('#0052ff'), rgb('#cf202f')];

test('QA-35 메인을 고르면 색 칸에 팔레트 판(칩 8개 · 지금 색 표시 · 색 입력칸 · 값 글자)이 있고 선택 상자는 없다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');

  await expect(page.getByTestId('color-palette')).toHaveCount(1);
  const chips = await page.getByTestId('color-chip').evaluateAll((els) => els.map((el) => el.getAttribute('data-color')));
  expect(chips).toEqual([...CHIPS]);
  expect(await pressedChips(page), '지금 색 #0052ff 칩만 aria-pressed="true"').toEqual(['#0052ff']);
  // 나머지 칩은 문자열 "false" (속성이 빠지지 않는다)
  const falseCount = await page.locator('[data-testid="color-chip"][aria-pressed="false"]').count();
  expect(falseCount).toBe(7);
  // 직접 고르기 = <input type="color">, 값 #0052ff. 값 글자 #0052ff
  const input = page.getByTestId('prop-color');
  expect(await input.evaluate((el) => (el as HTMLInputElement).type)).toBe('color');
  await expect(input).toHaveValue('#0052ff');
  await expect(page.getByTestId('color-hex')).toHaveText('#0052ff');
  // 색 칸에는 <select>가 없다 (크기 · 아이콘 종류 칸에는 있음)
  await expect(page.locator(`${'[data-testid="prop-row"][data-field="color"]'} select`)).toHaveCount(0);
  await expect(page.locator('[data-testid="prop-row"][data-field="size"] select')).toHaveCount(1);
});

test('QA-36 칩 8개를 차례로 누르면 메인 · b1 · b2 배경이 그 색이 되고(b3는 override라 그대로) 글자색이 규칙대로이며 누른 칩만 표시된다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');
  await holdNodes(page, ALL_BUTTONS);

  for (const hex of CHIPS) {
    await pickColor(page, hex);
    for (const id of ['main', 'b1', 'b2']) {
      expect(await bgOf(page, id), `${hex} → ${id} 배경`).toBe(rgb(hex));
      expect(await textOf(page, id), `${hex} → ${id} 글자색`).toBe(rgb(TEXT_OF_CHIP[hex]));
    }
    // b3는 자기 색(#cf202f)이 있는 override라 메인이 바뀌어도 그대로, 글자색도 흰색
    expect(await bgOf(page, 'b3'), `${hex} → b3 배경`).toBe(rgb('#cf202f'));
    expect(await textOf(page, 'b3')).toBe(rgb(WHITE));
    expect(await pressedChips(page), `${hex}: 누른 칩만 표시`).toEqual([hex]);
    await expect(page.getByTestId('prop-color')).toHaveValue(hex);
    await expect(page.getByTestId('color-hex')).toHaveText(hex);
    expect(await allSame(page, ALL_BUTTONS), `${hex}: 버튼 노드 같은 참조`).toBe(true);
  }
});

test('QA-37 색 입력칸에 값을 세 번 넣으면 버튼이 따라 바뀌고(칩 밖 색이라 칩 표시 0개)', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');
  await holdNodes(page, { ...ALL_BUTTONS, colorInput: '[data-testid="prop-color"]' });

  for (const hex of ['#112233', '#223344', '#336699']) {
    await pickColorInput(page, hex);
    for (const id of ['main', 'b1', 'b2']) expect(await bgOf(page, id), `${hex} → ${id}`).toBe(rgb(hex));
    expect(await bgOf(page, 'b3')).toBe(rgb('#cf202f'));
  }
  expect(await pressedChips(page), '칩 8개 밖의 색이라 표시된 칩이 없다').toEqual([]);
  await expect(page.getByTestId('color-hex')).toHaveText('#336699');
  expect(await sameNode(page, 'colorInput', '[data-testid="prop-color"]'), '입력칸은 다시 만들지 않는다').toBe(true);
  expect(await allSame(page, ALL_BUTTONS)).toBe(true);

});

test('QA-38 인스턴스 색: 칩을 누르면 override(↻), 메인을 바꿔도 안 따라가고, ↻로 키를 지우면 메인을 다시 따라가며, 메인과 같은 색도 override다', async ({ page }) => {
  await page.goto(URL);

  // ① b1(override 없음) 선택 → 칩 #05b169: 색 칸에 override 표시 + ↻, b1만 초록
  await selectOnCanvas(page, 'b1');
  expect(await followingFields(page)).toContain('color');
  await pickColor(page, '#05b169');
  expect(await overriddenFields(page)).toEqual(['color']);
  await expect(page.locator(inRow('color', 'prop-reset'))).toHaveCount(1);
  expect(await bgOf(page, 'b1')).toBe(rgb('#05b169'));
  expect(await bgOf(page, 'main')).toBe(rgb('#0052ff'));
  expect(await bgOf(page, 'b2')).toBe(rgb('#0052ff'));
  expect(await pressedChips(page)).toEqual(['#05b169']);

  // ② 메인을 고르고 칩 #cf202f: 메인 · b2는 빨강, b1은 초록 그대로
  await selectOnCanvas(page, 'main');
  await pickColor(page, '#cf202f');
  expect(await bgOf(page, 'main')).toBe(rgb('#cf202f'));
  expect(await bgOf(page, 'b2')).toBe(rgb('#cf202f'));
  expect(await bgOf(page, 'b1')).toBe(rgb('#05b169'));

  // ③ b1을 고르고 ↻: 「메인 따름」, b1이 메인 색(빨강)을 따라감, 'undefined' 글자가 화면에 없음
  await selectOnCanvas(page, 'b1');
  await page.locator(inRow('color', 'prop-reset')).click();
  expect(await followingFields(page)).toContain('color');
  expect(await overriddenFields(page)).toEqual([]);
  await expect(page.locator(inRow('color', 'prop-follow'))).toHaveText('메인 따름');
  expect(await bgOf(page, 'b1')).toBe(rgb('#cf202f'));
  await expect(page.getByTestId('prop-color')).toHaveValue('#cf202f');
  expect(((await page.getByTestId('app-root').textContent()) ?? '').toLowerCase()).not.toContain('undefined');
  expect(await page.getByTestId('app-root').innerHTML()).not.toContain('undefined');

  // ④ b1에서 메인과 같은 값(메인 색) 칩: 값은 같아도 override로 남는다 → 메인을 바꿔도 안 따라감
  await pickColor(page, '#cf202f');
  expect(await overriddenFields(page)).toEqual(['color']);
  await expect(page.locator(inRow('color', 'prop-reset'))).toHaveCount(1);
  await selectOnCanvas(page, 'main');
  await pickColor(page, '#f4b000');
  expect(await bgOf(page, 'main')).toBe(rgb('#f4b000'));
  expect(await bgOf(page, 'b2')).toBe(rgb('#f4b000'));
  expect(await bgOf(page, 'b1'), '메인과 같은 값이어도 override라 안 따라간다').toBe(rgb('#cf202f'));
});

test('QA-39 색을 바꿔도 버튼 노드 · class 글이 그대로이고 style 속성만 고친다 (글자색이 같으면 버튼당 1건, 밝기 쪽이 바뀌면 2건)', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');
  await holdNodes(page, ALL_BUTTONS);
  const classBefore = await page.getByTestId('figma-button').evaluateAll((els) => els.map((el) => el.className));
  const watchers = Object.fromEntries(await Promise.all(IDS.map(async (id) => [id, await watchSel(page, id, buttonSel(id))] as const)));

  // ① 칩 #cf202f: 글자색은 흰색 그대로 → 메인 · b1 · b2 버튼당 속성 변경 1건 (배경만), b3는 0
  await pickColor(page, '#cf202f');
  for (const id of ['main', 'b1', 'b2'] as const) {
    const m = await watchers[id].take();
    expect(m, `① ${id}`).toMatchObject({ attributes: 1, childList: 0, characterData: 0 });
  }
  expect((await watchers.b3.take()).total, '① b3 (override)').toBe(0);
  expect(await page.getByTestId('figma-button').evaluateAll((els) => els.map((el) => el.className))).toEqual(classBefore);

  // ② 칩 #f4b000: 글자색이 먹색으로 바뀜 → 버튼당 2건 (배경 + 글자색)
  await pickColor(page, '#f4b000');
  for (const id of ['main', 'b1', 'b2'] as const) {
    const m = await watchers[id].take();
    expect(m, `② ${id}`).toMatchObject({ attributes: 2, childList: 0, characterData: 0 });
  }
  expect((await watchers.b3.take()).total, '② b3 (override)').toBe(0);
  expect(await page.getByTestId('figma-button').evaluateAll((els) => els.map((el) => el.className))).toEqual(classBefore);
  expect(await allSame(page, ALL_BUTTONS)).toBe(true);
});

test('QA-A22 색 입력칸 연타: 서로 다른 색을 30번 연달아 보내도(칩도 섞음) 오류 없이 마지막 값이 반영되고 입력칸 노드가 유지된다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');
  await holdNodes(page, { colorInput: '[data-testid="prop-color"]', ...ALL_BUTTONS });

  let last = '#0052ff';
  for (let i = 0; i < 30; i += 1) {
    if (i % 5 === 0) {
      last = CHIPS[(i / 5 + 1) % CHIPS.length];
      await pickColor(page, last);
    } else {
      const channel = (k: number): string => ((i * 37 + k * 71 + 11) % 256).toString(16).padStart(2, '0');
      last = `#${channel(1)}${channel(2)}${channel(3)}`;
      await pickColorInput(page, last);
    }
  }

  for (const id of ['main', 'b1', 'b2']) expect(await bgOf(page, id), `마지막 값 → ${id}`).toBe(rgb(last));
  await expect(page.getByTestId('color-hex')).toHaveText(last);
  await expect(page.getByTestId('prop-color')).toHaveValue(last);
  expect(await sameNode(page, 'colorInput', '[data-testid="prop-color"]')).toBe(true);
  expect(await allSame(page, ALL_BUTTONS)).toBe(true);
});

test('QA-A23 극단 · 경계 색: 글자색이 규칙대로이고(경계 #777777 흰 · #787878 먹) 배경과 글자가 같은 색인 경우가 없으며, 대문자 입력은 소문자로 정리된다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');

  const cases: [string, string][] = [
    ['#000000', WHITE],
    ['#ffffff', INK],
    ['#777777', WHITE],
    ['#787878', INK],
    ['#ff0000', INK],
  ];
  for (const [hex, text] of cases) {
    await pickColorInput(page, hex);
    expect(await bgOf(page, 'main'), `${hex} 배경`).toBe(rgb(hex));
    expect(await textOf(page, 'main'), `${hex} 글자`).toBe(rgb(text));
    expect(await bgOf(page, 'main')).not.toBe(await textOf(page, 'main'));
    await expect(page.getByTestId('color-hex')).toHaveText(hex);
  }

  // 대문자: 브라우저가 소문자로 정리해서 상태 · 표시가 #eef0f3
  await page.getByTestId('prop-color').evaluate((el) => {
    const input = el as HTMLInputElement;
    input.value = '#EEF0F3';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.getByTestId('color-hex')).toHaveText('#eef0f3');
  await expect(page.getByTestId('prop-color')).toHaveValue('#eef0f3');
  expect(await bgOf(page, 'main')).toBe(rgb('#eef0f3'));
  expect(await textOf(page, 'main')).toBe(rgb(INK));
  expect(await pressedChips(page), '#eef0f3 칩이 지금 색').toEqual(['#eef0f3']);
});

test('QA-A24 같은 색 다시 누르기: 메인이 지금 색 칩을 다시 누르면 아무 일 없고, 인스턴스(메인 따름)가 메인과 같은 색 칩을 누르면 값은 같아도 override가 생긴다', async ({ page }) => {
  await page.goto(URL);

  // ① 메인을 고르고 지금 색(#0052ff) 칩: DOM 변경 0
  await selectOnCanvas(page, 'main');
  const watch = await watchApp(page);
  await pickColor(page, '#0052ff');
  expect((await watch.take()).body.total, '① DOM 변경').toBe(0);
  expect(await colorsOf(page)).toEqual(CHANGED);

  // ② b1(메인 따름)을 고르고 b1의 지금 색(메인과 같은 #0052ff) 칩: override 생김, 캔버스 · 레이어 DOM 변경 0
  await selectOnCanvas(page, 'b1');
  expect(await followingFields(page)).toContain('color');
  const canvasWatch = await watchApp(page, 'canvas');
  const layerWatch = await watchApp(page, 'layer-panel');
  await pickColor(page, '#0052ff');
  expect(await overriddenFields(page), '② override가 생겼다').toEqual(['color']);
  await expect(page.locator(inRow('color', 'prop-reset'))).toHaveCount(1);
  expect(await bgOf(page, 'b1')).toBe(rgb('#0052ff'));
  expect((await canvasWatch.take()).body.total, '② 캔버스 DOM 변경').toBe(0);
  expect((await layerWatch.take()).body.total, '② 레이어 DOM 변경').toBe(0);
});

test('QA-A28 색 입력칸에 포커스가 있을 때: Delete · Backspace는 아무 일 없고(고른 인스턴스가 안 지워짐), Ctrl+Z = 실제 영역 [실행 취소], Ctrl+Shift+Z = [다시 실행]다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'b2');
  await pickColor(page, '#05b169'); // b2만 초록
  expect(await bgOf(page, 'b2')).toBe(rgb('#05b169'));
  await page.getByTestId('patch-button').click(); // 실제 영역도 b2 초록
  expect(await realBgOf(page, 'b2')).toBe(rgb('#05b169'));
  const input = page.getByTestId('prop-color');
  await input.focus();
  await expect(input).toBeFocused();

  // Delete · Backspace: 글자 입력이 없는 칸이라 무시 (지워지지 않음)
  const watch = await watchApp(page);
  await page.keyboard.press('Delete');
  await page.keyboard.press('Backspace');
  expect(await canvasOrder(page)).toEqual(['b1', 'b2', 'b3']);
  expect(await selectedOnCanvas(page)).toEqual(['b2']);
  expect((await watch.take()).body.total, 'Delete · Backspace = DOM 변경 0').toBe(0);
  await expect(input).toBeFocused();

  // Ctrl+Z = 실제 영역 [실행 취소] (포커스를 안 빼고 누른다), Ctrl+Shift+Z = [다시 실행]. 테스트 영역은 그대로
  await page.keyboard.press('Control+KeyZ');
  expect(await realBgOf(page, 'b2')).toBe(rgb('#0052ff'));
  expect(await bgOf(page, 'b2')).toBe(rgb('#05b169'));
  expect(await selectedOnCanvas(page)).toEqual(['b2']);
  await page.keyboard.press('Control+Shift+KeyZ');
  expect(await realBgOf(page, 'b2')).toBe(rgb('#05b169'));
  expect(await canvasOrder(page)).toEqual(['b1', 'b2', 'b3']);
});
