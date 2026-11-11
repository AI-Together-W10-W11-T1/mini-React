import type { Page } from '@playwright/test';
import {
  test,
  expect,
  URL,
  holdNodes,
  sameNode,
  watchApp,
  watchSel,
  buttonSel,
  layerSel,
  colorsOf,
  rgb,
  bgOf,
  textOf,
  variableRows,
  setVariable,
  linkSelect,
  linkTo,
  noHorizontalScroll,
  selectOnCanvas,
  selectInLayer,
  selectedOnCanvas,
  pickColor,
  pickColorInput,
  inRow,
  overriddenFields,
  clickAdd,
  moveInLayer,
  canvasOrder,
} from './mini-figma-helpers';

// [AI Note]: 색 변수 Variables (task_007). QA-63 · 76 · A46 (Dev-3: 변수 구역) · QA-64 ~ 71 · A43 · A44 · A47 ~ A51 · A54 · A58 (Dev-4: 연결 UI, 같은 준비를 쓰는 것은 한 test로 묶고 이름에 번호를 모두 적음) — 이 스펙의 테스트는 desktop · mobile 두 프로젝트에서 모두 돈다.
// 모든 시나리오는 /mini-figma/를 새로 열어 시작한다 (변수 · 연결은 저장 안 됨).

const ORIGINAL = [rgb('#0052ff'), rgb('#0052ff'), rgb('#0052ff'), rgb('#cf202f')];

test('QA-63 처음 화면: layer-panel 안 인스턴스 목록 아래에 「변수」 구역 3줄(Primary · Danger · Success)과 값, 버튼 색은 그대로', async ({ page }) => {
  await page.goto(URL);

  await expect(page.getByTestId('variable-panel')).toHaveCount(1);
  // 레이어 창 안, 인스턴스 목록(layer-list) 뒤에 온다
  const placed = await page.getByTestId('layer-panel').evaluate((panel) => {
    const variable = panel.querySelector('[data-testid="variable-panel"]');
    const list = panel.querySelector('[data-testid="layer-list"]');
    if (variable === null || list === null) return false;
    return Boolean(list.compareDocumentPosition(variable) & Node.DOCUMENT_POSITION_FOLLOWING) && variable.parentElement === panel;
  });
  expect(placed, 'variable-panel이 layer-panel의 직접 자식이고 layer-list 뒤').toBe(true);
  await expect(page.getByTestId('variable-title')).toHaveText('변수');

  expect(await variableRows(page)).toEqual([
    { id: 'primary', name: 'Primary', value: '#0052ff', hex: '#0052ff', chip: rgb('#0052ff') },
    { id: 'danger', name: 'Danger', value: '#cf202f', hex: '#cf202f', chip: rgb('#cf202f') },
    { id: 'success', name: 'Success', value: '#05b169', hex: '#05b169', chip: rgb('#05b169') },
  ]);
  expect(await colorsOf(page), '캔버스 버튼 4개 색은 처음 그대로 (VR-08)').toEqual(ORIGINAL);
  // div.app 최상위 자식은 그대로 5개 (경로 접두 불변)
  expect(await page.locator('[data-testid="app-root"] > .app > *').count()).toBe(5);
});

