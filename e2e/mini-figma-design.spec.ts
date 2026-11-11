import type { Page } from '@playwright/test';
import { test, expect, URL, selectOnCanvas, selectInLayer, noHorizontalScroll, pickColor, textOf, rgb, buttonSel } from './mini-figma-helpers';

// [AI Note]: QA-40 ~ 42 (디자인 개편: 어두운 카드 · 점무늬 · 알약 · 글꼴 · 도구 막대 배치) · QA-A26 (좁은 화면 도구 막대) · QA-A29 (밝은 색 위 선택 표시).
// 값은 computed style로 읽는다 — CSS 변수 이름이 아니라 실제 화면에 적용된 값이 문서 값(#0a0b0d · #16181c · #a8acb3 · #0052ff)인지 증명한다.
// 이 스펙의 테스트는 desktop · mobile 두 프로젝트에서 모두 돈다.

/** 요소 하나의 computed style 값들 (testId로 첫 요소) */
async function styleOf(page: Page, selector: string, props: string[]): Promise<Record<string, string>> {
  return page.locator(selector).first().evaluate((el, names) => {
    const cs = getComputedStyle(el);
    return Object.fromEntries(names.map((n) => [n, cs.getPropertyValue(n)]));
  }, props);
}
const tid = (id: string): string => `[data-testid="${id}"]`;

const BLUE = 'rgb(0, 82, 255)';
const WHITE = 'rgb(255, 255, 255)';
const INK = 'rgb(10, 11, 13)';
const CARD = 'rgb(22, 24, 28)';
const SOFT = 'rgb(168, 172, 179)';

test('QA-40 어두운 바탕 · 한 단계 밝은 카드 24px · 그림자 없음 · 점무늬 캔버스 · 알약 버튼 · 파랑 선택 표시', async ({ page }) => {
  await page.goto(URL);
  // 아무것도 안 골랐을 때의 보조 글자 (속성 패널 빈 안내)
  expect((await styleOf(page, tid('property-empty'), ['color'])).color, '빈 안내 글자').toBe(SOFT);
  await selectOnCanvas(page, 'b2');
  await selectInLayer(page, 'b2');

  // 바탕 · 카드
  expect((await styleOf(page, 'body', ['background-color']))['background-color'], 'body 바탕').toBe(INK);
  for (const id of ['layer-panel', 'property-panel']) {
    const s = await styleOf(page, tid(id), ['background-color', 'border-radius', 'color']);
    expect(s['background-color'], `${id} 배경`).toBe(CARD);
    expect(s['border-radius'], `${id} 모서리`).toBe('24px');
    expect(s.color, `${id} 글자`).toBe(WHITE);
  }
  // 보조 글자 (인스턴스를 골랐을 때 「메인 따름」)
  expect((await styleOf(page, tid('prop-follow'), ['color'])).color, '「메인 따름」 글자').toBe(SOFT);

  // 그림자 없음 (도구 막대 · 두 패널 · 캔버스 · [+ 인스턴스] · 칩 · 버튼)
  for (const sel of [tid('toolbar'), tid('layer-panel'), tid('property-panel'), tid('canvas'), tid('add-instance'), tid('undo-button'), tid('color-chip'), tid('figma-button')]) {
    expect((await styleOf(page, sel, ['box-shadow']))['box-shadow'], `${sel} 그림자`).toBe('none');
  }

  // 캔버스: 점무늬 (radial-gradient)
  expect((await styleOf(page, tid('canvas'), ['background-image']))['background-image']).toContain('radial-gradient');

  // 알약 버튼: [+ 인스턴스] 파랑 배경 · 흰 글자 · 100px, [↶] [↷]도 100px
  const add = await styleOf(page, tid('add-instance'), ['background-color', 'border-radius', 'color']);
  expect(add['background-color']).toBe(BLUE);
  expect(add['border-radius']).toBe('100px');
  expect(add.color).toBe(WHITE);
  for (const id of ['undo-button', 'redo-button']) expect((await styleOf(page, tid(id), ['border-radius']))['border-radius'], id).toBe('100px');

  // 입력칸 12px
  expect((await styleOf(page, tid('prop-label'), ['border-radius']))['border-radius']).toBe('12px');

  // 칩은 원 (폭 = 높이, 모서리 반지름 ≥ 폭/2)
  const chip = page.locator(tid('color-chip')).first();
  const box = await chip.boundingBox();
  if (box === null) throw new Error('칩이 안 보인다');
  expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(0.5);
  const radius = (await styleOf(page, tid('color-chip'), ['border-top-left-radius']))['border-top-left-radius'];
  const radiusPx = radius.endsWith('%') ? (parseFloat(radius) / 100) * box.width : parseFloat(radius);
  expect(radiusPx).toBeGreaterThanOrEqual(box.width / 2 - 0.5);

  // 고른 것 표시: 캔버스 버튼 · 레이어 행 outline이 파랑
  const sel = await styleOf(page, `${buttonSel('b2')}`, ['outline-color', 'outline-style']);
  expect(sel['outline-color'], '고른 캔버스 버튼').toBe(BLUE);
  expect(sel['outline-style']).not.toBe('none');
  const row = await styleOf(page, '[data-testid="layer-item"][data-id="b2"]', ['outline-color', 'outline-style']);
  expect(row['outline-color'], '고른 레이어 행').toBe(BLUE);
  expect(row['outline-style']).not.toBe('none');
});

