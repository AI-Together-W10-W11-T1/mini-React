import { test, expect, URL, holdNodes, sameNode } from './phase2-helpers';

// [AI Note]: QA-5 · QA-6 · QA-7 (② 입력창). 입력은 사용자처럼 fill · pressSequentially, 포커스를 옮기지 않고 다른 상태를 바꿔야 할 때만 el.click()을 쓴다.

const NAME = '[data-testid="name-input"]';

test('QA-5 이름 입력창에 `민수`를 입력하면 인사 글이 `안녕하세요, 민수님`이 되고(D-01), 지우면 다시 안내 문구가 된다', async ({ page }) => {
  await page.goto(URL);
  const input = page.getByTestId('name-input');
  const greeting = page.getByTestId('greeting-text');
  await expect(greeting).toHaveText('이름을 입력해 주세요');

  await input.fill('민수');
  await expect(greeting).toHaveText('안녕하세요, 민수님');
  await expect(input).toHaveValue('민수');

  await input.fill('');
  await expect(greeting).toHaveText('이름을 입력해 주세요');
  await expect(input).toHaveValue('');
});

test('QA-6 `가다`를 입력해 두고 커서를 `가`와 `다` 사이로 옮겨 `나`를 입력하면 값 `가나다` · 커서 2 · 포커스 유지 · 같은 입력창이다', async ({ page }) => {
  await page.goto(URL);
  const input = page.getByTestId('name-input');
  await input.click();
  await input.pressSequentially('가다');
  await holdNodes(page, { input: NAME });

  await page.keyboard.press('ArrowLeft');
  await input.pressSequentially('나');

  await expect(input).toHaveValue('가나다');
  await expect(page.getByTestId('greeting-text')).toHaveText('안녕하세요, 가나다님');
  const state = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="name-input"]') as HTMLInputElement;
    return { start: el.selectionStart, end: el.selectionEnd, focused: document.activeElement === el };
  });
  // 커서가 `나` 바로 뒤(2)에 있고, 입력할 때마다 값이 다시 대입되지 않아 포커스도 그대로다
  expect(state).toEqual({ start: 2, end: 2, focused: true });
  expect(await sameNode(page, 'input', NAME)).toBe(true);
});

test('QA-7 입력창에 포커스를 둔 채 다른 상태(카운터)가 바뀌어도 입력창 노드 · 값 · 포커스 · 커서가 그대로다', async ({ page }) => {
  await page.goto(URL);
  const input = page.getByTestId('name-input');
  await input.click();
  await input.pressSequentially('영희');
  await page.keyboard.press('ArrowLeft');
  await holdNodes(page, { input: NAME });
  const before = await page.evaluate(() => (document.querySelector('[data-testid="name-input"]') as HTMLInputElement).selectionStart);
  expect(before).toBe(1);

  // el.click()은 포커스를 옮기지 않는다
  await page.evaluate(() => {
    (document.querySelector('[data-testid="counter-plus1"]') as HTMLElement).click();
    (document.querySelector('[data-testid="counter-plus3"]') as HTMLElement).click();
  });

  await expect(page.getByTestId('counter-value')).toHaveText('4');
  const state = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="name-input"]') as HTMLInputElement;
    return { value: el.value, start: el.selectionStart, focused: document.activeElement === el };
  });
  expect(state).toEqual({ value: '영희', start: 1, focused: true });
  expect(await sameNode(page, 'input', NAME)).toBe(true);
});
