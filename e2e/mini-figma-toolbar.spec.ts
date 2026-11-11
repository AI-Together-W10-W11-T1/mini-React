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
  pressUndo,
  pressRedo,
  colorsOf,
  rgb,
  bgOf,
  classOf,
} from './mini-figma-helpers';

// [AI Note]: QA-31 · QA-34 (도구 막대 구성 · [+ 인스턴스] 자리 이동) · QA-32 · 33 · A20 · A21 (Undo/Redo 버튼: 키와 같은 기록 · 없으면 꺼짐).
// 이 스펙의 테스트는 desktop · mobile 두 프로젝트에서 모두 돈다.

const undoBtn = (page: Page) => page.getByTestId('undo-button');
const redoBtn = (page: Page) => page.getByTestId('redo-button');

test('QA-31 도구 막대가 영역 최상위 첫 자식이고 안에 앱 이름 · [+ 인스턴스] · [↶ 되돌리기] · [↷ 다시 하기] · [Patch]가 그 순서로 있다. [↶] [↷]는 꺼져 있고 레이어 창 안에는 add-instance가 없다', async ({ page }) => {
  await page.goto(URL);

  // 최상위 <div class="app">의 첫 자식 = toolbar
  const kids = await page.locator('[data-testid="app-root"] > .app').evaluate((app) => Array.from(app.children).map((c) => c.getAttribute('data-testid')));
  expect(kids[0]).toBe('toolbar');
  // 도구 막대 안 자식 순서: 앱 이름 → [+ 인스턴스] → [↶] → [↷] → [Patch] (patch-preview PP-07 변경: [Patch]가 [↷] 바로 오른쪽)
  const inside = await page.getByTestId('toolbar').evaluate((el) => Array.from(el.children).map((c) => c.getAttribute('data-testid')));
  expect(inside).toEqual(['app-name', 'add-instance', 'undo-button', 'redo-button', 'patch-button']);
  await expect(page.getByTestId('app-name')).toHaveText('mini-figma');
  await expect(page.getByTestId('toolbar').getByTestId('add-instance')).toBeEnabled();
  await expect(undoBtn(page)).toHaveText('↶ 되돌리기');
  await expect(redoBtn(page)).toHaveText('↷ 다시 하기');
  await expect(undoBtn(page)).toBeDisabled();
  await expect(redoBtn(page)).toBeDisabled();
  // add-instance는 한 곳(도구 막대)에만 있다 — 레이어 창에는 없다
  await expect(page.getByTestId('add-instance')).toHaveCount(1);
  await expect(page.getByTestId('layer-panel').getByTestId('add-instance')).toHaveCount(0);
});

test('QA-32 색 칩을 누르면 [↶]이 켜지고, [↶] → [↷] 버튼으로 되돌리고 다시 한다 (고르기 그대로 · 버튼 노드 같은 참조)', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');
  await holdNodes(page, Object.fromEntries(['main', 'b1', 'b2', 'b3'].map((id) => [id, buttonSel(id)])));
  await expect(undoBtn(page)).toBeDisabled();
  await expect(redoBtn(page)).toBeDisabled();

  await pickColor(page, '#cf202f');
  await expect(undoBtn(page)).toBeEnabled();
  await expect(redoBtn(page)).toBeDisabled();
  expect((await colorsOf(page)).slice(0, 3)).toEqual([rgb('#cf202f'), rgb('#cf202f'), rgb('#cf202f')]);

  await undoBtn(page).click();
  expect((await colorsOf(page)).slice(0, 3), '[↶] → 시작 색').toEqual([rgb('#0052ff'), rgb('#0052ff'), rgb('#0052ff')]);
  await expect(undoBtn(page)).toBeDisabled();
  await expect(redoBtn(page)).toBeEnabled();
  expect(await selectedOnCanvas(page)).toEqual(['main']);

  await redoBtn(page).click();
  expect((await colorsOf(page)).slice(0, 3), '[↷] → 다시 빨강').toEqual([rgb('#cf202f'), rgb('#cf202f'), rgb('#cf202f')]);
  await expect(undoBtn(page)).toBeEnabled();
  await expect(redoBtn(page)).toBeDisabled();
  expect(await selectedOnCanvas(page)).toEqual(['main']);
  for (const id of ['main', 'b1', 'b2', 'b3']) expect(await sameNode(page, id, buttonSel(id)), `${id} 버튼`).toBe(true);
});

