import type { Page } from '@playwright/test';
import { test, expect, URL, selectOnCanvas, selectInLayer, noHorizontalScroll, pickColor, textOf, rgb, buttonSel, layerSel, selectedOnCanvas, selectedInLayer } from './mini-figma-helpers';

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

// [AI Note]: desktop은 세 패널이 overflow-y: auto라 overflow-x도 계산상 auto가 된다 → 패널 안 가로 넘침이 페이지 scrollWidth에 안 잡힌다.
// 그래서 noHorizontalScroll(페이지) 말고 패널마다 scrollWidth <= clientWidth를 따로 본다 (Dev-9 경량 검수 NB 1).
async function expectPanelsNoHorizontalOverflow(page: Page, where: string): Promise<void> {
  for (const id of ['layer-panel', 'canvas', 'real-section', 'property-panel']) {
    const w = await page.getByTestId(id).evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
    expect(w.scrollWidth, `${where}: ${id} 안 가로 넘침 없음 (scrollWidth <= clientWidth)`).toBeLessThanOrEqual(w.clientWidth);
  }
}

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
  const real = await box('real-section');

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
    await expectPanelsNoHorizontalOverflow(page, '처음');
  } else {
    expect(toolbar.y + toolbar.height).toBeLessThanOrEqual(layer.y + 1);
    expect(layer.y + layer.height).toBeLessThanOrEqual(canvas.y + 1);
    expect(canvas.y + canvas.height).toBeLessThanOrEqual(real.y + 1);
    expect(real.y + real.height).toBeLessThanOrEqual(prop.y + 1);
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

// ---------------------------------------------------------------------------
// FD-08 전체 높이 (Dev-9): desktop은 도구 막대 아래 세 영역이 화면 아래까지 차고 페이지는 세로로 안 넘친다. 넘치면 패널 · 캔버스 안에서 스크롤.
// 여백 허용 범위: 아래 끝은 뷰포트 아래 끝에서 body 여백(16px) + 반올림 여유 4px = 최대 20px 위까지 (`BOTTOM_GAP`).
// ---------------------------------------------------------------------------
const BOTTOM_GAP = 20;

async function boxOf(page: Page, id: string): Promise<{ y: number; height: number; bottom: number }> {
  const b = await page.getByTestId(id).boundingBox();
  if (b === null) throw new Error(`${id}가 안 보인다`);
  return { y: b.y, height: b.height, bottom: b.y + b.height };
}
const pageScrollHeights = (page: Page): Promise<{ scrollHeight: number; innerHeight: number }> =>
  page.evaluate(() => ({ scrollHeight: (document.scrollingElement ?? document.documentElement).scrollHeight, innerHeight: window.innerHeight }));

test('QA-43 전체 높이: desktop은 레이어 · 캔버스 · 속성이 화면 아래까지 차고 캔버스가 남은 높이를 모두 쓰며 페이지 세로 스크롤이 없다 (mobile은 쌓기 그대로)', async ({ page }, testInfo) => {
  await page.goto(URL);
  const { scrollHeight, innerHeight } = await pageScrollHeights(page);
  const toolbar = await boxOf(page, 'toolbar');
  const canvas = await boxOf(page, 'canvas');
  const real = await boxOf(page, 'real-section');

  if (testInfo.project.name === 'desktop') {
    // 레이어 · 속성은 화면 아래까지, 가운데 열은 캔버스(위) + 실제 영역(아래)이 남은 높이를 나눠 쓰므로 아래 끝 = 실제 영역 (patch-preview PP-01)
    for (const id of ['layer-panel', 'real-section', 'property-panel']) {
      const b = await boxOf(page, id);
      expect(b.bottom, `${id} 아래 끝`).toBeLessThanOrEqual(innerHeight);
      expect(b.bottom, `${id} 아래 끝이 화면 아래 끝에서 ${BOTTOM_GAP}px 안`).toBeGreaterThanOrEqual(innerHeight - BOTTOM_GAP);
    }
    // 캔버스는 도구 막대 바로 아래(칸 사이 간격 16px)에서 시작하고 아래 끝은 실제 영역 위
    expect(canvas.y - toolbar.bottom, '도구 막대와 캔버스 사이 간격').toBeLessThanOrEqual(20);
    expect(canvas.bottom, '캔버스 아래 끝이 실제 영역 시작 위').toBeLessThanOrEqual(real.y);
    // 두 영역이 남은 높이를 반반 (각각 250px 이상, 차이 40px 이내)
    expect(canvas.height).toBeGreaterThanOrEqual(250);
    expect(real.height).toBeGreaterThanOrEqual(250);
    expect(Math.abs(canvas.height - real.height), '두 영역 높이 차이').toBeLessThanOrEqual(40);
    expect(scrollHeight, '페이지 세로 스크롤 없음').toBeLessThanOrEqual(innerHeight);
  } else {
    // mobile: 위아래 쌓기 그대로 — 캔버스는 지금처럼 내용 높이(최소 320px)이고 패널 안 스크롤이 없다
    const inner = await page.getByTestId('canvas').evaluate((el) => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, overflowY: getComputedStyle(el).overflowY }));
    expect(inner.scrollHeight).toBeLessThanOrEqual(inner.clientHeight + 1);
    expect(canvas.height).toBeGreaterThanOrEqual(320);
    expect(await noHorizontalScroll(page)).toBe(true);
  }
});

