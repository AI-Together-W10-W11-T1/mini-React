import { test, expect } from '@playwright/test';

// [AI Note]: 샘플 트리의 기대값은 Dev-7 main.ts와 이 한 곳(상수)에 맞춘다.
const URL = '/phase1-vdom-playground/';
const SPECIAL = '<b>굵게 아님</b> & &amp; 😀';

test('개발 서버가 떠 있다: /phase1-vdom-playground/를 연다', async ({ page }) => {
  await page.goto(URL);
  const app = page.locator('#root > main#app');
  await expect(app).toBeVisible({ timeout: 3000 });
  await expect(app).toHaveClass('demo');
  await expect(app.locator('> h1')).toHaveText('Mini React');
  await expect(page.getByTestId('intro')).toHaveText('안녕, VDOM 2026');
  const items = page.getByTestId('list').locator('> li');
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toHaveText('첫째 항목');
  await expect(items.nth(1)).toHaveText('둘째 항목');
  await expect(items.nth(1)).toHaveClass('done');
  await expect(items.nth(2)).toHaveText('셋째 항목');
  await expect(page.getByTestId('field')).toHaveAttribute('disabled', '');
});

test('특수문자 텍스트 (<b>굵게 아님</b> & &amp; 😀)가 샘플 트리에 있다', async ({ page }) => {
  await page.goto(URL);
  const special = page.getByTestId('special');
  await expect(special).toBeVisible({ timeout: 3000 });
  await expect(special).toHaveText(SPECIAL);
  expect(await special.evaluate((e) => e.textContent)).toBe(SPECIAL);
  await expect(special.locator('b')).toHaveCount(0);
});

test('hidden: false인 li와 disabled: true인 input', async ({ page }) => {
  await page.goto(URL);
  const third = page.getByTestId('list').locator('> li').nth(2);
  await expect(third).toBeVisible({ timeout: 3000 });
  await expect(third).not.toHaveAttribute('hidden', /.*/);
  await expect(page.getByTestId('field')).toHaveAttribute('disabled', '');
});

test('페이지를 연다', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  await page.goto(URL);
  await expect(page.locator('main#app')).toBeVisible({ timeout: 3000 });
  expect(problems).toEqual([]);
});

test('새로고침', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  await page.goto(URL);
  await page.reload();
  await expect(page.locator('#root main#app')).toHaveCount(1, { timeout: 3000 });
  expect(problems).toEqual([]);
});

test('mobile 375x812에서 연다', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('main#app')).toBeVisible({ timeout: 3000 });
  const noHScroll = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
  expect(noHScroll).toBe(true);
  await expect(page.getByTestId('intro')).toBeVisible();
  await expect(page.getByTestId('list')).toBeVisible();
  await expect(page.getByTestId('special')).toBeVisible();
  await expect(page.getByTestId('field')).toBeVisible();
});
