import { test, expect, URL, holdNodes, sameNode, watchApp, renderCount, memoCount, addTodo, inItem, itemTexts, itemIds } from './phase2-helpers';

// [AI Note]: 공격적 시나리오(QA-A1 ~ A9). 칸이 생기는 Dev마다 해당 부분을 채우고 Dev-22에서 마무리한다. 테스트 이름은 그대로다.

const NAME = '[data-testid="name-input"]';

test('QA-A1 특수문자: 이름 · 할 일 글이 마크업이 아니라 글자 그대로 보이고 요소 · 스크립트가 생기지 않는다', async ({ page }) => {
  await page.goto(URL);
  await page.getByTestId('name-input').fill('<b>굵게</b> &amp; 😀');
  const greeting = page.getByTestId('greeting-text');
  await expect(greeting).toHaveText('안녕하세요, <b>굵게</b> &amp; 😀님');
  await expect(greeting.locator('b')).toHaveCount(0);

  // 할 일 글도 글자 그대로: <img> 요소가 생기지 않고 onerror가 실행되지 않는다
  const attack = '<img src=x onerror="window.__pwned=1">';
  await addTodo(page, attack);
  await expect(page.getByTestId('todo-text')).toHaveText(attack);
  await expect(page.getByTestId('app-root').locator('img')).toHaveCount(0);
  await expect(greeting.locator('b')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
});

test('QA-A3 빈 입력: 빈 채로 [추가] · 공백만 입력하고 [추가]하면 항목이 안 생기고 상태 그대로이며, 이름을 전부 지우면 안내 문구로 돌아간다', async ({ page }) => {
  await page.goto(URL);
  const renders = await renderCount(page);
  const memos = await memoCount(page);
  const watcher = await watchApp(page);

  await page.getByTestId('todo-add').click(); // 빈 채로

  expect(await renderCount(page)).toBe(renders);
  expect(await memoCount(page)).toBe(memos);
  await expect(page.getByTestId('todo-empty')).toHaveText('할 일이 없어요');
  expect((await watcher.take()).body.total).toBe(0);

  await page.getByTestId('todo-input').fill('   '); // 공백만: 입력창 글(draft)만 바뀐다
  const afterTyping = await renderCount(page);
  await watcher.take();
  await page.getByTestId('todo-add').click();

  expect(await renderCount(page)).toBe(afterTyping);
  expect(await memoCount(page)).toBe(memos);
  await expect(page.getByTestId('todo-empty')).toHaveText('할 일이 없어요');
  await expect(page.getByTestId('todo-summary')).toHaveText('전체 0개 · 완료 0개');
  expect((await watcher.take()).body.total).toBe(0);

  // 이름을 입력했다가 전부 지우면 안내 문구로 돌아가고, 입력창은 같은 참조로 포커스가 유지된다
  const input = page.getByTestId('name-input');
  await input.click();
  await input.pressSequentially('민수');
  await holdNodes(page, { input: NAME });
  await input.fill('');
  await expect(page.getByTestId('greeting-text')).toHaveText('이름을 입력해 주세요');
  await expect(input).toHaveValue('');
  await expect(input).toBeFocused();
  expect(await sameNode(page, 'input', NAME)).toBe(true);
});

test('QA-A5 지운 번호 재사용 안 함: 3개 추가(todo-1 ~ 3) → 모두 삭제 → 새 항목은 todo-4다', async ({ page }) => {
  await page.goto(URL);
  await addTodo(page, '가');
  await addTodo(page, '나');
  await addTodo(page, '다');
  expect(await itemIds(page)).toEqual(['todo-1', 'todo-2', 'todo-3']);
  for (const id of ['todo-1', 'todo-2', 'todo-3']) {
    await page.locator(inItem(id, 'todo-remove')).click();
  }
  await expect(page.getByTestId('todo-empty')).toHaveText('할 일이 없어요');

  await addTodo(page, '새');

  expect(await itemIds(page)).toEqual(['todo-4']);
  expect(await itemTexts(page)).toEqual(['새']);
  await expect(page.getByTestId('todo-empty')).toHaveCount(0);
});

test('QA-A8 빠른 타이핑: 이름 입력창에 `가나다라마바사`를 지연 없이 입력해도 글자가 빠지거나 바뀌지 않고, 글자 하나에 렌더 1번이다', async ({ page }) => {
  await page.goto(URL);
  const input = page.getByTestId('name-input');
  await input.click();
  await holdNodes(page, { input: NAME });
  const before = await renderCount(page);

  await input.pressSequentially('가나다라마바사', { delay: 0 });

  await expect(input).toHaveValue('가나다라마바사');
  await expect(page.getByTestId('greeting-text')).toHaveText('안녕하세요, 가나다라마바사님');
  await expect(input).toBeFocused();
  expect(await sameNode(page, 'input', NAME)).toBe(true);
  expect(await renderCount(page)).toBe(before + 7);
});