test('QA-76 변수 구역 배치: layer-panel 박스 안(넘침 0) · 가로 스크롤 없음 · 입력칸 터치 목표 32px 이상 · 줄 3개가 화면 폭 안', async ({ page }, testInfo) => {
  await page.goto(URL);
  const mobile = testInfo.project.name === 'mobile';

  const m = await page.evaluate(() => {
    const box = (sel: string) => document.querySelector(sel)!.getBoundingClientRect();
    const panel = box('[data-testid="layer-panel"]');
    const variable = box('[data-testid="variable-panel"]');
    const list = box('[data-testid="layer-list"]');
    const rows = Array.from(document.querySelectorAll('[data-testid="variable-row"]')).map((r) => r.getBoundingClientRect());
    const inputs = Array.from(document.querySelectorAll('[data-testid="variable-color"]')).map((r) => r.getBoundingClientRect());
    const layer = document.querySelector('[data-testid="layer-panel"]') as HTMLElement;
    const vp = document.querySelector('[data-testid="variable-panel"]') as HTMLElement;
    return {
      panel,
      variable,
      list,
      rows,
      inputs,
      layerOverflow: layer.scrollWidth - layer.clientWidth,
      variableOverflow: vp.scrollWidth - vp.clientWidth,
      pageV: document.documentElement.scrollHeight - document.documentElement.clientHeight,
      vw: document.documentElement.clientWidth,
      vh: document.documentElement.clientHeight,
    };
  });
  expect(m.variable.top, '인스턴스 목록 아래').toBeGreaterThanOrEqual(m.list.bottom - 1);
  expect(m.variable.left).toBeGreaterThanOrEqual(m.panel.left - 1);
  expect(m.variable.right).toBeLessThanOrEqual(m.panel.right + 1);
  expect(m.layerOverflow, '레이어 창 가로 넘침 0').toBeLessThanOrEqual(0);
  expect(m.variableOverflow, '변수 구역 가로 넘침 0').toBeLessThanOrEqual(0);
  expect(await noHorizontalScroll(page)).toBe(true);
  expect(m.rows).toHaveLength(3);
  for (const r of m.rows) {
    expect(r.left).toBeGreaterThanOrEqual(0);
    expect(r.right).toBeLessThanOrEqual(m.vw + 0.5);
  }
  for (const r of m.inputs) {
    expect(r.width, '색 입력칸 터치 목표').toBeGreaterThanOrEqual(32);
    expect(r.height, '색 입력칸 터치 목표').toBeGreaterThanOrEqual(32);
  }
  if (mobile) {
    // 한 줄씩 위아래로 (줄끼리 안 겹침)
    expect(m.rows[1].top).toBeGreaterThanOrEqual(m.rows[0].bottom - 1);
    expect(m.rows[2].top).toBeGreaterThanOrEqual(m.rows[1].bottom - 1);
  } else {
    expect(m.panel.bottom, '레이어 창 아래 끝이 화면 아래 20px 안').toBeGreaterThanOrEqual(m.vh - 20 - 1);
    expect(m.panel.bottom).toBeLessThanOrEqual(m.vh + 1);
    expect(m.pageV, '페이지 세로 스크롤 없음').toBeLessThanOrEqual(0);
  }
});

test('A46 연결이 없는 채 Primary 값을 바꾸면 변수 줄만 바뀌고 캔버스 버튼 노드 · style 변경은 0이다 (VP-11)', async ({ page }) => {
  await page.goto(URL);
  const ids = ['main', 'b1', 'b2', 'b3'];
  const nodes = Object.fromEntries(ids.map((id) => [id, buttonSel(id)]));
  await holdNodes(page, nodes);
  const watchers = await Promise.all(ids.map((id) => watchSel(page, id, buttonSel(id))));
  await watchApp(page);

  await setVariable(page, 'Primary', '#f4b000');

  const rows = await variableRows(page);
  expect(rows[0]).toEqual({ id: 'primary', name: 'Primary', value: '#f4b000', hex: '#f4b000', chip: rgb('#f4b000') });
  expect(rows[1].value, 'Danger 그대로').toBe('#cf202f');
  expect(rows[2].value, 'Success 그대로').toBe('#05b169');
  expect(await colorsOf(page)).toEqual(ORIGINAL);
  for (const id of ids) {
    expect(await sameNode(page, id, buttonSel(id)), `${id} 노드 같은 참조`).toBe(true);
  }
  for (const w of watchers) expect((await w.take()).total, '캔버스 버튼 DOM 변경 0').toBe(0);
  expect(await bgOf(page, 'main')).toBe(rgb('#0052ff'));
});

// ---------------------------------------------------------------------------
// Dev-4: 연결 UI (속성 패널 색 구역의 「변수」 선택 상자)
// ---------------------------------------------------------------------------

const BLUE = '#0052ff';
const INK = rgb('#0a0b0d');
const WHITE = rgb('#ffffff');
const IDS = ['main', 'b1', 'b2', 'b3'];

/** 지금 aria-pressed="true"인 칩들의 색 */
function pressedChips(page: Page): Promise<string[]> {
  return page.locator('[data-testid="color-chip"][aria-pressed="true"]').evaluateAll((els) => els.map((el) => el.getAttribute('data-color') ?? ''));
}
const colorHex = (page: Page): Promise<string> => page.getByTestId('color-hex').evaluate((el) => el.textContent ?? '');

