import {
  test,
  expect,
  URL,
  holdNodes,
  sameNode,
  watchApp,
  addTodo,
  itemSel,
  inItem,
  counterText,
  renderCount,
  effectCount,
  memoCount,
  patchCount,
  patchEventCount,
} from './phase2-helpers';
import type { Page } from '@playwright/test';

// [AI Note]: QA-12 (useMemo) · QA-14 ~ QA-18 (기록판 · 탭 제목 effect · 이벤트 중복 없음 · 참조 유지). 횟수는 기록판 칸(log-*)에서 읽는다.

test('QA-12 목록이 안 바뀌면 memo를 다시 계산하지 않고(a), 목록이 바뀌면 한 번씩 다시 계산하며(b), [추가] 한 번에는 1번만 계산한다(c)', async ({ page }) => {
  await page.goto(URL);
  await addTodo(page, '사과');
  await addTodo(page, '배');
  const summary = page.getByTestId('todo-summary');
  await expect(summary).toHaveText('전체 2개 · 완료 0개');

  // (a) 목록과 상관없는 상태만 바뀐다: 카운터 · 이름 · 할 일 입력창(draft)
  let m = await memoCount(page);
  await page.getByTestId('counter-plus1').click();
  await page.getByTestId('name-input').fill('민수');
  await page.getByTestId('todo-input').fill('글');
  expect(await memoCount(page)).toBe(m);
  await expect(summary).toHaveText('전체 2개 · 완료 0개');
  await page.getByTestId('todo-input').fill('');

  // (b) 체크 · [위로] · 삭제: 한 동작마다 1씩, 요약이 맞다
  m = await memoCount(page);
  await page.locator(inItem('todo-1', 'todo-check')).click();
  expect(await memoCount(page)).toBe(m + 1);
  await expect(summary).toHaveText('전체 2개 · 완료 1개');
  await page.locator(inItem('todo-2', 'todo-up')).click();
  expect(await memoCount(page)).toBe(m + 2);
  await expect(summary).toHaveText('전체 2개 · 완료 1개');
  await page.locator(inItem('todo-2', 'todo-remove')).click();
  expect(await memoCount(page)).toBe(m + 3);
  await expect(summary).toHaveText('전체 1개 · 완료 1개');

  // (c) [추가] 한 번에 memo 횟수가 정확히 1 늘고(렌더 1번 — setter 2번을 모은 것 — 에서 한 번만 다시 계산) 요약이 맞다
  m = await memoCount(page);
  await addTodo(page, '감');
  expect(await memoCount(page)).toBe(m + 1);
  await expect(summary).toHaveText('전체 2개 · 완료 1개');
});

/** 기록판 세 칸(render · effect · memo) */
async function triple(page: Page): Promise<[number, number, number]> {
  return [await renderCount(page), await effectCount(page), await memoCount(page)];
}

test('QA-14 기록판 (render · effect · memo): 로드 1·1·1 → [+1] 2·2·1 → 이름 3·2·1 → [그대로] 3·2·1 → [+3] 4·3·1 → 할 일 입력 + [추가] 6·3·2', async ({ page }) => {
  await page.goto(URL);
  expect(await triple(page)).toEqual([1, 1, 1]); // (1) 로드 직후

  await page.getByTestId('counter-plus1').click(); // (2) 카운터가 바뀌어 [count] effect가 다시 돎
  expect(await triple(page)).toEqual([2, 2, 1]);

  await page.getByTestId('name-input').fill('가'); // (3) 카운터 그대로라 effect는 안 돎
  expect(await triple(page)).toEqual([3, 2, 1]);

  await page.getByTestId('counter-same').click(); // (4) 같은 값, 렌더 0번
  expect(await triple(page)).toEqual([3, 2, 1]);

  await page.getByTestId('counter-plus3').click(); // (5) setter 3번을 모아 렌더 1번 · 카운터가 한 번에 +3이라 effect도 1번 (task_002 즉시 동기 때는 6·5·1)
  expect(await triple(page)).toEqual([4, 3, 1]);

  await page.getByTestId('todo-input').fill('나'); // (6) 글자 입력 렌더 1번 + [추가] 렌더 1번(setter 2번을 모음), memo는 목록이 바뀐 한 번만 (task_002 즉시 동기 때는 9·5·2)
  await page.getByTestId('todo-add').click();
  expect(await triple(page)).toEqual([6, 3, 2]);
});