test('QA-44 넘침: 인스턴스를 많이 추가해도 desktop 페이지는 세로로 안 늘고 레이어 · 캔버스 안에서 스크롤되며, 맨 끝 버튼 · 행이 안 스크롤로 닿는다 (mobile은 페이지 스크롤 허용 + 가로 스크롤 없음)', async ({ page }, testInfo) => {
  await page.goto(URL);
  // 메인 크기를 L로 키워(인스턴스가 따라 커짐) 캔버스도 넘치게 한다 — 인스턴스 버튼은 줄바꿈으로 여러 줄이 됨
  await selectOnCanvas(page, 'main');
  await page.getByTestId('prop-size').selectOption('L');
  const COUNT = 60;
  for (let i = 0; i < COUNT; i += 1) await page.getByTestId('add-instance').click();
  await expect(page.getByTestId('layer-item')).toHaveCount(3 + COUNT);
  const lastId = `b${3 + COUNT}`;

  if (testInfo.project.name === 'desktop') {
    const { scrollHeight, innerHeight } = await pageScrollHeights(page);
    expect(scrollHeight, '60개 추가 뒤에도 페이지 세로 스크롤 없음').toBeLessThanOrEqual(innerHeight);
    expect(await noHorizontalScroll(page)).toBe(true);
    await expectPanelsNoHorizontalOverflow(page, '60개 추가 뒤');
    // 레이어 · 실제 영역 · 속성은 여전히 화면 아래까지 (늘어나지 않음). 캔버스는 가운데 열 위 칸이라 아래 끝 단언에서 뺀다 (patch-preview)
    for (const id of ['layer-panel', 'real-section', 'property-panel']) {
      const b = await boxOf(page, id);
      expect(b.bottom, `${id} 아래 끝`).toBeLessThanOrEqual(innerHeight);
      expect(b.bottom).toBeGreaterThanOrEqual(innerHeight - BOTTOM_GAP);
    }
    // 레이어 · 캔버스 둘 다 안쪽에서 스크롤
    const inner = (id: string) => page.getByTestId(id).evaluate((el) => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, scrollTop: el.scrollTop, overflowY: getComputedStyle(el).overflowY }));
    for (const id of ['layer-panel', 'canvas']) {
      const s = await inner(id);
      expect(['auto', 'scroll'], `${id} overflow-y`).toContain(s.overflowY);
      expect(s.scrollHeight, `${id} 안쪽 높이가 보이는 높이보다 큼`).toBeGreaterThan(s.clientHeight);
      expect(s.scrollTop).toBe(0);
    }
    // 맨 끝 캔버스 버튼 누르기 = 캔버스 안이 스크롤돼서 닿는다 (페이지는 그대로)
    await page.locator(buttonSel(lastId)).click();
    expect(await selectedOnCanvas(page)).toEqual([lastId]);
    expect((await inner('canvas')).scrollTop, '캔버스가 안쪽에서 스크롤됨').toBeGreaterThan(0);
    expect((await pageScrollHeights(page)).scrollHeight).toBeLessThanOrEqual(innerHeight);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    // 맨 끝 레이어 행 누르기 = 레이어 창 안이 스크롤
    await page.locator(layerSel(`b${2 + COUNT}`)).click();
    expect((await inner('layer-panel')).scrollTop, '레이어 창이 안쪽에서 스크롤됨').toBeGreaterThan(0);
    expect(await selectedInLayer(page)).toEqual([`b${2 + COUNT}`]);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    // 도구 막대는 계속 맨 위
    expect((await boxOf(page, 'toolbar')).y).toBeLessThanOrEqual(24);
  } else {
    // mobile: 위아래 쌓기, 페이지 세로 스크롤 허용, 가로 스크롤 없음, 맨 끝 버튼이 눌러짐
    expect(await noHorizontalScroll(page)).toBe(true);
    await page.locator(buttonSel(lastId)).click();
    expect(await selectedOnCanvas(page)).toEqual([lastId]);
    expect(await noHorizontalScroll(page)).toBe(true);
  }
});

test('QA-45 키보드 포커스: 색 입력칸 · 아이콘 보이기 체크박스도 글자 칸처럼 파랑 2px 표시가 나온다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'b2');
  // Tab으로 차례로 온다(:focus-visible은 키보드 이동에서만 켜짐). 라벨 칸에서 시작해 목표를 만날 때까지 최대 30번
  for (const id of ['prop-hasicon', 'prop-color']) {
    await page.getByTestId('prop-label').focus();
    for (let i = 0; i < 30; i += 1) {
      if ((await page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? '')) === id) break;
      await page.keyboard.press('Tab');
    }
    await expect(page.getByTestId(id), `${id}에 Tab으로 닿음`).toBeFocused();
    const s = await styleOf(page, tid(id), ['outline-color', 'outline-width', 'outline-style']);
    expect(s['outline-color'], `${id} 포커스 색`).toBe(BLUE);
    expect(s['outline-width'], `${id} 포커스 너비`).toBe('2px');
    expect(s['outline-style'], `${id} 포커스 모양`).not.toBe('none');
  }
});