test('QA-33 [↶]과 키가 같은 기록 하나를 쓴다: 추가 · 라벨 · 크기를 쌓고 [↶] 2번, Ctrl+Shift+Z 1번, [↶] 2번 — b4가 사라지며 선택이 풀리고 [↶] 꺼짐 · [↷] 켜짐', async ({ page }) => {
  await page.goto(URL);
  await page.getByTestId('add-instance').click(); // 1단계: 추가 (b4)
  await selectOnCanvas(page, 'main');
  await page.getByTestId('prop-label').fill('새'); // 2단계: 라벨
  await page.getByTestId('prop-size').selectOption('L'); // 3단계: 크기
  await selectOnCanvas(page, 'b4'); // 고르기는 기록 밖
  expect(await canvasLabels(page)).toEqual(['새', '새', '취소', '삭제', '새']);

  // [↶] 2번: 크기 · 라벨이 돌아간다
  await undoBtn(page).click();
  expect((await classOf(page, 'main')).split(' '), '크기 M으로').toContain('btn-M');
  await undoBtn(page).click();
  expect(await canvasLabels(page)).toEqual(['버튼', '버튼', '취소', '삭제', '버튼']);
  expect(await selectedOnCanvas(page), '고르기는 그대로 b4').toEqual(['b4']);

  // 키 Ctrl+Shift+Z 1번: 라벨 `새` 다시 (같은 기록)
  await pressRedo(page);
  expect(await canvasLabels(page)).toEqual(['새', '새', '취소', '삭제', '새']);

  // [↶] 2번: 라벨 · 추가까지 → b4가 사라지고 선택이 풀린다 (MF-32)
  await undoBtn(page).click();
  await undoBtn(page).click();
  expect(await canvasOrder(page)).toEqual(['b1', 'b2', 'b3']);
  await expect(page.getByTestId('property-empty')).toHaveCount(1);
  expect(await selectedOnCanvas(page)).toEqual([]);
  await expect(undoBtn(page)).toBeDisabled();
  await expect(redoBtn(page)).toBeEnabled();
});

test('QA-34 도구 막대의 [+ 인스턴스]를 누르면 캔버스 · 레이어 끝에 b4가 override 없이 생기고, 기존 노드는 같은 참조이며 선택은 그대로다. 눌린 뒤 [↶]이 켜진다', async ({ page }) => {
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
  await expect(undoBtn(page)).toBeEnabled();
});