test('QA-41 입력칸 포커스는 파랑 2px 테두리, 주황이 없고, 글꼴은 Inter · 색 값은 고정폭이며, 브랜드 글자 · 이미지 · 외부 요청이 없다', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto(URL);

  // 입력칸 포커스 = 파랑 2px 테두리
  await selectOnCanvas(page, 'b3');
  await page.getByTestId('prop-label').focus();
  const focus = await styleOf(page, tid('prop-label'), ['border-top-color', 'border-top-width', 'border-top-style']);
  expect(focus['border-top-color']).toBe(BLUE);
  expect(focus['border-top-width']).toBe('2px');
  expect(focus['border-top-style']).not.toBe('none');

  // 주황 없음: 앱 안 모든 요소의 배경 · 글자 · 테두리 · outline (b3를 골라 override 칸 표시가 있는 상태 + 아무것도 안 고른 상태)
  const scanOrange = (): Promise<string[]> =>
    page.evaluate(() => {
      const bad = new Set(['rgb(246, 173, 85)', 'rgb(255, 250, 240)']);
      const hits: string[] = [];
      for (const el of Array.from(document.querySelectorAll('body, body *'))) {
        const cs = getComputedStyle(el);
        for (const name of ['background-color', 'color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color']) {
          if (bad.has(cs.getPropertyValue(name))) hits.push(`${el.localName}[${el.getAttribute('data-testid') ?? ''}] ${name}`);
        }
      }
      return hits;
    });
  expect(await scanOrange(), 'b3 선택(override 표시 있음)').toEqual([]);
  await expect(page.locator('[data-testid="prop-row"].override')).toHaveCount(2); // 이 화면에 override 칸이 실제로 있다
  await selectOnCanvas(page, 'b2');
  expect(await scanOrange(), 'b2 선택').toEqual([]);

  // 글꼴: body는 Inter로 시작, 색 값 글자는 고정폭
  expect((await styleOf(page, 'body', ['font-family']))['font-family'].startsWith('Inter')).toBe(true);
  expect((await styleOf(page, tid('color-hex'), ['font-family']))['font-family']).toContain('monospace');

  // 브랜드 · 이미지 없음
  const text = await page.evaluate(() => `${document.title}\n${document.body.innerText}\n${document.documentElement.outerHTML}`);
  expect(text.toLowerCase()).not.toContain('coinbase');
  expect(await page.title()).toBe('mini-figma');
  expect(await page.locator('img, svg').count()).toBe(0);

  // 페이지가 받은 요청은 같은 출처(localhost:5199) 또는 data:뿐 (외부 글꼴 · 이미지 안 받음)
  const outside = requests.filter((u) => {
    if (u.startsWith('data:')) return false;
    return new globalThis.URL(u).host !== 'localhost:5199';
  });
  expect(outside, '외부 요청').toEqual([]);
});

