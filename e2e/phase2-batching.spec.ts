import { test, expect, URL, holdNodes, sameNode, watchApp, renderCount, effectCount, memoCount, counterText, addTodo, itemSel, itemTexts } from './phase2-helpers';

// [AI Note]: task_003 Batching (알고리즘 결정 9 B) 인수 시나리오 QA-1 ~ QA-4 · QA-A1 ~ QA-A4 (QA-5는 phase2-perfbench.spec.ts).
// 핵심: 같은 JS 실행(핸들러 · 한 번의 page.evaluate) 안에서 부른 setter는 모아서 렌더 한 번으로 처리하고, 렌더는 그 코드가 끝난 직후(마이크로태스크)에 돈다.
// Playwright의 `click()`은 사용자 클릭처럼 핸들러가 끝나면 마이크로태스크를 비우고 돌려주므로, "같은 JS 안"은 page.evaluate 안에서 el.click()을 불러 만든다.

const plus3 = '[data-testid="counter-plus3"]';

test('QA-1 [+3]을 한 번 누르면 카운터 3 · 렌더 횟수는 1 늘어 2 · [count] effect도 1 늘어 2 · 제목 `카운터 3 - Phase 2`. 이어서 [+1] → 4', async ({ page }) => {
  await page.goto(URL);
  expect([await renderCount(page), await effectCount(page)]).toEqual([1, 1]);

  await page.getByTestId('counter-plus3').click();

  expect(await counterText(page)).toBe('3');
  expect(await renderCount(page)).toBe(2); // setter 3번 → 렌더 1번 (Batching)
  expect(await effectCount(page)).toBe(2); // 모은 렌더의 patch 직후 effect 한 번
  await expect(page).toHaveTitle('카운터 3 - Phase 2');

  await page.getByTestId('counter-plus1').click();
  expect(await counterText(page)).toBe('4');
  await expect(page).toHaveTitle('카운터 4 - Phase 2');
});

test('QA-2 [+3]의 click()을 부른 같은 JS 실행 안에서 카운터를 읽으면 아직 0(렌더 횟수도 그대로)이고, 한 틱 뒤에는 3(렌더 +1)이다', async ({ page }) => {
  await page.goto(URL);
  const result = await page.evaluate(async () => {
    const text = (testId: string): string => document.querySelector(`[data-testid="${testId}"]`)?.textContent ?? '(없음)';
    (document.querySelector('[data-testid="counter-plus3"]') as HTMLElement).click();
    const immediate = { counter: text('counter-value'), renders: text('log-render') };
    await new Promise<void>((resolve) => setTimeout(resolve, 0)); // 한 틱 뒤: 예약된 렌더(마이크로태스크)가 이미 돌았다
    return { immediate, later: { counter: text('counter-value'), renders: text('log-render') } };
  });

  expect(result.immediate).toEqual({ counter: '0', renders: '1' }); // 렌더는 핸들러가 끝난 뒤
  expect(result.later).toEqual({ counter: '3', renders: '2' });
});

test('QA-3 [추가]를 누르면 목록 1개 · 입력창은 비워지고 같은 참조 · 요약 `전체 1개 · 완료 0개` · 렌더 +1(setter 2번을 모음) · memo +1', async ({ page }) => {
  await page.goto(URL);
  await page.getByTestId('todo-input').fill('사과');
  await holdNodes(page, { input: '[data-testid="todo-input"]', add: '[data-testid="todo-add"]' });
  const renders = await renderCount(page);
  const memos = await memoCount(page);

  await page.getByTestId('todo-add').click();

  expect(await itemTexts(page)).toEqual(['사과']);
  await expect(page.getByTestId('todo-input')).toHaveValue('');
  await expect(page.getByTestId('todo-summary')).toHaveText('전체 1개 · 완료 0개');
  expect(await sameNode(page, 'input', '[data-testid="todo-input"]')).toBe(true);
  expect(await sameNode(page, 'add', '[data-testid="todo-add"]')).toBe(true);
  expect(await renderCount(page)).toBe(renders + 1);
  expect(await memoCount(page)).toBe(memos + 1);
});

