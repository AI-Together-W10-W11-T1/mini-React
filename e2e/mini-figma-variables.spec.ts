import {
  test,
  expect,
  URL,
  holdNodes,
  sameNode,
  watchApp,
  watchSel,
  buttonSel,
  colorsOf,
  rgb,
  bgOf,
  variableRows,
  setVariable,
  noHorizontalScroll,
} from './mini-figma-helpers';

// [AI Note]: 색 변수 Variables (task_007). QA-63 · 76 · A46 (Dev-3: 변수 구역) — 이 스펙의 테스트는 desktop · mobile 두 프로젝트에서 모두 돈다.
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
