import type { Page } from '@playwright/test';
import {
  test,
  expect,
  URL,
  holdNodes,
  sameNode,
  watchApp,
  selectOnCanvas,
  canvasOrder,
  layerOrder,
  selectedOnCanvas,
  selectedInLayer,
  buttonSel,
  layerSel,
  canvasLabels,
  pickColor,
  colorsOf,
  rgb,
  bgOf,
  classOf,
  noHorizontalScroll,
} from './mini-figma-helpers';

// [AI Note]: QA-31 · QA-34 (도구 막대 구성 · [+ 인스턴스] 자리 이동) · (task_006에서 Undo/Redo 버튼 · QA-32 · 33 · A20 · A21은 없앴다. [실행 취소] [다시 실행]는 mini-figma-preview.spec.ts).
// 이 스펙의 테스트는 desktop · mobile 두 프로젝트에서 모두 돈다.

const backBtn = (page: Page) => page.getByTestId('back-button');
const forwardBtn = (page: Page) => page.getByTestId('forward-button');

test('QA-31 도구 막대가 영역 최상위 첫 자식이고 안에 앱 이름 · [+ 인스턴스] · [실행 취소] · [다시 실행] · [Patch]가 그 순서로 있다. [실행 취소] [다시 실행]는 꺼져 있고 [Patch]는 켜져 있으며 [↶] [↷]는 없다', async ({ page }) => {
  await page.goto(URL);

  // 최상위 <div class="app">의 첫 자식 = toolbar
  const kids = await page.locator('[data-testid="app-root"] > .app').evaluate((app) => Array.from(app.children).map((c) => c.getAttribute('data-testid')));
  expect(kids[0]).toBe('toolbar');
  // 도구 막대 안 자식 순서 (patch-preview PP-07 변경): 앱 이름 → [+ 인스턴스] → [실행 취소] → [다시 실행] → [Patch]
  const inside = await page.getByTestId('toolbar').evaluate((el) => Array.from(el.children).map((c) => c.getAttribute('data-testid')));
  expect(inside).toEqual(['app-name', 'add-instance', 'back-button', 'forward-button', 'patch-button']);
  await expect(page.getByTestId('app-name')).toHaveText('Mini-Figma');
  await expect(page.getByTestId('toolbar').getByTestId('add-instance')).toBeEnabled();
  await expect(backBtn(page)).toHaveText('실행 취소');
  await expect(forwardBtn(page)).toHaveText('다시 실행');
  await expect(page.getByTestId('patch-button')).toHaveText('Patch');
  await expect(backBtn(page)).toBeDisabled();
  await expect(forwardBtn(page)).toBeDisabled();
  await expect(page.getByTestId('patch-button')).toBeEnabled();
  // Undo 버튼은 없앴다 (앱 편집 Undo 제거)
  await expect(page.getByTestId('undo-button')).toHaveCount(0);
  await expect(page.getByTestId('redo-button')).toHaveCount(0);
  // add-instance는 한 곳(도구 막대)에만 있다 — 레이어 창에는 없다
  await expect(page.getByTestId('add-instance')).toHaveCount(1);
  await expect(page.getByTestId('layer-panel').getByTestId('add-instance')).toHaveCount(0);
  expect(await noHorizontalScroll(page)).toBe(true);
});

test('QA-34 도구 막대의 [+ 인스턴스]를 누르면 캔버스 · 레이어 끝에 b4가 override 없이 생기고, 기존 노드는 같은 참조이며 선택은 그대로다. ', async ({ page }) => {
  await page.goto(URL);
  // 메인을 `확인` / 크기 L로 바꿔 둔다 (새 인스턴스가 이 메인 값을 따르는지 보려고)
  await selectOnCanvas(page, 'main');
  await page.getByTestId('prop-label').fill('확인');
  await page.getByTestId('prop-size').selectOption('L');
  await holdNodes(page, {
    ...Object.fromEntries(['main', 'b1', 'b2', 'b3'].map((id) => [`btn-${id}`, buttonSel(id)])),
    ...Object.fromEntries(['b1', 'b2', 'b3'].map((id) => [`row-${id}`, layerSel(id)])),
  });
  const canvasWatch = await watchApp(page, 'canvas');
  const layerWatch = await watchApp(page, 'layer-panel');

  await page.getByTestId('toolbar').getByTestId('add-instance').click();

  expect(await canvasOrder(page)).toEqual(['b1', 'b2', 'b3', 'b4']);
  expect(await layerOrder(page)).toEqual(['b1', 'b2', 'b3', 'b4']);
  expect(await page.locator(`${buttonSel('b4')} [data-testid="btn-label"]`).textContent()).toBe('확인');
  expect((await classOf(page, 'b4')).split(' ')).toContain('btn-L');
  for (const id of ['main', 'b1', 'b2', 'b3']) expect(await sameNode(page, `btn-${id}`, buttonSel(id)), `${id} 버튼`).toBe(true);
  for (const id of ['b1', 'b2', 'b3']) expect(await sameNode(page, `row-${id}`, layerSel(id)), `${id} 행`).toBe(true);
  // 캔버스 · 레이어 DOM 변경은 각각 childList 1건(추가)뿐 (QA-14와 같음)
  const canvasMut = (await canvasWatch.take()).body;
  const layerMut = (await layerWatch.take()).body;
  expect(canvasMut.childList, '캔버스 childList').toBe(1);
  expect(canvasMut.total, '캔버스 전체 변경').toBe(1);
  expect(layerMut.childList, '레이어 childList').toBe(1);
  expect(layerMut.total, '레이어 전체 변경').toBe(1);
  expect(await selectedOnCanvas(page)).toEqual(['main']);
  expect(await selectedInLayer(page)).toEqual(['main']);
});

