import { test, expect, URL, holdNodes, sameNode, watchApp, renderCount, counterText } from './phase2-helpers';

// [AI Note]: QA-2 · QA-3 · QA-4. 칸이 늘 때마다(이름 입력창 · 안내 <p> · 기록판 · 탭 제목) 붙잡는 노드와 단언을 늘린다.

const VALUE_TEXT = { sel: '[data-testid="counter-value"]', child: 0 };

test('QA-2 [+1]을 누르면 카운터가 1이 되고(D-01), 렌더 1 → 2, 붙잡은 노드는 모두 같은 참조, 본문 DOM 변경은 characterData 1건뿐', async ({ page }) => {
  await page.goto(URL);
  await holdNodes(page, {
    valueText: VALUE_TEXT,
    value: '[data-testid="counter-value"]',
    plus1: '[data-testid="counter-plus1"]',
    plus3: '[data-testid="counter-plus3"]',
    same: '[data-testid="counter-same"]',
    nameInput: '[data-testid="name-input"]',
    greeting: '[data-testid="greeting-text"]',
  });
  const watcher = await watchApp(page);
  expect(await renderCount(page)).toBe(1);

  await page.getByTestId('counter-plus1').click();

  expect(await counterText(page)).toBe('1');
  expect(await renderCount(page)).toBe(2);
  // 바뀐 글자 노드도 새로 만들지 않고 값만 고친다
  expect(await sameNode(page, 'valueText', VALUE_TEXT)).toBe(true);
  expect(await sameNode(page, 'value', '[data-testid="counter-value"]')).toBe(true);
  expect(await sameNode(page, 'plus1', '[data-testid="counter-plus1"]')).toBe(true);
  expect(await sameNode(page, 'plus3', '[data-testid="counter-plus3"]')).toBe(true);
  expect(await sameNode(page, 'same', '[data-testid="counter-same"]')).toBe(true);
  expect(await sameNode(page, 'nameInput', '[data-testid="name-input"]')).toBe(true);
  expect(await sameNode(page, 'greeting', '[data-testid="greeting-text"]')).toBe(true);
  const m = (await watcher.take()).body;
  expect(m.characterData).toBe(1);
  expect(m.childList).toBe(0);
  expect(m.attributes).toBe(0);

  // 한 번 더 누르면 2 (상태 유지)
  await page.getByTestId('counter-plus1').click();
  expect(await counterText(page)).toBe('2');
});

test('QA-3 [+3]을 누르면 카운터가 3이 되고(함수형 setter 세 번) 렌더 횟수는 3 늘어 4가 된다. 이어서 [+1] → 4', async ({ page }) => {
  await page.goto(URL);
  expect(await renderCount(page)).toBe(1);

  await page.getByTestId('counter-plus3').click();

  expect(await counterText(page)).toBe('3');
  // 즉시 동기 정책: setter 하나에 렌더 하나 (PRD §4.2 "렌더링 횟수는 스케줄링 정책과 함께 기록")
  expect(await renderCount(page)).toBe(4);

  await page.getByTestId('counter-plus1').click();
  expect(await counterText(page)).toBe('4');
});

test('QA-4 [그대로]를 누르면 렌더 횟수 · 카운터가 그대로이고 DOM 변경이 0건이다', async ({ page }) => {
  await page.goto(URL);
  await page.getByTestId('counter-plus1').click();
  await page.getByTestId('counter-plus1').click();
  expect(await counterText(page)).toBe('2');
  expect(await renderCount(page)).toBe(3);

  const watcher = await watchApp(page);
  await page.getByTestId('counter-same').click();

  expect(await renderCount(page)).toBe(3);
  expect(await counterText(page)).toBe('2');
  const m = await watcher.take();
  expect(m.body.total).toBe(0);
  expect(m.log.total).toBe(0);
});
