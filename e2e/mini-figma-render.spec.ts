import { test, expect, URL, expectNoConsoleWarnings, noHorizontalScroll, canvasLabels, layerOrder, rgb, colorsOf, textOf } from './mini-figma-helpers';

// [AI Note]: QA-1(시작 화면) · QA-2(세 영역 배치). 이 스펙의 테스트는 desktop · mobile 두 프로젝트에서 모두 돈다.

test('QA-1 처음 연다: 레이어 행 · 캔버스 버튼 · 글자 · 색 · 빈 속성 패널 · patch 표시 없음', async ({ page }) => {
  await page.goto(URL);

  // 레이어 창: 메인 행 + b1 b2 b3
  await expect(page.getByTestId('layer-main')).toHaveCount(1);
  expect(await layerOrder(page)).toEqual(['b1', 'b2', 'b3']);

  // 캔버스: 메인 버튼 1개 + 인스턴스 버튼 3개
  await expect(page.getByTestId('canvas-main').getByTestId('figma-button')).toHaveCount(1);
  await expect(page.getByTestId('canvas-instances').getByTestId('figma-button')).toHaveCount(3);
  expect(await canvasLabels(page)).toEqual(['버튼', '버튼', '취소', '삭제']);

  // 크기는 모두 M(클래스), 색은 값으로 칠한다(style): 배경 메인 · b1 · b2 = #0052ff, b3 = #cf202f, 글자는 4개 모두 흰색. 색 이름 클래스는 없다 (FD-23)
  const classes = await page.getByTestId('figma-button').evaluateAll((els) => els.map((el) => el.className));
  expect(classes).toHaveLength(4);
  for (const c of classes) expect(c).toContain('btn-M');
  for (const c of classes) expect(c).not.toMatch(/btn-(blue|red|green)/);
  expect(await colorsOf(page)).toEqual([rgb('#0052ff'), rgb('#0052ff'), rgb('#0052ff'), rgb('#cf202f')]);
  for (const id of ['main', 'b1', 'b2', 'b3']) expect(await textOf(page, id), `${id} 글자색`).toBe(rgb('#ffffff'));
  await expect(page.getByTestId('btn-icon')).toHaveCount(0);

  // 속성 패널은 빈 상태: <p data-testid="property-empty">, 머리 <h2>는 없음
  await expect(page.getByTestId('property-empty')).toHaveCount(1);
  expect(await page.getByTestId('property-empty').evaluate((el) => el.localName)).toBe('p');
  await expect(page.getByTestId('property-title')).toHaveCount(0);
  // 아무것도 고르지 않았다
  await expect(page.locator('.selected')).toHaveCount(0);

  // 화면에 patch · 줄 수 · 렌더 횟수를 알리는 요소가 없다 (MF-05)
  await expect(page.locator('[data-testid^="log-"]')).toHaveCount(0);
  expect(((await page.getByTestId('app-root').textContent()) ?? '').toLowerCase()).not.toContain('patch');

  // 영역 상자 안 최상위는 <div class="app"> 하나, 자식 순서 레이어 · 캔버스 · 속성
  const top = await page.getByTestId('app-root').evaluate((el) =>
    Array.from(el.children).map((c) => ({ tag: c.localName, cls: c.className, kids: Array.from(c.children).map((k) => k.getAttribute('data-testid')) })),
  );
  expect(top).toEqual([{ tag: 'div', cls: 'app', kids: ['layer-panel', 'canvas', 'property-panel'] }]);

  expect(await noHorizontalScroll(page)).toBe(true);
  expectNoConsoleWarnings(page);
});

test('QA-2 세 영역 배치: desktop은 가로로 나란히, mobile은 위아래로 쌓이고 가로 스크롤이 없다', async ({ page }, testInfo) => {
  await page.goto(URL);
  const box = async (id: string) => {
    const b = await page.getByTestId(id).boundingBox();
    if (b === null) throw new Error(`${id}가 안 보인다`);
    return b;
  };
  const layer = await box('layer-panel');
  const canvas = await box('canvas');
  const prop = await box('property-panel');

  if (testInfo.project.name === 'desktop') {
    // 왼쪽 레이어, 가운데 캔버스, 오른쪽 속성. 위 y가 같은 줄
    expect(layer.x + layer.width).toBeLessThanOrEqual(canvas.x + 1);
    expect(canvas.x + canvas.width).toBeLessThanOrEqual(prop.x + 1);
    expect(Math.abs(layer.y - canvas.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(canvas.y - prop.y)).toBeLessThanOrEqual(1);
  } else {
    // 레이어 → 캔버스 → 속성 순으로 쌓임
    expect(layer.y + layer.height).toBeLessThanOrEqual(canvas.y + 1);
    expect(canvas.y + canvas.height).toBeLessThanOrEqual(prop.y + 1);
  }
  expect(await noHorizontalScroll(page)).toBe(true);
});