test('QA-A20 Undo 버튼 연타: 서로 다른 칸 3단계를 쌓고 [↶]을 7번, 이어서 [↷]을 7번 누른다 — 한 번에 한 단계, 끝에서 멈추고 4 ~ 7번째는 DOM 변경 0', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');
  await page.getByTestId('prop-label').fill('가');
  await page.getByTestId('prop-size').selectOption('L');
  await pickColor(page, '#cf202f');
  const snap = async (): Promise<string> => `${(await canvasLabels(page))[0]}|${(await classOf(page, 'main')).split(' ').includes('btn-L') ? 'L' : 'M'}|${await bgOf(page, 'main')}`;
  const top = await snap();
  const down = ['가|L|' + rgb('#0052ff') /* 색 */, '가|M|' + rgb('#0052ff') /* 크기 */, '버튼|M|' + rgb('#0052ff') /* 라벨 */];
  const up = ['가|M|' + rgb('#0052ff'), '가|L|' + rgb('#0052ff'), '가|L|' + rgb('#cf202f')];
  expect(top).toBe(up[2]);

  for (let i = 1; i <= 7; i += 1) {
    const watch = await watchApp(page);
    await undoBtn(page).click({ force: i > 3 });
    const now = await snap();
    if (i <= 3) {
      expect(now, `[↶] ${i}번째 = 한 단계`).toBe(down[i - 1]);
    } else {
      expect(now, `[↶] ${i}번째 = 첫 모습에서 멈춤`).toBe(down[2]);
      expect((await watch.take()).body.total, `[↶] ${i}번째 DOM 변경`).toBe(0);
    }
    if (i === 3) await expect(undoBtn(page)).toBeDisabled();
  }
  await expect(redoBtn(page)).toBeEnabled();

  for (let i = 1; i <= 7; i += 1) {
    const watch = await watchApp(page);
    await redoBtn(page).click({ force: i > 3 });
    const now = await snap();
    if (i <= 3) {
      expect(now, `[↷] ${i}번째 = 한 단계`).toBe(up[i - 1]);
    } else {
      expect(now, `[↷] ${i}번째 = 마지막 모습에서 멈춤`).toBe(up[2]);
      expect((await watch.take()).body.total, `[↷] ${i}번째 DOM 변경`).toBe(0);
    }
    if (i === 3) await expect(redoBtn(page)).toBeDisabled();
  }
  await expect(undoBtn(page)).toBeEnabled();
});

test('QA-A20 (라벨 입력 중) 첫 글자로 [↶]이 켜져도 라벨 입력칸은 같은 노드이고 포커스 · 커서가 유지된다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');
  await expect(undoBtn(page)).toBeDisabled();
  await holdNodes(page, { labelInput: '[data-testid="prop-label"]', undo: '[data-testid="undo-button"]' });
  const input = page.getByTestId('prop-label');
  await input.focus();
  await page.keyboard.press('End');

  await input.pressSequentially('!');

  await expect(undoBtn(page)).toBeEnabled();
  expect(await sameNode(page, 'labelInput', '[data-testid="prop-label"]')).toBe(true);
  expect(await sameNode(page, 'undo', '[data-testid="undo-button"]'), '[↶] 노드도 같은 참조 (disabled 속성만 바뀜)').toBe(true);
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('버튼!');
  await input.pressSequentially('?');
  await expect(input).toHaveValue('버튼!?');
  expect(await input.evaluate((el) => (el as HTMLInputElement).selectionStart === (el as HTMLInputElement).value.length)).toBe(true);
});

test('QA-A21 꺼진 버튼 누르기: 처음 화면의 [↶] [↷] · Undo 뒤 꺼진 [↶]을 click({ force: true })로 눌러도 아무 일 없고(DOM 변경 0 · 오류 없음), Ctrl+Z도 같다', async ({ page }) => {
  await page.goto(URL);
  const watch = await watchApp(page);

  await undoBtn(page).click({ force: true });
  await redoBtn(page).click({ force: true });
  await pressUndo(page);
  await pressRedo(page);
  expect((await watch.take()).body.total, '처음 화면 DOM 변경').toBe(0);
  expect(await canvasLabels(page)).toEqual(['버튼', '버튼', '취소', '삭제']);
  await expect(page.getByTestId('property-empty')).toHaveCount(1);

  // 한 단계 쌓고 [↶]로 되돌린 뒤 꺼진 [↶]을 다시 누른다
  await selectOnCanvas(page, 'main');
  await page.getByTestId('prop-label').fill('고침');
  await undoBtn(page).click();
  expect((await canvasLabels(page))[0]).toBe('버튼');
  await expect(undoBtn(page)).toBeDisabled();
  const watch2 = await watchApp(page);
  await undoBtn(page).click({ force: true });
  await pressUndo(page);
  expect((await watch2.take()).body.total, 'Undo 뒤 DOM 변경').toBe(0);
  expect((await canvasLabels(page))[0]).toBe('버튼');
  expect(await selectedOnCanvas(page)).toEqual(['main']);
});