test('QA-15 patch 줄 수: 이벤트 교체 줄 = 핸들러 달린 요소 수(6 → 14), 전체 − 이벤트 = DOM을 바꾸는 줄 2(카운터 글자 · 렌더 횟수 글자)로 항목이 늘어도 같다', async ({ page }) => {
  await page.goto(URL);
  expect([await patchCount(page), await patchEventCount(page)]).toEqual([0, 0]); // 로드 직후

  await page.getByTestId('counter-plus1').click();
  // 핸들러 달린 요소 6개: [+1] · [+3] · [그대로] · 이름 입력창 · 할 일 입력창 · [추가]
  expect(await patchEventCount(page)).toBe(6);
  expect((await patchCount(page)) - (await patchEventCount(page))).toBe(2);

  await addTodo(page, '사과');
  await addTodo(page, '배');
  await page.getByTestId('counter-plus1').click();
  // 6 + 항목마다 4(체크 · [위로] · [아래로] · [삭제]) × 2 = 14
  expect(await patchEventCount(page)).toBe(14);
  expect((await patchCount(page)) - (await patchEventCount(page))).toBe(2);
});

test('QA-16 탭 제목: `카운터 N - Phase 2`, 이름 입력에는 그대로(effect 의존성 [count]), 제목은 DOM이 반영된 뒤 바뀐다', async ({ page }) => {
  // document.title을 쓰는 순간 화면의 카운터 글이 이미 새 값인지(effect는 patch 직후) 기록한다
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
  expect(await page.title()).toBe('카운터 0 - Phase 2');

  await page.getByTestId('counter-plus1').click();
  expect(await page.title()).toBe('카운터 1 - Phase 2');

  const effects = await effectCount(page);
  await page.getByTestId('name-input').fill('민수');
  expect(await page.title()).toBe('카운터 1 - Phase 2');
  expect(await effectCount(page)).toBe(effects);

  await page.getByTestId('counter-plus3').click();
  expect(await page.title()).toBe('카운터 4 - Phase 2');

  const writes = await page.evaluate(() => (window as unknown as { __titleWrites: string[] }).__titleWrites);
  // [+3]은 setter 3번을 모아 렌더 1번이라 제목을 쓰는 effect도 1번이고, 그때 화면 카운터는 이미 4다 (task_002 즉시 동기 때는 2 · 3 · 4로 3번 썼다)
  expect(writes).toEqual([
    '카운터 0 - Phase 2 | 화면 카운터 0',
    '카운터 1 - Phase 2 | 화면 카운터 1',
    '카운터 4 - Phase 2 | 화면 카운터 4',
  ]);
});

