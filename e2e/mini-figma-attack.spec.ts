import { test, expect, URL, selectOnCanvas, noHorizontalScroll, canvasLabels } from './mini-figma-helpers';

// [AI Note]: 공격적 시나리오 모음. 앞 Dev에서 채울 수 있는 것은 그 Dev에서 쓴다 (qa_todo 「Dev」 열): A1 · A2 = Dev-7.
// 이 스펙의 테스트는 desktop · mobile 두 프로젝트에서 모두 돈다.

test('QA-A1 특수문자 라벨: 마크업이 아니라 글자 그대로 그려지고 onerror가 실행되지 않는다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');
  const input = page.getByTestId('prop-label');

  const first = '<b>굵게</b> &amp; 😀';
  await input.fill(first);
  await expect(input).toHaveValue(first);
  expect((await canvasLabels(page))[0]).toBe(first);
  expect((await canvasLabels(page))[1]).toBe(first);

  const second = '<img src=x onerror="window.__pwned=1">';
  await input.fill(second);
  await expect(input).toHaveValue(second);
  expect((await canvasLabels(page))[0]).toBe(second);
  // 레이어 행 이름(b1은 메인을 따름)도 글자 그대로
  expect(await page.locator('[data-testid="layer-item"][data-id="b1"] [data-testid="layer-name"]').textContent()).toBe(second);

  // <b> · <img> 요소가 생기지 않았고 onerror도 실행되지 않았다
  await expect(page.locator('[data-testid="app-root"] b, [data-testid="app-root"] img')).toHaveCount(0);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
});

test('QA-A2 아주 긴 글자: 공백 없는 200자를 넣어도 가로 스크롤이 없고 버튼이 영역 밖으로 삐져나가지 않는다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');
  const long = 'A'.repeat(200);

  await page.getByTestId('prop-label').fill(long);

  expect((await canvasLabels(page))[0]).toBe(long);
  expect(await noHorizontalScroll(page)).toBe(true);
  // 모든 버튼의 오른쪽 끝이 캔버스 오른쪽 끝을 넘지 않는다
  const canvas = await page.getByTestId('canvas').boundingBox();
  if (canvas === null) throw new Error('캔버스가 안 보인다');
  const rights = await page.getByTestId('figma-button').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().right));
  for (const right of rights) expect(right).toBeLessThanOrEqual(canvas.x + canvas.width + 0.5);
  // [Dev-11에서 더함] 입력 한 번이 한 단계로 묶여 Ctrl+Z 한 번에 `버튼`으로 돌아오는지
});
