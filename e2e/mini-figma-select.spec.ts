import { test, expect, URL, holdNodes, sameNode, isStillConnected, titleText, selectOnCanvas, selectInLayer, selectedOnCanvas, selectedInLayer, buttonSel } from './mini-figma-helpers';

// [AI Note]: QA-3 · QA-4 (고르기). 이 스펙의 테스트는 desktop · mobile 두 프로젝트에서 모두 돈다.

test('QA-3 캔버스에서 b2를 누르면 머리가 「인스턴스 · 취소」, b2에만 selected가 붙고 빈 안내 <p>는 교체된다(D-05). b3를 누르면 표시가 옮겨 간다', async ({ page }) => {
  await page.goto(URL);
  await holdNodes(page, {
    empty: '[data-testid="property-empty"]',
    b1: buttonSel('b1'),
    b2: buttonSel('b2'),
    b3: buttonSel('b3'),
    main: buttonSel('main'),
  });

  await selectOnCanvas(page, 'b2');

  await expect(page.getByTestId('property-title')).toHaveText('인스턴스 · 취소');
  expect(await page.getByTestId('property-title').evaluate((el) => el.localName)).toBe('h2');
  expect(await selectedOnCanvas(page)).toEqual(['b2']);
  expect(await selectedInLayer(page)).toEqual(['b2']);
  // D-05 교체: 같은 자리의 <p>가 <h2>로 달라져 빈 안내 노드는 분리됨
  expect(await isStillConnected(page, 'empty')).toBe(false);
  await expect(page.getByTestId('property-empty')).toHaveCount(0);
  // 캔버스 버튼 노드는 모두 같은 참조 (b2에 클래스만 붙음)
  for (const id of ['main', 'b1', 'b2', 'b3']) expect(await sameNode(page, id, buttonSel(id))).toBe(true);

  await selectOnCanvas(page, 'b3');

  expect(await titleText(page)).toBe('인스턴스 · 삭제');
  expect(await selectedOnCanvas(page)).toEqual(['b3']);
  expect(await selectedInLayer(page)).toEqual(['b3']);
  await expect(page.locator(`${buttonSel('b2')}.selected`)).toHaveCount(0);
  for (const id of ['main', 'b1', 'b2', 'b3']) expect(await sameNode(page, id, buttonSel(id))).toBe(true);
});

test('QA-4 레이어에서 b3 → 메인 행, 이어서 캔버스 메인 버튼을 누르면 머리가 「인스턴스 · 삭제」 → 「메인 Button」 → 「메인 Button」이고 고른 표시가 같은 대상에 붙는다', async ({ page }) => {
  await page.goto(URL);

  // 레이어에서 b3 → 캔버스에도 표시
  await selectInLayer(page, 'b3');
  expect(await titleText(page)).toBe('인스턴스 · 삭제');
  expect(await selectedInLayer(page)).toEqual(['b3']);
  expect(await selectedOnCanvas(page)).toEqual(['b3']);

  // 레이어의 메인 행
  await selectInLayer(page, 'main');
  expect(await titleText(page)).toBe('메인 Button');
  expect(await selectedInLayer(page)).toEqual(['main']);
  expect(await selectedOnCanvas(page)).toEqual(['main']);

  // 캔버스의 메인 버튼 (이미 골라진 것을 다시 눌러도 그대로)
  await selectOnCanvas(page, 'main');
  expect(await titleText(page)).toBe('메인 Button');
  expect(await selectedInLayer(page)).toEqual(['main']);
  expect(await selectedOnCanvas(page)).toEqual(['main']);

  // 캔버스에서 고르면 레이어에 표시
  await selectOnCanvas(page, 'b1');
  expect(await titleText(page)).toBe('인스턴스 · 버튼');
  expect(await selectedInLayer(page)).toEqual(['b1']);
  expect(await selectedOnCanvas(page)).toEqual(['b1']);
});