test('QA-42 배치: desktop은 도구 막대가 맨 위에서 가로 전체 + 아래 3열, mobile은 도구 막대 → 레이어 → 캔버스 → 속성 순으로 세로이며 가로 스크롤이 없다', async ({ page }, testInfo) => {
  await page.goto(URL);
  const box = async (id: string) => {
    const b = await page.getByTestId(id).boundingBox();
    if (b === null) throw new Error(`${id}가 안 보인다`);
    return b;
  };
  const toolbar = await box('toolbar');
  const layer = await box('layer-panel');
  const canvas = await box('canvas');
  const prop = await box('property-panel');

  if (testInfo.project.name === 'desktop') {
    expect(toolbar.y).toBeLessThanOrEqual(layer.y);
    expect(toolbar.y + toolbar.height).toBeLessThanOrEqual(layer.y + 1);
    expect(Math.abs(toolbar.x - layer.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(toolbar.x + toolbar.width - (prop.x + prop.width))).toBeLessThanOrEqual(1);
    // 아래 3열: 같은 줄
    expect(layer.x + layer.width).toBeLessThanOrEqual(canvas.x + 1);
    expect(canvas.x + canvas.width).toBeLessThanOrEqual(prop.x + 1);
    expect(Math.abs(layer.y - canvas.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(canvas.y - prop.y)).toBeLessThanOrEqual(1);
  } else {
    expect(toolbar.y + toolbar.height).toBeLessThanOrEqual(layer.y + 1);
    expect(layer.y + layer.height).toBeLessThanOrEqual(canvas.y + 1);
    expect(canvas.y + canvas.height).toBeLessThanOrEqual(prop.y + 1);
  }
  expect(await noHorizontalScroll(page)).toBe(true);
});

test('QA-A26 좁은 화면 도구 막대: 앱 이름 · 버튼 3개가 화면 밖으로 안 나가고(모자라면 줄바꿈) 눌러지는 크기이며, [+ 인스턴스] 20번 뒤에도 맨 위 첫 자식 · [↶]이 켜져 있다', async ({ page }) => {
  await page.goto(URL);
  const width = page.viewportSize()?.width ?? 0;
  const check = async (where: string): Promise<void> => {
    for (const id of ['app-name', 'add-instance', 'undo-button', 'redo-button']) {
      const b = await page.getByTestId(id).boundingBox();
      if (b === null) throw new Error(`${where}: ${id}가 안 보인다`);
      expect(b.x, `${where}: ${id} 왼쪽`).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width, `${where}: ${id} 오른쪽`).toBeLessThanOrEqual(width + 0.5);
      if (id !== 'app-name') expect(b.height, `${where}: ${id} 높이`).toBeGreaterThanOrEqual(40);
    }
    expect(await noHorizontalScroll(page), `${where}: 가로 스크롤`).toBe(true);
  };
  await check('처음');

  for (let i = 0; i < 20; i += 1) await page.getByTestId('add-instance').click();
  await check('20번 추가 뒤');
  const first = await page.locator('[data-testid="app-root"] > .app').evaluate((app) => app.children[0].getAttribute('data-testid'));
  expect(first).toBe('toolbar');
  await expect(page.getByTestId('undo-button')).toBeEnabled();
  // 도구 막대는 맨 위에 그대로 (페이지를 안 내려도 보이는 위치)
  const top = await page.getByTestId('toolbar').boundingBox();
  expect(top?.y ?? 999).toBeLessThanOrEqual(24);
});

test('QA-A29 밝은 색 · 어두운 색 위의 선택 표시: 파랑 outline(너비 ≥ 2px · offset ≥ 2px)이 두 색 위에서 모두 그대로이고 글자는 규칙대로다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');

  for (const [hex, text] of [['#eef0f3', INK], ['#0a0b0d', WHITE]] as const) {
    await pickColor(page, hex);
    const s = await styleOf(page, buttonSel('main'), ['outline-color', 'outline-style', 'outline-width', 'outline-offset']);
    expect(s['outline-color'], `${hex} outline 색`).toBe(BLUE);
    expect(s['outline-style']).not.toBe('none');
    expect(parseFloat(s['outline-width']), `${hex} outline 너비`).toBeGreaterThanOrEqual(2);
    expect(parseFloat(s['outline-offset']), `${hex} outline offset`).toBeGreaterThanOrEqual(2);
    expect(await textOf(page, 'main'), `${hex} 글자`).toBe(text);
    expect(rgb(hex)).not.toBe(text);
  }
});