/** 메인을 골라 변수 상자에서 이름을 고른다 */
async function linkMain(page: Page, name: string): Promise<void> {
  await selectOnCanvas(page, 'main');
  await linkTo(page, name);
}

/** 캔버스 버튼 4개 · 레이어 행 4개 노드를 붙잡고 캔버스 버튼마다 변경 관찰기를 심는다 */
async function holdAll(page: Page) {
  const nodes: Record<string, string> = {};
  for (const id of IDS) {
    nodes[`btn-${id}`] = buttonSel(id);
    nodes[`layer-${id}`] = layerSel(id);
  }
  await holdNodes(page, nodes);
  const watchers: Record<string, Awaited<ReturnType<typeof watchSel>>> = {};
  for (const id of IDS) watchers[id] = await watchSel(page, `w-${id}`, buttonSel(id));
  return watchers;
}
async function expectSame(page: Page, ids: string[], where: string): Promise<void> {
  for (const id of ids) {
    expect(await sameNode(page, `btn-${id}`, buttonSel(id)), `${where}: ${id} 버튼 노드`).toBe(true);
    expect(await sameNode(page, `layer-${id}`, layerSel(id)), `${where}: ${id} 레이어 행 노드`).toBe(true);
  }
}

test('QA-64 메인 · 인스턴스를 고르면 색 구역에 「변수」 상자(없음 · Primary · Danger · Success)가 있고 처음 값은 「없음」, 칩은 지금 색 하나만 pressed', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');
  await expect(linkSelect(page)).toHaveCount(1);
  expect(await page.locator('[data-testid="prop-row"][data-field="color"] [data-testid="prop-variable"]').count()).toBe(1);
  expect(await linkSelect(page).locator('option').allTextContents()).toEqual(['없음', 'Primary', 'Danger', 'Success']);
  await expect(linkSelect(page)).toHaveValue('');
  expect(await pressedChips(page)).toEqual([BLUE]);

  await selectOnCanvas(page, 'b3');
  await expect(linkSelect(page)).toHaveCount(1);
  expect(await linkSelect(page).locator('option').allTextContents()).toEqual(['없음', 'Primary', 'Danger', 'Success']);
  await expect(linkSelect(page)).toHaveValue('');
  expect(await pressedChips(page)).toEqual(['#cf202f']);
});

test('QA-65 메인을 Primary에 연결 → 상자 Primary · 칩 pressed 0개 · 값 글자 「Primary」 · 색 입력칸 #0052ff, 버튼 색은 그대로(캔버스 변경 0)', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');
  const watchers = await holdAll(page);

  await linkTo(page, 'Primary');

  await expect(linkSelect(page)).toHaveValue('primary');
  expect(await page.locator('[data-testid="color-chip"][aria-pressed="false"]').count()).toBe(8);
  expect(await pressedChips(page)).toEqual([]);
  expect(await colorHex(page)).toBe('Primary');
  await expect(page.getByTestId('prop-color')).toHaveValue(BLUE);
  expect(await colorsOf(page)).toEqual([rgb(BLUE), rgb(BLUE), rgb(BLUE), rgb('#cf202f')]);
  await expectSame(page, IDS, '연결만');
  for (const id of IDS) expect((await watchers[id].take()).total, `${id} 캔버스 변경 0`).toBe(0);
});

