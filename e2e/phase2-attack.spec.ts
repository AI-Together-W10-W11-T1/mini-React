import { test, expect, URL, holdNodes, sameNode, watchApp, renderCount } from './phase2-helpers';

// [AI Note]: 공격적 시나리오(QA-A1 ~ A9). 칸이 생기는 Dev마다 해당 부분을 채우고 Dev-22에서 마무리한다. 테스트 이름은 그대로다.

const NAME = '[data-testid="name-input"]';

test('QA-A1 특수문자: 이름 · 할 일 글이 마크업이 아니라 글자 그대로 보이고 요소 · 스크립트가 생기지 않는다', async ({ page }) => {
  await page.goto(URL);
  await page.getByTestId('name-input').fill('<b>굵게</b> &amp; 😀');
  const greeting = page.getByTestId('greeting-text');
  await expect(greeting).toHaveText('안녕하세요, <b>굵게</b> &amp; 😀님');
  await expect(greeting.locator('b')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
});

test('QA-A3 빈 입력: 이름을 입력했다가 전부 지우면 안내 문구로 돌아가고 입력창은 같은 참조로 포커스가 유지된다', async ({ page }) => {
  await page.goto(URL);
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
