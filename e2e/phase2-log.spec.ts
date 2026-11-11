import { test, expect, URL, addTodo, inItem, memoCount } from './phase2-helpers';

// [AI Note]: QA-12 (useMemo). 기록판(Dev-21)이 생기기 전에는 페이지가 노출한 window.__memoCount로 읽고, Dev-21에서 log-memo 칸을 읽도록 바꾼다.
// 이 파일은 Dev-21에서 QA-14 ~ QA-18이 더해진다.

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

  // (c) [추가] 한 번에 memo 횟수가 정확히 1 늘고(렌더 2번 중 목록이 바뀐 한 번만 다시 계산) 요약이 맞다
  m = await memoCount(page);
  await addTodo(page, '감');
  expect(await memoCount(page)).toBe(m + 1);
  await expect(summary).toHaveText('전체 2개 · 완료 1개');
});