test('QA-66 · A50 메인 Primary 연결 + b2 override #05b169 → Primary 값 #f4b000: 메인 · b1만 바뀌고(글자 먹) b2 · b3 · 레이어 행은 그대로, 나중에 추가한 b4도 메인을 따라 바뀐다', async ({ page }) => {
  await page.goto(URL);
  await linkMain(page, 'Primary');
  await selectOnCanvas(page, 'b2');
  await pickColor(page, '#05b169');
  const watchers = await holdAll(page);

  await setVariable(page, 'Primary', '#f4b000');

  expect(await colorsOf(page)).toEqual([rgb('#f4b000'), rgb('#f4b000'), rgb('#05b169'), rgb('#cf202f')]);
  expect(await textOf(page, 'main')).toBe(INK);
  expect(await textOf(page, 'b1')).toBe(INK);
  await expectSame(page, IDS, '값 변경');
  expect((await watchers.b2.take()).total, 'b2 style 변경 0').toBe(0);
  expect((await watchers.b3.take()).total, 'b3 style 변경 0').toBe(0);
  expect((await watchers.main.take()).attributes, '메인 style만').toBeGreaterThan(0);
  expect((await variableRows(page))[0]).toEqual({ id: 'primary', name: 'Primary', value: '#f4b000', hex: '#f4b000', chip: rgb('#f4b000') });
  // A50: 연결된 메인이 있을 때 추가한 인스턴스 b4는 메인을 따르므로 Primary를 따라 바뀐다
  await clickAdd(page);
  expect(await bgOf(page, 'b4')).toBe(rgb('#f4b000'));
  await setVariable(page, 'Primary', '#112233');
  expect(await bgOf(page, 'b4')).toBe(rgb('#112233'));
  expect(await textOf(page, 'b4')).toBe(WHITE);
  expect(await bgOf(page, 'b2')).toBe(rgb('#05b169'));
  expect(await bgOf(page, 'b3')).toBe(rgb('#cf202f'));
});

test('QA-67 · A54 b3를 Danger에 연결 → Danger 값 #05b169: b3만 바뀌고(글자 먹) 다른 버튼 · 변수 줄은 그대로, 선택 · 속성 패널 · 변수 입력칸 포커스가 유지된다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'b3');
  await linkTo(page, 'Danger');
  const watchers = await holdAll(page);
  const varInput = '[data-testid="variable-row"][data-id="danger"] [data-testid="variable-color"]';
  await holdNodes(page, { 'var-input': varInput, 'link-select': '[data-testid="prop-variable"]' });

  await setVariable(page, 'Danger', '#05b169');

  expect(await colorsOf(page)).toEqual([rgb(BLUE), rgb(BLUE), rgb(BLUE), rgb('#05b169')]);
  expect(await textOf(page, 'b3')).toBe(INK);
  await expectSame(page, IDS, 'b3만');
  for (const id of ['main', 'b1', 'b2']) expect((await watchers[id].take()).total, `${id} 변경 0`).toBe(0);
  expect((await variableRows(page)).map((r) => r.value)).toEqual([BLUE, '#05b169', '#05b169']);
  // A54: 선택은 b3 그대로, 속성 패널 색 입력칸이 푼 색을 따라가고 상자 · 이름 글자는 그대로, 변수 입력칸 포커스 유지
  expect(await selectedOnCanvas(page)).toEqual(['b3']);
  await expect(page.getByTestId('prop-color')).toHaveValue('#05b169');
  await expect(linkSelect(page)).toHaveValue('danger');
  expect(await colorHex(page)).toBe('Danger');
  expect(await sameNode(page, 'var-input', varInput)).toBe(true);
  expect(await sameNode(page, 'link-select', '[data-testid="prop-variable"]')).toBe(true);
  expect(await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))).toBe('variable-color');
});

test('QA-68 연결 중 같은 색 칩(#0052ff)을 눌러도 연결이 풀린다 — 상자 「없음」 · 칩 pressed · 값 글자 hex, 이후 Primary 값이 바뀌어도 안 따라간다', async ({ page }) => {
  await page.goto(URL);
  await linkMain(page, 'Primary');
  await pickColor(page, BLUE);
  await expect(linkSelect(page)).toHaveValue('');
  expect(await pressedChips(page)).toEqual([BLUE]);
  expect(await colorHex(page)).toBe(BLUE);
  await setVariable(page, 'Primary', '#f4b000');
  expect(await colorsOf(page)).toEqual([rgb(BLUE), rgb(BLUE), rgb(BLUE), rgb('#cf202f')]);
});

