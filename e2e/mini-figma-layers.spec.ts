import {
  test,
  expect,
  URL,
  holdNodes,
  sameNode,
  isStillConnected,
  watchApp,
  selectOnCanvas,
  canvasOrder,
  layerOrder,
  selectedOnCanvas,
  selectedInLayer,
  buttonSel,
  layerSel,
  followingFields,
  overriddenFields,
} from './mini-figma-helpers';

// [AI Note]: QA-14 ~ QA-16 (인스턴스 추가 · 삭제 · 메인 삭제 불가, Dev-9). 순서 바꾸기(QA-17 · 18)는 Dev-10에서 이 파일에 더한다.
// 이 스펙의 테스트는 desktop · mobile 두 프로젝트에서 모두 돈다. 「바뀐 곳만 고침」은 같은 DOM 노드(holdNodes · sameNode) +
// MutationObserver(watchApp)로 확인한다 (화면에 patch를 안 그리므로, patch 종류 · 개수는 app.test.ts가 센다).

test('QA-14 [+ 인스턴스]를 누르면 캔버스 · 레이어 끝에 b4가 override 없이 생기고, 기존 노드는 같은 참조이며 선택은 안 바뀐다', async ({ page }) => {
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

  await page.getByTestId('add-instance').click();

  // 캔버스 · 레이어 모두 끝에 b4
  expect(await canvasOrder(page)).toEqual(['b1', 'b2', 'b3', 'b4']);
  expect(await layerOrder(page)).toEqual(['b1', 'b2', 'b3', 'b4']);
  // b4는 override 없음: 글자 `확인` · 크기 L (메인 따름)
  expect(await page.locator(`${buttonSel('b4')} [data-testid="btn-label"]`).textContent()).toBe('확인');
  expect(((await page.locator(buttonSel('b4')).getAttribute('class')) ?? '').split(' ')).toContain('btn-L');
  // 기존 노드는 모두 같은 참조
  for (const id of ['main', 'b1', 'b2', 'b3']) expect(await sameNode(page, `btn-${id}`, buttonSel(id)), `${id} 버튼`).toBe(true);
  for (const id of ['b1', 'b2', 'b3']) expect(await sameNode(page, `row-${id}`, layerSel(id)), `${id} 행`).toBe(true);
  // 캔버스 · 레이어 DOM 변경은 각각 childList 1건(추가)뿐
  const canvasMut = (await canvasWatch.take()).body;
  const layerMut = (await layerWatch.take()).body;
  expect(canvasMut.childList, '캔버스 childList').toBe(1);
  expect(canvasMut.total, '캔버스 전체 변경').toBe(1);
  expect(layerMut.childList, '레이어 childList').toBe(1);
  expect(layerMut.total, '레이어 전체 변경').toBe(1);
  // 선택은 안 바뀜 (메인이 계속 골라져 있음)
  expect(await selectedOnCanvas(page)).toEqual(['main']);
  expect(await selectedInLayer(page)).toEqual(['main']);
  // b4를 고르면 속성 패널 5칸이 모두 「메인 따름」
  await selectOnCanvas(page, 'b4');
  expect(await followingFields(page)).toEqual(['label', 'size', 'hasIcon', 'icon', 'color']);
  expect(await overriddenFields(page)).toEqual([]);
});

test('QA-15 b2를 고르고 [삭제]하면 캔버스 · 레이어에서 사라지고 선택이 풀리며, 이어서 추가하면 b4다 (지운 b2를 다시 쓰지 않음)', async ({ page }) => {
  await page.goto(URL);
  await holdNodes(page, {
    btn1: buttonSel('b1'),
    btn3: buttonSel('b3'),
    row1: layerSel('b1'),
    row3: layerSel('b3'),
    btn2: buttonSel('b2'),
    row2: layerSel('b2'),
  });
  await selectOnCanvas(page, 'b2');
  const canvasWatch = await watchApp(page, 'canvas');
  const layerWatch = await watchApp(page, 'layer-panel');

  await page.getByTestId('delete-instance').click();

  // b2가 두 곳 모두에서 사라짐, b1 · b3는 같은 참조
  expect(await canvasOrder(page)).toEqual(['b1', 'b3']);
  expect(await layerOrder(page)).toEqual(['b1', 'b3']);
  expect(await isStillConnected(page, 'btn2')).toBe(false);
  expect(await isStillConnected(page, 'row2')).toBe(false);
  for (const [name, sel] of [['btn1', buttonSel('b1')], ['btn3', buttonSel('b3')], ['row1', layerSel('b1')], ['row3', layerSel('b3')]] as const) {
    expect(await sameNode(page, name, sel), name).toBe(true);
  }
  expect((await canvasWatch.take()).body.childList, '캔버스 childList').toBe(1);
  expect((await layerWatch.take()).body.childList, '레이어 childList').toBe(1);
  // 선택이 풀리고 속성 패널은 빈 상태
  await expect(page.getByTestId('property-empty')).toHaveCount(1);
  await expect(page.getByTestId('property-title')).toHaveCount(0);
  await expect(page.getByTestId('delete-instance')).toHaveCount(0);
  expect(await selectedOnCanvas(page)).toEqual([]);
  expect(await selectedInLayer(page)).toEqual([]);

  // 이어서 추가: 번호를 다시 쓰지 않고 b4
  await page.getByTestId('add-instance').click();
  expect(await canvasOrder(page)).toEqual(['b1', 'b3', 'b4']);
  expect(await layerOrder(page)).toEqual(['b1', 'b3', 'b4']);
});

test('QA-16 메인에는 [삭제] 버튼이 없고 Delete · Backspace를 눌러도 아무 일 없다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');
  await expect(page.getByTestId('delete-instance')).toHaveCount(0);
  await expect(page.getByTestId('property-title')).toHaveText('메인 Button');
  const watch = await watchApp(page);

  await page.keyboard.press('Delete');
  await page.keyboard.press('Backspace');

  await expect(page.getByTestId('figma-button')).toHaveCount(4);
  await expect(page.getByTestId('layer-item')).toHaveCount(3);
  expect(await selectedOnCanvas(page)).toEqual(['main']);
  expect(await selectedInLayer(page)).toEqual(['main']);
  await expect(page.getByTestId('delete-instance')).toHaveCount(0);
  expect((await watch.take()).body.total, 'DOM 변경').toBe(0);
});
