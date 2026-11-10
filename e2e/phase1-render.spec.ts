import { test, expect, URL, SAMPLE_HTML, structureOf, structureOfHtml, expectNoConsoleWarnings, expectThreeSame, editorValue } from './phase1-helpers';

// [AI Note]: QA-1(초기 화면) · QA-A4(새로고침) 외에, 최소 페이지 시절 유지 대상이던 "페이지를 연다" · "새로고침" · "가로 스크롤 없음"을 새 화면 기준으로 둔다.
// 옛 4건(main#app · h1 문구 · hidden:false li · 특수문자 p)은 QA-1(샘플 구조 · 특수문자는 편집창에 쳐서 미리보기에 글자로 보임)과
// QA-A1(특수문자를 Patch까지, Dev-20) · QA-A8(boolean 속성, Dev-20)로 옮겼다.

async function noHorizontalScroll(page: import('@playwright/test').Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
}

test('QA-1 페이지를 처음 연다: 이름표 · 두 영역 구조 · 편집창 · 버튼 · 특수문자는 글자로', async ({ page }) => {
  await page.goto(URL);

  // "실제 영역" · "테스트 영역" 이름표가 보여 구별된다
  await expect(page.getByRole('heading', { name: '실제 영역', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '테스트 영역', exact: true })).toBeVisible();
  const real = page.getByTestId('real-area');
  const testArea = page.getByTestId('test-area');
  const editor = page.getByTestId('html-editor');
  await expect(real).toBeVisible();
  await expect(testArea).toBeVisible();
  await expect(editor).toBeVisible();

  // 두 영역 구조가 같고 샘플과 같다 (영역 상자 바로 아래의 공백은 index.html 들여쓰기라 요소만 샘플과 비교한다)
  const realStruct = await structureOf(page, 'real-area');
  expect(await structureOf(page, 'test-area')).toEqual(realStruct);
  const sampleElements = (await structureOfHtml(page, SAMPLE_HTML)).filter((n) => n.t === 'el');
  expect(realStruct.filter((n) => n.t === 'el')).toEqual(sampleElements);
  await expect(real.locator('h2')).toHaveText('제목');
  await expect(real.locator('p.note')).toHaveText('안녕');
  await expect(real.locator('li')).toHaveText(['하나', '둘', '셋']);
  await expect(real.locator('button')).toHaveText('잠김');
  await expect(real.locator('button')).toBeDisabled();

  // 편집창에 샘플 HTML 글이 들어 있다 (실제 영역 구조와 같다)
  await expectThreeSame(page);
  const text = await editorValue(page);
  expect(text).toContain('<section id="card" class="card">');
  expect(text).toContain('<!-- 안내 문구 -->');
  expect(text).toContain('<li>하나</li>');

  // 편집창에 특수문자를 치면 테스트 영역에 글자로 보이고 <b> 요소는 없다 (입력 때마다 즉시 그려짐)
  await editor.fill('<p>&lt;b&gt; 😀</p>');
  await expect(testArea.locator('p')).toHaveText('<b> 😀');
  expect(await testArea.evaluate((e) => e.textContent)).toBe('<b> 😀');
  await expect(testArea.locator('b')).toHaveCount(0);
  // 실제 영역은 Patch 전이라 그대로다
  expect((await structureOf(page, 'real-area')).filter((n) => n.t === 'el')).toEqual(sampleElements);

  // 버튼 세 개가 보인다
  await expect(page.getByTestId('btn-patch')).toBeVisible();
  await expect(page.getByTestId('btn-back')).toBeVisible();
  await expect(page.getByTestId('btn-forward')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Patch' })).toBeVisible();
  await expect(page.getByRole('button', { name: '뒤로' })).toBeVisible();
  await expect(page.getByRole('button', { name: '앞으로' })).toBeVisible();

  // 콘솔 오류 · 경고 없음, mobile(375)에서도 가로 스크롤 없음
  expect(await noHorizontalScroll(page)).toBe(true);
  expectNoConsoleWarnings(page);
});

test('페이지를 연다 (콘솔 오류 · 경고 없음)', async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByTestId('real-area').locator('section#card')).toBeVisible({ timeout: 3000 });
  await expect(page.getByTestId('test-area').locator('section#card')).toBeVisible();
  expectNoConsoleWarnings(page);
});

test('새로고침', async ({ page }) => {
  await page.goto(URL);
  await page.reload();
  await expect(page.getByTestId('real-area').locator('section#card')).toHaveCount(1, { timeout: 3000 });
  await expect(page.getByTestId('test-area').locator('section#card')).toHaveCount(1);
  expectNoConsoleWarnings(page);
});

test('QA-A4 새로고침: 편집한 글은 사라지고 초기 샘플로 다시 뜨며 뒤로가 무시된다', async ({ page }) => {
  await page.goto(URL);
  const initialEditor = await editorValue(page);
  // [AI Note]: Patch 단계(Dev-15)가 생기면 같은 테스트에 "Patch 한 뒤"를 덧붙인다
  await page.getByTestId('html-editor').fill(initialEditor.replace('안녕', '반가워'));
  await expect(page.getByTestId('test-area').locator('p.note')).toHaveText('반가워');

  await page.reload();
  await expect(page.getByTestId('real-area').locator('p.note')).toHaveText('안녕');
  await expect(page.getByTestId('test-area').locator('p.note')).toHaveText('안녕');
  expect(await editorValue(page)).toBe(initialEditor);
  await expectThreeSame(page);

  // 기록이 비어 있어(0번뿐) 뒤로는 무시된다: 아무 일 없다
  await page.getByTestId('btn-back').click();
  await expect(page.getByTestId('real-area').locator('p.note')).toHaveText('안녕');
  expect(await editorValue(page)).toBe(initialEditor);
  await expectThreeSame(page);
  expectNoConsoleWarnings(page);
});

test('가로 스크롤이 없다 (mobile 375x812에서는 두 영역이 위아래로 쌓인다)', async ({ page }, testInfo) => {
  await page.goto(URL);
  await expect(page.getByTestId('real-area')).toBeVisible();
  expect(await noHorizontalScroll(page)).toBe(true);
  // 긴 글을 쳐도 가로로 넘치지 않는다
  await page.getByTestId('html-editor').fill(`<p>${'가나다라마바사'.repeat(40)}</p><p>${'a'.repeat(200)}</p>`);
  expect(await noHorizontalScroll(page)).toBe(true);
  if (testInfo.project.name === 'mobile') {
    const real = await page.getByTestId('real-area').boundingBox();
    const preview = await page.getByTestId('test-area').boundingBox();
    expect(real).not.toBeNull();
    expect(preview).not.toBeNull();
    expect(preview!.y).toBeGreaterThan(real!.y + real!.height - 1); // 위아래로 쌓임
  }
  await expect(page.getByTestId('btn-patch')).toBeVisible();
  await expect(page.getByTestId('btn-back')).toBeVisible();
  await expect(page.getByTestId('btn-forward')).toBeVisible();
});