test('QA-69 연결 중 「색 직접 고르기」 입력칸으로 #112233을 고르면 연결이 풀리고(상자 없음) 메인 · b1 · b2가 #112233 · 흰 글자, 이후 Primary 값에 안 따라간다', async ({ page }) => {
  await page.goto(URL);
  await linkMain(page, 'Primary');
  await pickColorInput(page, '#112233');
  await expect(linkSelect(page)).toHaveValue('');
  expect(await colorsOf(page)).toEqual([rgb('#112233'), rgb('#112233'), rgb('#112233'), rgb('#cf202f')]);
  expect(await textOf(page, 'main')).toBe(WHITE);
  await setVariable(page, 'Primary', '#f4b000');
  expect(await colorsOf(page)).toEqual([rgb('#112233'), rgb('#112233'), rgb('#112233'), rgb('#cf202f')]);
});

test('QA-70 상자에서 「없음」을 고르면 지금 푼 색(#f4b000)을 그대로 두고 연결만 풀린다 — 값 글자 hex · 칩 #f4b000(팔레트 4번째)만 pressed, 이후 Primary 값이 바뀌어도 그대로', async ({ page }) => {
  await page.goto(URL);
  await linkMain(page, 'Primary');
  await setVariable(page, 'Primary', '#f4b000');
  await linkTo(page, '없음');
  await expect(linkSelect(page)).toHaveValue('');
  expect(await colorsOf(page)).toEqual([rgb('#f4b000'), rgb('#f4b000'), rgb('#f4b000'), rgb('#cf202f')]);
  expect(await textOf(page, 'main')).toBe(INK);
  expect(await colorHex(page)).toBe('#f4b000');
  expect(await pressedChips(page)).toEqual(['#f4b000']);
  await setVariable(page, 'Primary', BLUE);
  expect(await colorsOf(page)).toEqual([rgb('#f4b000'), rgb('#f4b000'), rgb('#f4b000'), rgb('#cf202f')]);
});

test('QA-71 · A49 b3 Danger 연결(override) + 메인 Primary: 순서 · 추가 · 삭제 뒤에도 b3 연결 유지(새 b4는 메인을 따름), b3 ↻ → 메인을 따름(푼 Primary · 이름 Primary · ↻ 사라짐)', async ({ page }) => {
  await page.goto(URL);
  await linkMain(page, 'Primary');
  await selectOnCanvas(page, 'b3');
  await linkTo(page, 'Danger');
  expect(await overriddenFields(page)).toEqual(['label', 'color']);
  // A49: ① 순서 바꾸기 ② 추가 ③ b1 삭제 ④ Danger 값 변경 — b3 연결 유지
  await moveInLayer(page, 'b3', 'up');
  expect(await canvasOrder(page)).toEqual(['b1', 'b3', 'b2']);
  await clickAdd(page);
  await selectInLayer(page, 'b1');
  await page.getByTestId('delete-instance').click();
  expect(await canvasOrder(page)).toEqual(['b3', 'b2', 'b4']);
  await setVariable(page, 'Danger', '#112233');
  expect(await bgOf(page, 'b3')).toBe(rgb('#112233'));
  expect(await bgOf(page, 'b4'), 'b4는 메인을 따르므로 Danger에 안 바뀜').toBe(rgb(BLUE));
  await setVariable(page, 'Danger', '#cf202f');

  // ↻
  await selectOnCanvas(page, 'b3');
  await expect(linkSelect(page)).toHaveValue('danger');
  await page.locator(inRow('color', 'prop-reset')).click();
  expect(await bgOf(page, 'b3')).toBe(rgb(BLUE));
  expect(await colorHex(page)).toBe('Primary');
  await expect(linkSelect(page)).toHaveValue('primary');
  expect(await overriddenFields(page)).toEqual(['label']);
  await setVariable(page, 'Primary', '#f4b000');
  expect(await bgOf(page, 'b3')).toBe(rgb('#f4b000'));
});