test('QA-17 렌더를 20번 넘게 일으킨 뒤에도 [+1] 한 번은 정확히 +1, [삭제] 한 번은 한 줄이며, (요소, 이벤트 이름)마다 addEventListener는 1번을 넘지 않는다', async ({ page }) => {
  // 요소(Element)마다 이벤트 이름별 addEventListener 호출 수를 센다
  await page.addInitScript(() => {
    const counts = new WeakMap<object, Record<string, number>>();
    const pairs: Array<{ el: WeakRef<object>; event: string }> = [];
    const original = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (this: EventTarget, type: string, ...rest: unknown[]) {
      if (this instanceof Element) {
        const record = counts.get(this) ?? {};
        if (!counts.has(this)) counts.set(this, record);
        record[type] = (record[type] ?? 0) + 1;
        pairs.push({ el: new WeakRef(this), event: type });
      }
      return (original as (...args: unknown[]) => void).call(this, type, ...rest);
    } as typeof EventTarget.prototype.addEventListener;
    (window as unknown as { __maxListeners: () => number }).__maxListeners = () => {
      let max = 0;
      for (const { el, event } of pairs) {
        const target = el.deref();
        if (target === undefined) continue;
        max = Math.max(max, counts.get(target)?.[event] ?? 0);
      }
      return max;
    };
  });
  await page.goto(URL);

  // 렌더를 20번 넘게: 이름 입력 · 할 일 추가 · 체크 · 이동 (카운터는 건드리지 않는다)
  await page.getByTestId('name-input').pressSequentially('가나다라마바사아자차');
  for (const text of ['가', '나', '다']) await addTodo(page, text);
  await page.locator(inItem('todo-1', 'todo-check')).click();
  await page.locator(inItem('todo-3', 'todo-up')).click();
  await page.locator(inItem('todo-3', 'todo-down')).click();
  // task_002 즉시 동기 때는 23번(> 20). Batching으로 [추가] 한 번이 렌더 1번이 되어 20번이 됐다
  expect(await renderCount(page)).toBeGreaterThanOrEqual(20);
  expect(await counterText(page)).toBe('0');

  await page.getByTestId('counter-plus1').click(); // 한 번
  expect(await counterText(page)).toBe('1');

  const before = await page.getByTestId('todo-item').count();
  await page.locator(inItem('todo-2', 'todo-remove')).click(); // 한 번
  expect(await page.getByTestId('todo-item').count()).toBe(before - 1);
  await expect(page.locator(itemSel('todo-2'))).toHaveCount(0);

  expect(await page.evaluate(() => (window as unknown as { __maxListeners: () => number }).__maxListeners())).toBe(1);
});

test('QA-18 [+1] · 이름 입력 · 체크 뒤에 변경 대상과 관련 없는 노드는 모두 같은 참조이고, 본문 DOM 변경은 바뀐 글자 · 속성뿐이다', async ({ page }) => {
  await page.goto(URL);
  await addTodo(page, '가');
  await addTodo(page, '나');
  await addTodo(page, '다');
  const summaryText = { sel: '[data-testid="todo-summary"]', child: 0 };
  await holdNodes(page, {
    plus1: '[data-testid="counter-plus1"]',
    nameInput: '[data-testid="name-input"]',
    todoInput: '[data-testid="todo-input"]',
    ul: '[data-testid="todo-list"]',
    ga: itemSel('todo-1'),
    na: itemSel('todo-2'),
    da: itemSel('todo-3'),
    summaryText,
    greeting: '[data-testid="greeting-text"]',
  });
  const same = async (): Promise<boolean[]> => [
    await sameNode(page, 'plus1', '[data-testid="counter-plus1"]'),
    await sameNode(page, 'nameInput', '[data-testid="name-input"]'),
    await sameNode(page, 'todoInput', '[data-testid="todo-input"]'),
    await sameNode(page, 'ul', '[data-testid="todo-list"]'),
    await sameNode(page, 'ga', itemSel('todo-1')),
    await sameNode(page, 'na', itemSel('todo-2')),
    await sameNode(page, 'da', itemSel('todo-3')),
    await sameNode(page, 'summaryText', summaryText),
    await sameNode(page, 'greeting', '[data-testid="greeting-text"]'),
  ];
  const watcher = await watchApp(page);
  await watcher.take();

  await page.getByTestId('counter-plus1').click();
  expect((await same()).every(Boolean)).toBe(true);
  let m = (await watcher.take()).body;
  expect([m.characterData, m.attributes, m.childList]).toEqual([1, 0, 0]); // 카운터 글자 하나뿐

  await page.getByTestId('name-input').pressSequentially('민');
  expect((await same()).every(Boolean)).toBe(true);
  m = (await watcher.take()).body;
  expect([m.characterData, m.attributes, m.childList]).toEqual([1, 0, 0]); // 인사 글 하나뿐 (입력창 value는 프로퍼티라 속성 기록 없음)

  await page.locator(inItem('todo-2', 'todo-check')).click();
  expect((await same()).every(Boolean)).toBe(true);
  m = (await watcher.take()).body;
  expect([m.characterData, m.attributes, m.childList]).toEqual([1, 1, 0]); // 그 <li> 속성 1건 + 요약 글자 1건
});
