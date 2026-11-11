import { test, expect, URL, holdNodes, sameNode, watchApp, renderCount, memoCount, addTodo, itemSel, inItem, itemTexts, itemIds, counterText, patchCount, patchEventCount } from './phase2-helpers';

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

test('QA-A7 경계 이동: 맨 위의 [위로] · 맨 아래의 [아래로] · 항목이 하나뿐일 때 둘 다 아무 일 없다(렌더 횟수 · 순서 · DOM 그대로)', async ({ page }) => {
  await page.goto(URL);
  await addTodo(page, '가');
  await addTodo(page, '나');
  await addTodo(page, '다');
  const renders = await renderCount(page);
  const watcher = await watchApp(page);

  await page.locator(inItem('todo-1', 'todo-up')).click(); // 맨 위의 [위로]
  await page.locator(inItem('todo-3', 'todo-down')).click(); // 맨 아래의 [아래로]

  expect(await itemTexts(page)).toEqual(['가', '나', '다']);
  expect(await renderCount(page)).toBe(renders);
  expect((await watcher.take()).body.total).toBe(0);

  // 항목이 하나뿐일 때: 둘 다 아무 일 없다
  await page.locator(inItem('todo-2', 'todo-remove')).click();
  await page.locator(inItem('todo-3', 'todo-remove')).click();
  expect(await itemTexts(page)).toEqual(['가']);
  const single = await renderCount(page);
  await watcher.take();
  await page.locator(inItem('todo-1', 'todo-up')).click();
  await page.locator(inItem('todo-1', 'todo-down')).click();
  expect(await itemTexts(page)).toEqual(['가']);
  expect(await renderCount(page)).toBe(single);
  expect((await watcher.take()).body.total).toBe(0);
});

test('QA-A9 이동 뒤 핸들러: `다`의 [위로]를 두 번 → `다` [삭제] → `가` 체크하면 `가`만 완료되고 남은 `<li>`는 같은 참조다', async ({ page }) => {
  await page.goto(URL);
  await addTodo(page, '가');
  await addTodo(page, '나');
  await addTodo(page, '다');
  await holdNodes(page, { ga: itemSel('todo-1'), na: itemSel('todo-2') });

  await page.locator(inItem('todo-3', 'todo-up')).click();
  await page.locator(inItem('todo-3', 'todo-up')).click();
  expect(await itemTexts(page)).toEqual(['다', '가', '나']);

  await page.locator(inItem('todo-3', 'todo-remove')).click(); // 순서를 바꾼 뒤에도 각 줄 핸들러가 자기 항목을 가리킨다
  expect(await itemTexts(page)).toEqual(['가', '나']);

  await page.locator(inItem('todo-1', 'todo-check')).click();
  await expect(page.locator(itemSel('todo-1'))).toHaveAttribute('class', 'todo done');
  await expect(page.locator(itemSel('todo-2'))).toHaveAttribute('class', 'todo');
  await expect(page.getByTestId('todo-summary')).toHaveText('전체 2개 · 완료 1개');
  expect(await sameNode(page, 'ga', itemSel('todo-1'))).toBe(true);
  expect(await sameNode(page, 'na', itemSel('todo-2'))).toBe(true);
});

test('QA-A2 연타: [+1] 30번 · [+3] 10번 연타 뒤 카운터 60(30 + 10 × 3) · 렌더 41(중복 실행 없음) · 제목 `카운터 60 - Phase 2`, 이어서 `다`의 [위로] 5번 연타는 맨 위에서 멈추고 세 `<li>`는 같은 참조다', async ({ page }) => {
  await page.goto(URL);

  for (let i = 0; i < 30; i += 1) await page.getByTestId('counter-plus1').click();
  for (let i = 0; i < 10; i += 1) await page.getByTestId('counter-plus3').click();

  // 카운터 = [+1] 30번 + [+3] 10번 × 3 = 60 (qa_todo 표의 `40`은 계산 착오라 60으로 쓴다)
  expect(await counterText(page)).toBe('60');
  // 렌더 횟수 = 처음 1 + [+1] 30 + [+3] 10 × 1(setter 3번을 모음) = 41: 한 번 누르면 정확히 그만큼만 실행된다 (task_002 즉시 동기 때는 61)
  expect(await renderCount(page)).toBe(41);
  await expect(page).toHaveTitle('카운터 60 - Phase 2');

  await addTodo(page, '가');
  await addTodo(page, '나');
  await addTodo(page, '다');
  await holdNodes(page, { ga: itemSel('todo-1'), na: itemSel('todo-2'), da: itemSel('todo-3') });
  for (let i = 0; i < 5; i += 1) await page.locator(inItem('todo-3', 'todo-up')).click();

  expect(await itemTexts(page)).toEqual(['다', '가', '나']); // 맨 위에서 멈춘다
  expect(await sameNode(page, 'ga', itemSel('todo-1'))).toBe(true);
  expect(await sameNode(page, 'na', itemSel('todo-2'))).toBe(true);
  expect(await sameNode(page, 'da', itemSel('todo-3'))).toBe(true);
});

test('QA-A6 항목이 많을 때: 20개를 추가해도 [+1]은 목록 영역 DOM 변경 0건 · `<li>` 20개 같은 참조 · DOM을 바꾸는 줄 2 · 이벤트 교체 줄 86이다', async ({ page }) => {
  await page.goto(URL);
  for (let i = 1; i <= 20; i += 1) await addTodo(page, `항목 ${i}`);
  expect(await page.getByTestId('todo-item').count()).toBe(20);
  const nodes: Record<string, string> = {};
  for (let i = 1; i <= 20; i += 1) nodes[`li${i}`] = itemSel(`todo-${i}`);
  await holdNodes(page, nodes);
  const todoWatcher = await watchApp(page, 'todo-panel');

  await page.getByTestId('counter-plus1').click();

  expect(await counterText(page)).toBe('1');
  expect((await todoWatcher.take()).body.total).toBe(0); // 목록 영역은 DOM 변경 0건
  for (let i = 1; i <= 20; i += 1) expect(await sameNode(page, `li${i}`, itemSel(`todo-${i}`)), `li${i}는 같은 참조`).toBe(true);
  expect((await patchCount(page)) - (await patchEventCount(page))).toBe(2); // 카운터 글자 · 렌더 횟수 글자
  expect(await patchEventCount(page)).toBe(6 + 4 * 20); // 핸들러 달린 요소 수
});