test('A43 · A44 메인 Primary 연결 중 입력칸에 input 6번 연타 → 마지막 값만 남고 입력칸 노드 같은 참조, 같은 값을 다시 넣으면 DOM 변경 0', async ({ page }) => {
  await page.goto(URL);
  await linkMain(page, 'Primary');
  const varInput = '[data-testid="variable-row"][data-id="primary"] [data-testid="variable-color"]';
  await holdNodes(page, { 'var-input': varInput });

  for (const hex of ['#111111', '#222222', '#333333', '#444444', '#555555', '#f4b000']) await setVariable(page, 'Primary', hex);

  expect(await colorsOf(page)).toEqual([rgb('#f4b000'), rgb('#f4b000'), rgb('#f4b000'), rgb('#cf202f')]);
  expect((await variableRows(page))[0]).toEqual({ id: 'primary', name: 'Primary', value: '#f4b000', hex: '#f4b000', chip: rgb('#f4b000') });
  await expect(page.getByTestId('prop-color')).toHaveValue('#f4b000');
  expect(await sameNode(page, 'var-input', varInput)).toBe(true);

  // A44: 같은 값을 다시 input → 렌더 0번 = DOM 변경 0
  const mut = await watchApp(page);
  await setVariable(page, 'Primary', '#f4b000');
  expect((await mut.take()).body.total).toBe(0);
});

test('A47 · A48 변수 상자를 Primary ↔ 없음으로 20번 번갈아 고르면 끝 상태가 마지막 선택과 같고 상자 노드가 그대로이며, 같은 Primary를 다시 고르면 DOM 변경 0', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');
  await holdNodes(page, { 'link-select': '[data-testid="prop-variable"]' });
  for (let i = 0; i < 20; i++) await linkTo(page, i % 2 === 0 ? 'Primary' : '없음');
  // 20번째(i = 19)는 「없음」
  await expect(linkSelect(page)).toHaveValue('');
  expect(await colorHex(page)).toBe(BLUE);
  expect(await pressedChips(page)).toEqual([BLUE]);
  await linkTo(page, 'Primary');
  await expect(linkSelect(page)).toHaveValue('primary');
  expect(await colorHex(page)).toBe('Primary');
  expect(await pressedChips(page)).toEqual([]);
  expect(await sameNode(page, 'link-select', '[data-testid="prop-variable"]')).toBe(true);

  const mut = await watchApp(page);
  await linkTo(page, 'Primary');
  expect((await mut.take()).body.total).toBe(0);
});

test('A51 연결된 버튼의 글자색은 푼 색 기준이다 — #eef0f3 먹 · #0a0b0d 흰 · #777777 흰 · #787878 먹', async ({ page }) => {
  await page.goto(URL);
  await linkMain(page, 'Primary');
  const table: [string, string][] = [
    ['#eef0f3', INK],
    ['#0a0b0d', WHITE],
    ['#777777', WHITE],
    ['#787878', INK],
  ];
  for (const [hex, text] of table) {
    await setVariable(page, 'Primary', hex);
    expect(await bgOf(page, 'main'), hex).toBe(rgb(hex));
    expect(await textOf(page, 'main'), `${hex} 글자색`).toBe(text);
    expect(await textOf(page, 'b1'), `${hex} b1 글자색`).toBe(text);
  }
});

test('A58 연결 상태에서 속성 패널 · 레이어 창 · 변수 구역이 가로로 안 넘치고 상자 · 입력칸 터치 목표가 32px 이상이다', async ({ page }) => {
  await page.goto(URL);
  await linkMain(page, 'Primary');
  const m = await page.evaluate(() => {
    const over = (id: string) => {
      const el = document.querySelector(`[data-testid="${id}"]`) as HTMLElement;
      return el.scrollWidth - el.clientWidth;
    };
    const rect = (sel: string) => document.querySelector(sel)!.getBoundingClientRect();
    const sel = rect('[data-testid="prop-variable"]');
    const panel = rect('[data-testid="property-panel"]');
    return {
      overs: [over('property-panel'), over('layer-panel'), over('variable-panel')],
      selHeight: sel.height,
      selInside: sel.left >= panel.left - 1 && sel.right <= panel.right + 1,
      inputH: rect('[data-testid="prop-color"]').height,
      varInputH: rect('[data-testid="variable-color"]').height,
    };
  });
  for (const o of m.overs) expect(o, '가로 넘침').toBeLessThanOrEqual(0);
  expect(await noHorizontalScroll(page)).toBe(true);
  expect(m.selInside, '변수 상자가 속성 패널 안').toBe(true);
  expect(m.selHeight).toBeGreaterThanOrEqual(32);
  expect(m.inputH).toBeGreaterThanOrEqual(32);
  expect(m.varInputH).toBeGreaterThanOrEqual(32);
});
