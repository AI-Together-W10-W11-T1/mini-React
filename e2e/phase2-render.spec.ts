import { test, expect, URL, expectNoConsoleWarnings, noHorizontalScroll, renderCount, counterText } from './phase2-helpers';

// [AI Note]: QA-1(처음 화면)은 칸이 하나씩 생길 때마다(Dev-17 ① 카운터 → Dev-18 ② → Dev-19 ③ → Dev-21 ④) 확인을 늘린다. 테스트 이름은 그대로다.

test('QA-1 페이지를 처음 연다: 칸 · 버튼 · 렌더/Patch 버튼 없음 · 최상위 <main> 하나 · 콘솔 오류 · 경고 없음 · mobile 가로 스크롤 없음', async ({ page }, testInfo) => {
  await page.goto(URL);

  // ① 카운터: 0과 [+1] · [+3] · [그대로]
  await expect(page.getByTestId('counter-value')).toHaveText('0');
  await expect(page.getByTestId('counter-plus1')).toHaveText('+1');
  await expect(page.getByTestId('counter-plus3')).toHaveText('+3');
  await expect(page.getByTestId('counter-same')).toHaveText('그대로');
  expect(await counterText(page)).toBe('0');
  expect(await renderCount(page)).toBe(1);

  // ② 이름 입력창(비어 있음)과 인사 글
  await expect(page.getByTestId('name-input')).toHaveValue('');
  await expect(page.getByTestId('greeting-text')).toHaveText('이름을 입력해 주세요');

  // 페이지 어디에도 "렌더" · "Patch" 버튼이 없다: 버튼은 [+1] · [+3] · [그대로]뿐이다 (상태를 바꾸면 화면이 저절로 갱신된다)
  const buttonTexts = await page.getByRole('button').allTextContents();
  expect(buttonTexts.map((t) => t.trim())).toEqual(['+1', '+3', '그대로']);
  expect(buttonTexts.some((t) => /렌더|patch/i.test(t))).toBe(false);

  // app-root 안에 최상위 <main> 하나 (영역 상자는 보이지 않는 감싸개)
  const rootChildren = await page.getByTestId('app-root').evaluate((el) => Array.from(el.childNodes).map((n) => n.nodeName.toLowerCase()));
  expect(rootChildren).toEqual(['main']);

  // 화면 크기: mobile은 가로 스크롤이 없다(칸이 위아래로 쌓임), desktop은 칸이 모두 보인다
  expect(await noHorizontalScroll(page)).toBe(true);
  if (testInfo.project.name === 'desktop') {
    await expect(page.getByTestId('counter-value')).toBeInViewport();
  }

  expectNoConsoleWarnings(page);
});