test('QA-4 제목 effect는 모은 렌더의 patch 직후에 1번만 돈다: 제목을 쓰는 순간 화면의 카운터 글은 이미 3이다', async ({ page }) => {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __titleWrites: string[] }).__titleWrites = seen;
    const desc = Object.getOwnPropertyDescriptor(Document.prototype, 'title');
    if (desc === undefined || desc.set === undefined || desc.get === undefined) return;
    const { get, set } = desc;
    Object.defineProperty(document, 'title', {
      configurable: true,
      get() {
        return get.call(document);
      },
      set(value: string) {
        const counter = document.querySelector('[data-testid="counter-value"]')?.textContent ?? '(없음)';
        seen.push(`${value} | 화면 카운터 ${counter}`);
        set.call(document, value);
      },
    });
  });
  await page.goto(URL);

  await page.getByTestId('counter-plus3').click();

  const writes = await page.evaluate(() => (window as unknown as { __titleWrites: string[] }).__titleWrites);
  expect(writes).toEqual(['카운터 0 - Phase 2 | 화면 카운터 0', '카운터 3 - Phase 2 | 화면 카운터 3']); // 3번 쓰지 않고 1번만
});

test('QA-A1 한 JS 실행 안에서 [+3] click()을 20번 연달아 부르면 카운터 60 · 렌더 +1 · 제목 `카운터 60 - Phase 2` · 콘솔 오류 없음', async ({ page }) => {
  await page.goto(URL);
  const renders = await renderCount(page);

  await page.evaluate((selector) => {
    const button = document.querySelector(selector) as HTMLElement;
    for (let i = 0; i < 20; i += 1) button.click();
  }, plus3);

  await expect(page.getByTestId('counter-value')).toHaveText('60');
  expect(await renderCount(page)).toBe(renders + 1);
  await expect(page).toHaveTitle('카운터 60 - Phase 2');
});

test('QA-A2 한 JS 실행 안에서 이름 입력창 value를 `가` → `가나` → `가나다`로 바꾸며 input을 3번 보내면 마지막 값 `가나다` · 렌더 +1 · 입력창은 같은 참조다', async ({ page }) => {
  await page.goto(URL);
  await holdNodes(page, { name: '[data-testid="name-input"]' });
  const renders = await renderCount(page);

  await page.evaluate(() => {
    const input = document.querySelector('[data-testid="name-input"]') as HTMLInputElement;
    for (const value of ['가', '가나', '가나다']) {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  await expect(page.getByTestId('name-input')).toHaveValue('가나다');
  await expect(page.getByTestId('greeting-text')).toHaveText('안녕하세요, 가나다님');
  expect(await renderCount(page)).toBe(renders + 1);
  expect(await sameNode(page, 'name', '[data-testid="name-input"]')).toBe(true);
});

test('QA-A3 한 JS 실행 안에서 `다`의 [위로] 2번 → `가` 체크 → `나` [삭제]를 click()하면 최종 목록은 차례대로 쌓은 결과(`다` `가`, 가는 완료) · 렌더 +1 · 남은 `<li>`는 같은 참조다', async ({ page }) => {
  await page.goto(URL);
  for (const text of ['가', '나', '다']) await addTodo(page, text);
  await holdNodes(page, { ga: itemSel('todo-1'), da: itemSel('todo-3') });
  const renders = await renderCount(page);

  await page.evaluate(() => {
    const click = (selector: string): void => (document.querySelector(selector) as HTMLElement).click();
    const inItem = (id: string, testId: string): string => `[data-testid="todo-item"][data-id="${id}"] [data-testid="${testId}"]`;
    click(inItem('todo-3', 'todo-up'));
    click(inItem('todo-3', 'todo-up'));
    click(inItem('todo-1', 'todo-check'));
    click(inItem('todo-2', 'todo-remove'));
  });

  await expect(page.getByTestId('todo-summary')).toHaveText('전체 2개 · 완료 1개');
  expect(await itemTexts(page)).toEqual(['다', '가']);
  await expect(page.locator(itemSel('todo-1'))).toHaveClass(/done/);
  expect(await renderCount(page)).toBe(renders + 1);
  expect(await sameNode(page, 'ga', itemSel('todo-1'))).toBe(true);
  expect(await sameNode(page, 'da', itemSel('todo-3'))).toBe(true);
});

test('QA-A4 한 JS 실행 안에서 [+1] 다음 [그대로]를 click()해 결과가 처음 값 0으로 돌아오면 카운터 0 · 본문(기록판 제외) DOM 변경 0건이다', async ({ page }) => {
  await page.goto(URL);
  const watcher = await watchApp(page);

  await page.evaluate(() => {
    (document.querySelector('[data-testid="counter-plus1"]') as HTMLElement).click();
    (document.querySelector('[data-testid="counter-same"]') as HTMLElement).click(); // 핸들러가 만들어진 때의 값(0)으로 setter → 모은 결과 0
  });

  await expect(page.getByTestId('counter-value')).toHaveText('0');
  const m = await watcher.take();
  expect(m.body.total).toBe(0);
});
