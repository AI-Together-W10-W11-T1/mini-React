import { test, expect, URL, holdNodes, sameNode, isStillConnected, watchApp, addTodo, itemSel, inItem, itemTexts, itemIds, counterText } from './phase2-helpers';

// [AI Note]: QA-8 · QA-9 · QA-10 · QA-13 (③ 목록). QA-11([위로] · [아래로])은 Dev-20에서 더한다.

test('QA-8 할 일을 추가하면 안내 `<p>`가 `<ul>`로 교체되고(D-05), 이어서 추가하면 `<li>`가 늘며(D-03) 기존 노드는 같은 참조다', async ({ page }) => {
  await page.goto(URL);
  await holdNodes(page, {
    empty: '[data-testid="todo-empty"]',
    counter: '[data-testid="counter-value"]',
    nameInput: '[data-testid="name-input"]',
  });

  await addTodo(page, '사과');

  // D-05 교체: 안내 노드는 분리되고 <ul>이 새로 생긴다
  expect(await isStillConnected(page, 'empty')).toBe(false);
  await expect(page.getByTestId('todo-empty')).toHaveCount(0);
  await expect(page.getByTestId('todo-list')).toHaveCount(1);
  expect(await itemTexts(page)).toEqual(['사과']);
  expect(await itemIds(page)).toEqual(['todo-1']);
  await expect(page.getByTestId('todo-check')).not.toBeChecked();
  await expect(page.getByTestId('todo-item')).toHaveAttribute('class', 'todo');
  await expect(page.getByTestId('todo-summary')).toHaveText('전체 1개 · 완료 0개');
  await expect(page.getByTestId('todo-input')).toHaveValue('');

  // 둘째 추가 (D-03): 첫 <li>는 같은 참조
  await holdNodes(page, { first: itemSel('todo-1'), list: '[data-testid="todo-list"]' });
  await addTodo(page, '배');
  expect(await itemTexts(page)).toEqual(['사과', '배']);
  expect(await itemIds(page)).toEqual(['todo-1', 'todo-2']);
  expect(await sameNode(page, 'first', itemSel('todo-1'))).toBe(true);
  expect(await sameNode(page, 'list', '[data-testid="todo-list"]')).toBe(true);
  await expect(page.getByTestId('todo-summary')).toHaveText('전체 2개 · 완료 0개');

  // 카운터 · 이름 입력창은 같은 참조, 루트 상태가 바뀌자 자식 TodoRow 화면에 반영됨(props 전달)
  expect(await sameNode(page, 'counter', '[data-testid="counter-value"]')).toBe(true);
  expect(await sameNode(page, 'nameInput', '[data-testid="name-input"]')).toBe(true);
});

test('QA-9 체크박스를 누르면 checked · class `todo done`(D-02) · 요약이 바뀌고 `<li>`는 같은 참조다. 다시 누르면 해제', async ({ page }) => {
  await page.goto(URL);
  await addTodo(page, '사과');
  await addTodo(page, '배');
  await holdNodes(page, { apple: itemSel('todo-1'), pear: itemSel('todo-2') });
  const watcher = await watchApp(page);

  await page.locator(inItem('todo-1', 'todo-check')).click();

  await expect(page.locator(inItem('todo-1', 'todo-check'))).toBeChecked();
  await expect(page.locator(itemSel('todo-1'))).toHaveAttribute('class', 'todo done');
  await expect(page.getByTestId('todo-summary')).toHaveText('전체 2개 · 완료 1개');
  expect(await sameNode(page, 'apple', itemSel('todo-1'))).toBe(true);
  // 본문 DOM 변경: 그 <li>의 attributes 1건 + 요약 글자 characterData 1건뿐 (checked는 프로퍼티라 속성 기록이 없다)
  const m = (await watcher.take()).body;
  expect(m.attributes).toBe(1);
  expect(m.characterData).toBe(1);
  expect(m.childList).toBe(0);
  expect([...m.targets].sort()).toEqual(['attributes:li', 'characterData:#text']);

  await page.locator(inItem('todo-1', 'todo-check')).click();

  await expect(page.locator(inItem('todo-1', 'todo-check'))).not.toBeChecked();
  await expect(page.locator(itemSel('todo-1'))).toHaveAttribute('class', 'todo');
  await expect(page.getByTestId('todo-summary')).toHaveText('전체 2개 · 완료 0개');
  // 배는 영향 없음
  await expect(page.locator(inItem('todo-2', 'todo-check'))).not.toBeChecked();
  await expect(page.locator(itemSel('todo-2'))).toHaveAttribute('class', 'todo');
  expect(await sameNode(page, 'pear', itemSel('todo-2'))).toBe(true);
});

test('QA-10 `나`를 지우면 `가` · `다`의 `<li>`는 같은 참조(D-04)이고, 다 지우면 `<ul>`이 사라지고 안내가 돌아온다(D-05)', async ({ page }) => {
  await page.goto(URL);
  await addTodo(page, '가');
  await addTodo(page, '나');
  await addTodo(page, '다');
  await holdNodes(page, { ga: itemSel('todo-1'), na: itemSel('todo-2'), da: itemSel('todo-3') });

  await page.locator(inItem('todo-2', 'todo-remove')).click();

  expect(await itemTexts(page)).toEqual(['가', '다']);
  expect(await sameNode(page, 'ga', itemSel('todo-1'))).toBe(true);
  expect(await sameNode(page, 'da', itemSel('todo-3'))).toBe(true);
  expect(await isStillConnected(page, 'na')).toBe(false); // key 비교라 엉뚱한 줄이 지워지지 않는다
  await expect(page.getByTestId('todo-summary')).toHaveText('전체 2개 · 완료 0개');

  await page.locator(inItem('todo-1', 'todo-remove')).click();
  await page.locator(inItem('todo-3', 'todo-remove')).click();

  await expect(page.getByTestId('todo-list')).toHaveCount(0);
  await expect(page.getByTestId('todo-empty')).toHaveText('할 일이 없어요');
  await expect(page.getByTestId('todo-summary')).toHaveText('전체 0개 · 완료 0개');
});

test('QA-13 카운터 · 이름 · 목록 · 할 일 입력창이 서로 섞이지 않고 각자 값을 유지한다', async ({ page }) => {
  await page.goto(URL);
  await page.getByTestId('counter-plus1').click();
  await page.getByTestId('counter-plus3').click();
  await page.getByTestId('counter-plus1').click();
  await page.getByTestId('name-input').fill('민수');
  await addTodo(page, '사과');
  await page.getByTestId('todo-input').fill('배'); // 추가하지 않고 쳐 둔다
  await page.getByTestId('name-input').fill('민수야');

  expect(await counterText(page)).toBe('5');
  await expect(page.getByTestId('greeting-text')).toHaveText('안녕하세요, 민수야님');
  expect(await itemTexts(page)).toEqual(['사과']);
  await expect(page.getByTestId('todo-input')).toHaveValue('배');
  await expect(page.getByTestId('name-input')).toHaveValue('민수야');

  // 한 칸을 바꿔도(카운터 한 번 더) 다른 세 칸은 그대로
  await page.getByTestId('counter-plus1').click();
  expect(await counterText(page)).toBe('6');
  await expect(page.getByTestId('greeting-text')).toHaveText('안녕하세요, 민수야님');
  expect(await itemTexts(page)).toEqual(['사과']);
  await expect(page.getByTestId('todo-input')).toHaveValue('배');
});

test('QA-11 `다`의 [위로] · [아래로]: 순서만 바뀌고 세 `<li>` · `<ul>` · `<li>` 안 글자 노드가 모두 같은 참조이며 DOM 변경은 `<ul>`의 childList뿐이다 (Key MOVE)', async ({ page }) => {
  await page.goto(URL);
  await addTodo(page, '가');
  await addTodo(page, '나');
  await addTodo(page, '다');
  const daText = { sel: inItem('todo-3', 'todo-text'), child: 0 };
  await holdNodes(page, {
    ga: itemSel('todo-1'),
    na: itemSel('todo-2'),
    da: itemSel('todo-3'),
    ul: '[data-testid="todo-list"]',
    daText,
  });
  const watcher = await watchApp(page);

  await page.locator(inItem('todo-3', 'todo-up')).click();

  expect(await itemTexts(page)).toEqual(['가', '다', '나']);
  for (const [name, id] of [['ga', 'todo-1'], ['na', 'todo-2'], ['da', 'todo-3']] as const) {
    expect(await sameNode(page, name, itemSel(id)), `${name}는 같은 <li>`).toBe(true);
  }
  expect(await sameNode(page, 'ul', '[data-testid="todo-list"]')).toBe(true);
  expect(await sameNode(page, 'daText', daText)).toBe(true);
  let m = (await watcher.take()).body;
  expect(m.characterData).toBe(0);
  expect(m.attributes).toBe(0);
  expect(m.childList).toBeGreaterThan(0);
  expect(m.targets.every((t) => t === 'childList:ul')).toBe(true);

  await page.locator(inItem('todo-3', 'todo-down')).click();

  expect(await itemTexts(page)).toEqual(['가', '나', '다']);
  for (const [name, id] of [['ga', 'todo-1'], ['na', 'todo-2'], ['da', 'todo-3']] as const) {
    expect(await sameNode(page, name, itemSel(id)), `${name}는 여전히 같은 <li>`).toBe(true);
  }
  expect(await sameNode(page, 'daText', daText)).toBe(true);
  m = (await watcher.take()).body;
  expect(m.characterData + m.attributes).toBe(0);
  expect(m.targets.every((t) => t === 'childList:ul')).toBe(true);
});
