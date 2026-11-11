import { test, expect, URL, selectOnCanvas, moveInLayer, pickColor, pressBack, pressForward, realBgOf, watchSel, watchApp, noHorizontalScroll, areaSnapshot, realLabels, realButtonSel, watchFlash, boxInside, boxOverlap, boxSame, overlayCounts, navState, setMainLabel, titleText, buttonSel } from './mini-figma-helpers';
import type { ButtonLook } from './mini-figma-helpers';
import { holdNodes as holdReal, sameNode as sameReal } from './phase1-helpers';

// [AI Note]: patch-preview(task_006) 인수 QA-46 ~ 54 + 공격 QA-A30 ~ A35 · A37. 이 스펙의 테스트는 desktop · mobile 두 프로젝트에서 모두 돈다.
// 기준: .agent_workflow/tasks/task_006_ryuuuu5618_patch-preview/04_qa_evidence/qa_todo.md. QA-A36(한도 50)만 e2e로 안 만들고 단위 preview.test.ts · previewNav.test.ts가 맡는다 (사용자 결정: 느린 ≈ 110번 클릭 시나리오).
// 콘솔 error · 선언 안 한 dialog는 phase1-helpers의 test 확장이 자동으로 잡는다.
// 깜빡임은 시간에 기대는 효과라 사라지는 시간은 재지 않고, 박스가 「생길 때」의 위치(watchFlash)만 본다.
// 실제 영역 상자는 inert라 Playwright 기본 click()이 못 누른다고 기다리다 실패한다 → 눌러도 반응 없음을 볼 때만 click({ force: true }).

const BLUE = 'rgb(0, 82, 255)';
const RED = 'rgb(207, 32, 47)';
const WHITE = 'rgb(255, 255, 255)';
const INITIAL_LABELS = ['버튼', '버튼', '취소', '삭제'];
const REAL_IDS = ['main', 'b1', 'b2', 'b3'];

/** 실제 영역 버튼 4개를 이름 붙여 붙잡아 둔다 (같은 노드 참조인지 보려고) */
async function holdRealButtons(page: import('@playwright/test').Page, ids: string[] = REAL_IDS): Promise<void> {
  const nodes: Record<string, string> = {};
  for (const id of ids) nodes[`real-${id}`] = realButtonSel(id);
  await holdReal(page, nodes);
}

async function expectRealSame(page: import('@playwright/test').Page, ids: string[] = REAL_IDS): Promise<void> {
  for (const id of ids) expect(await sameReal(page, `real-${id}`, realButtonSel(id)), `실제 영역 ${id} 버튼이 같은 노드`).toBe(true);
}

const patch = (page: import('@playwright/test').Page) => page.getByTestId('patch-button').click();
const back = (page: import('@playwright/test').Page) => page.getByTestId('back-button').click();
const forward = (page: import('@playwright/test').Page) => page.getByTestId('forward-button').click();

/** 실제 영역 모습이 테스트 영역과 같다 (testid · selected는 일부러 다르므로 areaSnapshot이 뺀다) */
async function expectAreasSame(page: import('@playwright/test').Page, where: string): Promise<void> {
  expect(await areaSnapshot(page, 'real'), `${where}: 실제 영역 = 테스트 영역`).toEqual(await areaSnapshot(page, 'test'));
}

test('QA-46 두 영역 배치: 머리글이 있고 desktop은 가운데 열 위 = 테스트 영역 · 아래 = 실제 영역, mobile은 도구 막대 → 레이어 → 캔버스 → 실제 영역 → 속성 순으로 쌓이며 스크롤 규칙이 지켜진다', async ({ page }, testInfo) => {
  await page.goto(URL);
  await expect(page.getByTestId('test-area-title')).toHaveText('테스트 영역');
  await expect(page.getByTestId('real-title')).toHaveText('실제 영역');
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
    // 캔버스와 실제 영역은 가운데 열에서 x · 폭이 같고 캔버스가 위, 실제 영역이 아래
    expect(Math.abs(canvas.x - real.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(canvas.width - real.width)).toBeLessThanOrEqual(1);
    expect(canvas.y + canvas.height).toBeLessThanOrEqual(real.y + 1);
    // 레이어 · 속성은 사이드바: 도구 막대 바로 아래(여백 없음)에서 시작해 화면 맨 아래까지, 가운데 두 영역은 그 안쪽에 들어간다
    const vh = page.viewportSize()?.height ?? 0;
    for (const [name, b] of [['layer', layer], ['prop', prop]] as const) {
      expect(Math.abs(b.y - (toolbar.y + toolbar.height)), `${name} 위 = 도구 막대 아래`).toBeLessThanOrEqual(1);
      expect(Math.abs(b.y + b.height - vh), `${name} 아래 = 화면 아래`).toBeLessThanOrEqual(1);
    }
    expect(canvas.y).toBeGreaterThanOrEqual(layer.y);
    expect(real.y + real.height).toBeLessThanOrEqual(layer.y + layer.height);
    expect(layer.x + layer.width).toBeLessThanOrEqual(canvas.x + 1);
    expect(canvas.x + canvas.width).toBeLessThanOrEqual(prop.x + 1);
    expect(toolbar.y + toolbar.height).toBeLessThanOrEqual(layer.y + 1);
    // 페이지 세로 스크롤 없음
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= document.documentElement.clientHeight)).toBe(true);
  } else {
    expect(toolbar.y + toolbar.height).toBeLessThanOrEqual(layer.y + 1);
    expect(layer.y + layer.height).toBeLessThanOrEqual(canvas.y + 1);
    expect(canvas.y + canvas.height).toBeLessThanOrEqual(real.y + 1);
    expect(real.y + real.height).toBeLessThanOrEqual(prop.y + 1);
  }
  expect(await noHorizontalScroll(page)).toBe(true);
});

test('QA-47 처음 모습: 실제 영역 = 테스트 영역(버튼 4개), 테스트 영역 testid가 실제 영역에 없고, 실제 영역은 inert이며, 도구 막대의 [Patch]는 켜짐 · [실행 취소] [다시 실행]는 꺼짐이고 모양이 맞다 (PP-07 변경)', async ({ page }) => {
  await page.goto(URL);
  const real = page.getByTestId('real-area');
  await expect(real.getByTestId('real-figma-button')).toHaveCount(4);
  const snap = await areaSnapshot(page, 'real');
  expect(snap).toEqual(await areaSnapshot(page, 'test'));
  expect(snap.map((b) => b.label)).toEqual(INITIAL_LABELS);
  expect(snap.map((b) => b.bg)).toEqual([BLUE, BLUE, BLUE, RED]);
  expect(snap.map((b) => b.fg)).toEqual(Array(4).fill(WHITE));
  expect(snap.every((b) => b.cls.split(' ').includes('btn-M'))).toBe(true);

  // 레이어 · 속성 · 도구 막대 요소는 실제 영역 안에 0개
  expect(await real.locator('[data-testid="layer-item"], [data-testid="layer-main"], [data-testid="prop-row"], [data-testid="toolbar"], [data-testid="add-instance"], [data-testid="property-panel"]').count()).toBe(0);
  // 테스트 영역 testid가 실제 영역 안에 0개 (real- 접두만), 화면 전체의 figma-button은 4개 그대로, selected 0개
  for (const id of ['figma-button', 'btn-label', 'btn-icon', 'canvas-main', 'canvas-instances', 'test-area-title']) {
    expect(await real.locator(`[data-testid="${id}"]`).count(), `실제 영역 안 ${id}`).toBe(0);
  }
  await expect(page.getByTestId('figma-button')).toHaveCount(4);
  expect(await real.locator('.selected').count()).toBe(0);
  expect(await real.evaluate((el) => el.hasAttribute('inert'))).toBe(true);

  // 버튼 3개: 켜짐 · 꺼짐 + 모양. PP-07 변경: [실행 취소] [다시 실행] [Patch]가 도구 막대에 있고 순서는 앱 이름 · [+ 인스턴스] · [실행 취소] · [다시 실행] · [Patch], [↶] [↷]는 없다. 실제 영역 머리글에는 제목만
  expect(await page.getByTestId('toolbar').evaluate((el) => Array.from(el.children).map((c) => c.getAttribute('data-testid')))).toEqual(['app-name', 'add-instance', 'back-button', 'forward-button', 'patch-button']);
  await expect(page.getByTestId('undo-button')).toHaveCount(0);
  await expect(page.getByTestId('redo-button')).toHaveCount(0);
  expect(await page.locator('.real-header button').count()).toBe(0);
  expect(await page.locator('.real-header').evaluate((el) => Array.from(el.children).map((c) => c.getAttribute('data-testid')))).toEqual(['real-title']);
  // 좁아 줄바꿈돼도 도구 막대 버튼이 화면 밖으로 안 나간다
  const viewportWidth = page.viewportSize()?.width ?? 0;
  for (const id of ['app-name', 'add-instance', 'back-button', 'forward-button', 'patch-button']) {
    const b = await page.getByTestId(id).boundingBox();
    if (b === null) throw new Error(`${id}가 안 보인다`);
    expect(b.x, `${id} 왼쪽`).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width, `${id} 오른쪽`).toBeLessThanOrEqual(viewportWidth + 0.5);
  }
  expect(await noHorizontalScroll(page)).toBe(true);
  const style = (id: string) =>
    page.getByTestId(id).evaluate((el) => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, color: cs.color, radius: cs.borderTopLeftRadius, shadow: cs.boxShadow };
    });
  const patchStyle = await style('patch-button');
  expect(patchStyle).toEqual({ bg: BLUE, color: WHITE, radius: '100px', shadow: 'none' });
  for (const id of ['back-button', 'forward-button']) {
    const s = await style(id);
    expect(s.radius, `${id} 모서리`).toBe('100px');
    expect(s.shadow, `${id} 그림자`).toBe('none');
  }
  // 파랑 알약(.btn-primary)은 [+ 인스턴스] · [Patch] 둘뿐
  const primary = await page.locator('.btn-primary').evaluateAll((els) => els.map((el) => el.getAttribute('data-testid')));
  expect(primary.sort()).toEqual(['add-instance', 'patch-button']);
});

test('QA-48 라벨 `확인` → [Patch] 전에는 실제 영역이 그대로고, [Patch]하면 글자만 바뀌고(characterData 2) 메인 · b1 위에서 박스가 2개 깜빡인다', async ({ page }) => {
  await page.goto(URL);
  await holdRealButtons(page);
  const mut = await watchSel(page, 'real', '[data-testid="real-area"]');
  const flash = await watchFlash(page);
  await setMainLabel(page, '확인');

  // ① [Patch] 전: 테스트 영역만 바뀜
  await expect(page.getByTestId('btn-label')).toHaveText(['확인', '확인', '취소', '삭제']);
  expect(await realLabels(page)).toEqual(INITIAL_LABELS);
  expect((await mut.take()).total).toBe(0);
  const selectedTitle = await titleText(page);

  // ② [Patch]
  await patch(page);
  expect(await realLabels(page)).toEqual(['확인', '확인', '취소', '삭제']);
  await expectRealSame(page);
  const m = await mut.take();
  expect({ characterData: m.characterData, childList: m.childList, attributes: m.attributes }).toEqual({ characterData: 2, childList: 0, attributes: 0 });
  const counts = await overlayCounts(page);
  expect(counts).toEqual({ patch: '2', flash: '2' });
  const { boxes, buttons } = await flash.take();
  expect(boxes).toHaveLength(2);
  // 박스가 각각 메인 · b1 버튼 영역 안에 있고, b2 · b3 버튼과는 안 겹친다
  for (const b of boxes) {
    expect(boxInside(b, buttons.main) || boxInside(b, buttons.b1), `박스 ${JSON.stringify(b)}가 메인 또는 b1 안`).toBe(true);
    expect(boxOverlap(b, buttons.b2), 'b2와 안 겹침').toBe(false);
    expect(boxOverlap(b, buttons.b3), 'b3와 안 겹침').toBe(false);
  }
  expect(boxes.some((b) => boxInside(b, buttons.main))).toBe(true);
  expect(boxes.some((b) => boxInside(b, buttons.b1))).toBe(true);
  // 테스트 영역은 그대로 (선택 · 속성 패널 그대로)
  expect(await titleText(page)).toBe(selectedTitle);
  await expect(page.getByTestId('prop-label')).toHaveValue('확인');
  await expect(page.getByTestId('btn-label')).toHaveText(['확인', '확인', '취소', '삭제']);
});

test('QA-49 메인 색 빨강 → [Patch]: 색만 바뀌어(attributes 3) 메인 · b1 · b2 위 박스 3개가 버튼과 ±2px로 겹치고, 이어서 크기 L → [Patch]는 4칸 class가 바뀐다', async ({ page }) => {
  await page.goto(URL);
  await holdRealButtons(page);
  const mut = await watchSel(page, 'real', '[data-testid="real-area"]');
  const flash = await watchFlash(page);
  await selectOnCanvas(page, 'main');
  await pickColor(page, '#cf202f');

  await patch(page);
  const snap1 = await areaSnapshot(page, 'real');
  expect(snap1.map((b) => b.bg)).toEqual([RED, RED, RED, RED]);
  await expectRealSame(page);
  const m1 = await mut.take();
  expect({ attributes: m1.attributes, childList: m1.childList, characterData: m1.characterData }).toEqual({ attributes: 3, childList: 0, characterData: 0 });
  expect(await overlayCounts(page)).toEqual({ patch: '3', flash: '3' });
  const first = await flash.take();
  expect(first.boxes).toHaveLength(3);
  for (const id of ['main', 'b1', 'b2']) {
    expect(first.boxes.some((b) => boxSame(b, first.buttons[id], 2)), `${id} 버튼 영역과 ±2px 일치하는 박스`).toBe(true);
  }
  for (const b of first.boxes) expect(boxOverlap(b, first.buttons.b3), 'b3 위에는 박스 없음').toBe(false);
  await expectAreasSame(page, '색 Patch 뒤');

  // 이어서 크기 L
  await page.getByTestId('prop-size').selectOption('L');
  await patch(page);
  const snap2 = await areaSnapshot(page, 'real');
  expect(snap2.every((b) => b.cls.split(' ').includes('btn-L'))).toBe(true);
  await expectRealSame(page);
  const m2 = await mut.take();
  expect(m2.attributes).toBe(4);
  expect(m2.childList + m2.characterData).toBe(0);
  const second = await flash.take();
  expect(second.boxes).toHaveLength(4);
  await expectAreasSame(page, '크기 Patch 뒤');
});

test('QA-50 인스턴스 추가 → 아이콘 켜기 → 끄기 → 삭제를 [Patch]할 때마다 실제 영역이 테스트 영역과 같다', async ({ page }) => {
  await page.goto(URL);
  await holdRealButtons(page, ['main', 'b1', 'b2', 'b3']);
  const rows = await watchSel(page, 'rows', '[data-testid="real-canvas-instances"]');

  // 인스턴스 추가
  await page.getByTestId('add-instance').click();
  await patch(page);
  await expectAreasSame(page, '추가 뒤');
  await expect(page.getByTestId('real-figma-button')).toHaveCount(5);
  const rowMut = await rows.take();
  expect(rowMut.childList).toBe(1);
  expect(rowMut.characterData).toBe(0);
  await expectRealSame(page, ['b1', 'b2', 'b3']);
  expect((await navState(page)).back).toBe(true);

  // 아이콘 켜기: 버튼 5개에 아이콘 span이 글자 앞에 생긴다
  // [AI Note]: 실제 영역은 key가 없어 위치 비교라 글자 span 노드가 같은 참조로 남지는 않는다 (qa_todo 초안과 다름, 개발 Dev-7에서 확인 — preview.test.ts R-6). 모습이 같은지만 본다.
  await selectOnCanvas(page, 'main');
  await page.getByTestId('prop-hasicon').check();
  await patch(page);
  await expectAreasSame(page, '아이콘 켜기 뒤');
  await expect(page.getByTestId('real-btn-icon')).toHaveCount(5);
  const iconFirst = await page.getByTestId('real-figma-button').evaluateAll((els) => els.map((b) => b.children[0]?.getAttribute('data-testid')));
  expect(iconFirst).toEqual(Array(5).fill('real-btn-icon'));
  expect((await navState(page)).back).toBe(true);

  // 아이콘 끄기
  await page.getByTestId('prop-hasicon').uncheck();
  await patch(page);
  await expectAreasSame(page, '아이콘 끄기 뒤');
  await expect(page.getByTestId('real-btn-icon')).toHaveCount(0);
  expect((await navState(page)).back).toBe(true);

  // b4 고르고 Delete → [Patch]: 버튼 4개, 앞 버튼 노드는 같은 참조
  await selectOnCanvas(page, 'b4');
  await page.keyboard.press('Delete');
  await expect(page.getByTestId('figma-button')).toHaveCount(4);
  await patch(page);
  await expectAreasSame(page, '삭제 뒤');
  await expect(page.getByTestId('real-figma-button')).toHaveCount(4);
  await expectRealSame(page, ['main', 'b1', 'b2', 'b3']);
  expect((await navState(page)).back).toBe(true);
});

test('QA-51 고르기만 하고 [Patch]를 6번 눌러도 기록이 안 쌓인다: 실제 영역 변경 0 · 박스 0 · [실행 취소] 꺼짐, 선택 · 속성 패널은 그대로', async ({ page }) => {
  await page.goto(URL);
  const mut = await watchSel(page, 'real', '[data-testid="real-area"]');
  const flash = await watchFlash(page);
  await selectOnCanvas(page, 'b2');
  const title = await titleText(page);
  await expect(page.locator(buttonSel('b2'))).toHaveClass(/selected/);

  for (let i = 0; i < 6; i += 1) await patch(page);

  expect((await mut.take()).total).toBe(0);
  expect((await flash.take()).boxes).toHaveLength(0);
  expect((await navState(page)).back).toBe(false);
  expect(await page.getByTestId('real-area').locator('.selected').count()).toBe(0);
  expect(await titleText(page)).toBe(title);
  await expect(page.locator(buttonSel('b2'))).toHaveClass(/selected/);
  expect(await overlayCounts(page)).toEqual({ patch: null, flash: null });
});

test('QA-52 History 동기화: 라벨 → [Patch] → 크기 → [Patch] 뒤 [실행 취소] ×2 · [다시 실행] ×2가 매번 실제 영역만 그 기록 모습으로 움직이고 테스트 영역 · 앱 상태는 그대로다', async ({ page }) => {
  await page.goto(URL);
  const initial = await areaSnapshot(page, 'real');
  await holdRealButtons(page);
  const flash = await watchFlash(page);

  await setMainLabel(page, '확인');
  await patch(page);
  const A = await areaSnapshot(page, 'real');
  await page.getByTestId('prop-size').selectOption('L');
  await patch(page);
  const B = await areaSnapshot(page, 'real');
  expect(A.map((b) => b.label)).toEqual(['확인', '확인', '취소', '삭제']);
  expect(A.every((b) => b.cls.includes('btn-M'))).toBe(true);
  expect(B.every((b) => b.cls.includes('btn-L'))).toBe(true);
  expect(initial.map((b) => b.label)).toEqual(INITIAL_LABELS);
  await flash.take();

  /** 테스트 영역 · 앱 상태가 B 그대로다 (속성 패널 값) */
  const expectTestUntouched = async (where: string): Promise<void> => {
    expect(await areaSnapshot(page, 'test'), `${where}: 테스트 영역은 B 모습`).toEqual(B);
    await expect(page.getByTestId('prop-size')).toHaveValue('L');
    await expect(page.getByTestId('prop-label')).toHaveValue('확인');
  };
  const step = async (action: () => Promise<void>, expected: ButtonLook[], buttons: { back: boolean; forward: boolean }, where: string): Promise<void> => {
    await action();
    expect(await areaSnapshot(page, 'real'), `${where}: 실제 영역`).toEqual(expected);
    const s = await navState(page);
    expect({ back: s.back, forward: s.forward }, `${where}: 버튼`).toEqual(buttons);
    await expectTestUntouched(where);
    await expectRealSame(page);
    expect((await flash.take()).boxes.length, `${where}: 박스 ≥ 1`).toBeGreaterThanOrEqual(1);
  };

  expect(await navState(page)).toEqual({ patch: true, back: true, forward: false });
  await step(() => back(page), A, { back: true, forward: true }, '[실행 취소] 1');
  await step(() => back(page), initial, { back: false, forward: true }, '[실행 취소] 2');
  await step(() => forward(page), A, { back: true, forward: true }, '[다시 실행] 1');
  await step(() => forward(page), B, { back: true, forward: false }, '[다시 실행] 2');

  // 같은 기록을 단축키로도 움직인다: Ctrl+Z ×2 → 처음, Ctrl+Shift+Z ×2 → B (버튼과 같은 모습 · 같은 버튼 상태)
  await step(() => pressBack(page), A, { back: true, forward: true }, 'Ctrl+Z 1');
  await step(() => pressBack(page), initial, { back: false, forward: true }, 'Ctrl+Z 2');
  await step(() => pressForward(page), A, { back: true, forward: true }, 'Ctrl+Shift+Z 1');
  await step(() => pressForward(page), B, { back: true, forward: false }, 'Ctrl+Shift+Z 2');
});

test('QA-53 실행 취소한 뒤 [Patch]하면 앞쪽 기록을 버린다: 실제 영역이 B가 되고 [다시 실행]은 꺼지며, [실행 취소] 두 번이면 처음까지(기록 3칸)', async ({ page }) => {
  await page.goto(URL);
  const initial = await areaSnapshot(page, 'real');
  await setMainLabel(page, '확인');
  await patch(page);
  const A = await areaSnapshot(page, 'real');
  await page.getByTestId('prop-size').selectOption('L');
  await patch(page);
  const B = await areaSnapshot(page, 'real');

  await back(page);
  expect(await areaSnapshot(page, 'real')).toEqual(A);
  expect(await areaSnapshot(page, 'test')).toEqual(B);
  expect((await navState(page)).forward).toBe(true);

  // 테스트 영역은 그대로 둔 채 [Patch]
  await patch(page);
  expect(await areaSnapshot(page, 'real')).toEqual(B);
  expect(await navState(page)).toEqual({ patch: true, back: true, forward: false });

  await back(page);
  expect(await areaSnapshot(page, 'real')).toEqual(A);
  await back(page);
  expect(await areaSnapshot(page, 'real')).toEqual(initial);
  expect(await navState(page)).toEqual({ patch: true, back: false, forward: true });
});

test('QA-54 실제 영역은 눌러도 키를 받아도 반응이 없고, Ctrl+Z · Ctrl+Shift+Z는 실제 영역 [실행 취소] · [다시 실행]와 같은 기록을 움직이며 테스트 영역 · 앱 상태는 안 건드린다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'b1');
  const title = await titleText(page);
  expect(title).toContain('인스턴스');
  const app = await watchApp(page);

  // ① 실제 영역 b2를 눌러도(force) · 포커스를 줘도 · Enter · Space를 눌러도 아무 일 없다
  await page.locator(realButtonSel('b2')).click({ force: true });
  const focusedInsideReal = await page.evaluate(() => {
    (document.querySelector('[data-testid="real-figma-button"][data-id="b2"]') as HTMLElement).focus();
    return document.querySelector('[data-testid="real-area"]')?.contains(document.activeElement) ?? false;
  });
  expect(focusedInsideReal, 'inert 안 요소는 포커스를 못 받음').toBe(false);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  expect((await app.take()).body.total, '두 영역 DOM 변경 0').toBe(0);
  expect(await titleText(page)).toBe(title);
  expect(await page.locator('[data-testid="layer-item"].selected').getAttribute('data-id')).toBe('b1');
  expect(await page.locator('[data-testid="figma-button"].selected').getAttribute('data-id')).toBe('b1');

  // ② 편집(색) → [Patch] → 단축키 Ctrl+Z = [실행 취소], Ctrl+Shift+Z = [다시 실행]: 실제 영역만 움직이고 테스트 영역 · 선택 · 속성 패널은 그대로 (앱 편집 Undo는 없다)
  await pickColor(page, '#cf202f');
  await patch(page);
  const afterEdit = await areaSnapshot(page, 'real');
  expect(afterEdit[1].bg).toBe(RED);
  const testBefore = await areaSnapshot(page, 'test');
  const propTitle = await titleText(page);

  await pressBack(page);
  expect((await areaSnapshot(page, 'real'))[1].bg, 'Ctrl+Z → 실제 영역 [실행 취소]').toBe(BLUE);
  expect(await navState(page)).toEqual({ patch: true, back: false, forward: true });
  expect(await areaSnapshot(page, 'test'), '테스트 영역은 그대로').toEqual(testBefore);
  expect(await titleText(page)).toBe(propTitle);
  expect(await page.locator('[data-testid="figma-button"].selected').getAttribute('data-id')).toBe('b1');

  await pressForward(page);
  expect(await areaSnapshot(page, 'real'), 'Ctrl+Shift+Z → [다시 실행]').toEqual(afterEdit);
  expect(await navState(page)).toEqual({ patch: true, back: true, forward: false });

  // 버튼으로도 같은 기록: [실행 취소] 버튼 → 단축키 [다시 실행]
  await back(page);
  expect((await areaSnapshot(page, 'real'))[1].bg).toBe(BLUE);
  await pressForward(page);
  expect(await areaSnapshot(page, 'real')).toEqual(afterEdit);
  expect(await areaSnapshot(page, 'test')).toEqual(testBefore);
  // 앱 편집 Undo는 없다: 도구 막대에 [↶] [↷]가 없고 테스트 영역은 키로 안 돌아간다
  await expect(page.getByTestId('undo-button')).toHaveCount(0);
  await pressBack(page);
  await pressBack(page);
  expect((await areaSnapshot(page, 'test'))[1].bg, '테스트 영역은 색 빨강 그대로').toBe(RED);
});

// ---------------------------------------------------------------------------
// 공격적 시나리오
// ---------------------------------------------------------------------------

test('QA-A30 [Patch] 연타: 편집 없이 20번은 기록 0칸, 라벨을 바꾼 뒤 20번은 기록 1칸만 쌓인다', async ({ page }) => {
  await page.goto(URL);
  const mut = await watchSel(page, 'real', '[data-testid="real-area"]');
  const initial = await areaSnapshot(page, 'real');

  // ① 편집 없이 20번
  for (let i = 0; i < 20; i += 1) await patch(page);
  expect((await mut.take()).total).toBe(0);
  expect((await navState(page)).back).toBe(false);
  expect(await areaSnapshot(page, 'real')).toEqual(initial);

  // ② 라벨을 바꾼 뒤 20번
  await setMainLabel(page, '확인');
  for (let i = 0; i < 20; i += 1) await patch(page);
  expect(await realLabels(page)).toEqual(['확인', '확인', '취소', '삭제']);
  await expectAreasSame(page, '연타 뒤');
  const state = await navState(page);
  expect(state.back).toBe(true);
  expect(state.forward).toBe(false);

  // 기록은 1칸만: [실행 취소] 한 번이면 처음 모습, 그 뒤 [실행 취소]는 꺼짐
  await back(page);
  expect(await areaSnapshot(page, 'real')).toEqual(initial);
  expect((await navState(page)).back).toBe(false);
  expect((await navState(page)).forward).toBe(true);
});

test('QA-A31 [실행 취소] · [다시 실행] 연타: 한 번에 한 칸만 움직이고 처음 · 끝에서 멈추며(꺼진 버튼은 변경 0 · 박스 0) 버튼 켜짐이 기록 위치와 어긋나지 않는다', async ({ page }) => {
  await page.goto(URL);
  const history: ButtonLook[][] = [await areaSnapshot(page, 'real')];
  await setMainLabel(page, '확인');
  await patch(page);
  history.push(await areaSnapshot(page, 'real'));
  await page.getByTestId('prop-size').selectOption('L');
  await patch(page);
  history.push(await areaSnapshot(page, 'real'));
  await pickColor(page, '#cf202f');
  await patch(page);
  history.push(await areaSnapshot(page, 'real'));
  expect(history).toHaveLength(4);
  const mut = await watchSel(page, 'real', '[data-testid="real-area"]');
  const flash = await watchFlash(page);

  // [실행 취소] 10번: 3번째에서 disabled, 4 ~ 10번째는 force 클릭
  let index = 3;
  for (let i = 1; i <= 10; i += 1) {
    if (i <= 3) await back(page);
    else await page.getByTestId('back-button').click({ force: true });
    index = Math.max(0, index - 1);
    expect(await areaSnapshot(page, 'real'), `[실행 취소] ${i}번째`).toEqual(history[index]);
    expect(await page.getByTestId('back-button').isEnabled(), `[실행 취소] ${i}번째 뒤 [실행 취소] 켜짐`).toBe(index > 0);
    expect(await page.getByTestId('forward-button').isEnabled(), `[실행 취소] ${i}번째 뒤 [다시 실행] 켜짐`).toBe(true);
    const m = await mut.take();
    const f = await flash.take();
    if (i > 3) {
      expect(m.total, `[실행 취소] ${i}번째는 DOM 변경 0`).toBe(0);
      expect(f.boxes, `[실행 취소] ${i}번째는 박스 0`).toHaveLength(0);
    } else {
      expect(f.boxes.length, `[실행 취소] ${i}번째는 박스 ≥ 1`).toBeGreaterThanOrEqual(1);
    }
  }
  expect(await areaSnapshot(page, 'real')).toEqual(history[0]);

  // [다시 실행] 10번
  for (let i = 1; i <= 10; i += 1) {
    if (i <= 3) await forward(page);
    else await page.getByTestId('forward-button').click({ force: true });
    index = Math.min(3, index + 1);
    expect(await areaSnapshot(page, 'real'), `[다시 실행] ${i}번째`).toEqual(history[index]);
    expect(await page.getByTestId('forward-button').isEnabled(), `[다시 실행] ${i}번째 뒤 [다시 실행] 켜짐`).toBe(index < 3);
    expect(await page.getByTestId('back-button').isEnabled(), `[다시 실행] ${i}번째 뒤 [실행 취소] 켜짐`).toBe(true);
    const m = await mut.take();
    const f = await flash.take();
    if (i > 3) {
      expect(m.total, `[다시 실행] ${i}번째는 DOM 변경 0`).toBe(0);
      expect(f.boxes, `[다시 실행] ${i}번째는 박스 0`).toHaveLength(0);
    }
  }
  // 단축키 연타: Ctrl+Z 10번 · Ctrl+Shift+Z 10번도 한 번에 한 칸, 처음 · 끝에서 멈춘다 (버튼과 같은 기록)
  index = 3;
  for (let i = 1; i <= 10; i += 1) {
    await pressBack(page);
    index = Math.max(0, index - 1);
    expect(await areaSnapshot(page, 'real'), `Ctrl+Z ${i}번째`).toEqual(history[index]);
    expect(await page.getByTestId('back-button').isEnabled(), `Ctrl+Z ${i}번째 뒤 [실행 취소] 켜짐`).toBe(index > 0);
  }
  for (let i = 1; i <= 10; i += 1) {
    await pressForward(page);
    index = Math.min(3, index + 1);
    expect(await areaSnapshot(page, 'real'), `Ctrl+Shift+Z ${i}번째`).toEqual(history[index]);
    expect(await page.getByTestId('forward-button').isEnabled(), `Ctrl+Shift+Z ${i}번째 뒤 [다시 실행] 켜짐`).toBe(index < 3);
  }
  // 끝에서 실제 영역 = 마지막 Patch 모습 = 테스트 영역
  expect(await areaSnapshot(page, 'real')).toEqual(history[3]);
  await expectAreasSame(page, '끝');
});

test('QA-A32 특수문자 라벨 `<b>x</b> &amp; "q" \'a\' 😀`는 실제 영역에도 글자 그대로 표시되고(b 요소 0개), [실행 취소]하면 `버튼`으로 돌아간다', async ({ page }) => {
  const label = '<b>x</b> &amp; "q" \'a\' 😀';
  await page.goto(URL);
  await setMainLabel(page, label);
  await patch(page);

  const real = page.getByTestId('real-area');
  expect(await real.locator('b').count(), '실제 영역 안 b 요소 0개').toBe(0);
  const labels = await realLabels(page);
  expect(labels[0]).toBe(label);
  expect(labels[1]).toBe(label);
  expect(labels).toEqual(await page.getByTestId('btn-label').allTextContents());
  await expectAreasSame(page, '특수문자 Patch 뒤');

  await back(page);
  expect(await realLabels(page)).toEqual(INITIAL_LABELS);
  expect(await real.locator('b').count()).toBe(0);
});

test('QA-A33 빈 입력: 메인 라벨을 모두 지우고 [Patch]하면 실제 영역 메인 · b1 글자 span이 빈 글자로 남고(노드 제거 아님), [실행 취소]하면 `버튼`으로 돌아간다', async ({ page }) => {
  await page.goto(URL);
  const spanSel = (id: string) => `${realButtonSel(id)} [data-testid="real-btn-label"]`;
  await holdReal(page, { realMainLabel: spanSel('main'), realB1Label: spanSel('b1') });
  await setMainLabel(page, '');
  await patch(page);

  // 글자 span 4개가 그대로(노드 제거 아님), 메인 · b1 글자만 비어 있다
  await expect(page.getByTestId('real-btn-label')).toHaveCount(4);
  expect(await realLabels(page)).toEqual(['', '', '취소', '삭제']);
  expect(await sameReal(page, 'realMainLabel', spanSel('main')), '메인 글자 span이 같은 노드').toBe(true);
  expect(await sameReal(page, 'realB1Label', spanSel('b1')), 'b1 글자 span이 같은 노드').toBe(true);
  await expectAreasSame(page, '빈 라벨 Patch 뒤');
  const testAfterPatch = await areaSnapshot(page, 'test');
  expect(testAfterPatch.map((b) => b.label)).toEqual(['', '', '취소', '삭제']);

  // [실행 취소] = 버튼 복원, 테스트 영역은 그대로
  await back(page);
  expect(await realLabels(page)).toEqual(INITIAL_LABELS);
  await expect(page.getByTestId('real-btn-label')).toHaveCount(4);
  expect(await sameReal(page, 'realMainLabel', spanSel('main'))).toBe(true);
  expect(await areaSnapshot(page, 'test')).toEqual(testAfterPatch);
});

test('QA-A34 새로고침: 편집 · [Patch] · [실행 취소] 뒤 새로고침하면 실제 영역이 처음 모습(테스트 영역과 같음)이고 기록이 비어 있다', async ({ page }) => {
  await page.goto(URL);
  const initial = await areaSnapshot(page, 'real');
  await setMainLabel(page, '확인');
  await patch(page);
  await back(page);
  expect(await realLabels(page)).toEqual(INITIAL_LABELS);
  expect((await navState(page)).forward, '새로고침 전에는 [다시 실행]이 켜져 있다').toBe(true);

  await page.reload();
  await expect(page.getByTestId('real-figma-button')).toHaveCount(4);
  expect(await areaSnapshot(page, 'real')).toEqual(initial);
  await expectAreasSame(page, '새로고침 뒤');
  expect(await realLabels(page)).toEqual(INITIAL_LABELS);
  const state = await navState(page);
  expect(state.back, '[실행 취소] 꺼짐').toBe(false);
  expect(state.forward, '[다시 실행] 꺼짐').toBe(false);
  expect(state.patch).toBe(true);
});

test('QA-A35 구조 바꾸기를 섞어서(추가 → 순서 바꾸기 → 삭제 → 라벨 · 색) [Patch]할 때마다 두 영역이 같고, [실행 취소]를 끝까지 하면 처음 모습, [다시 실행]을 끝까지 하면 마지막 모습이다', async ({ page }) => {
  await page.goto(URL);
  const snaps = [await areaSnapshot(page, 'real')]; // 처음, 이어서 단계마다 [Patch] 직후 모습
  expect(snaps[0].map((b) => b.id)).toEqual(['main', 'b1', 'b2', 'b3']);

  // 1) [+ 인스턴스] → [Patch]
  await page.getByTestId('add-instance').click();
  await patch(page);
  await expectAreasSame(page, '추가 뒤');
  snaps.push(await areaSnapshot(page, 'real'));
  expect(snaps[1].map((b) => b.id)).toEqual(['main', 'b1', 'b2', 'b3', 'b4']);

  // 2) b1 [↓] → [Patch] (순서 바꾸기)
  await moveInLayer(page, 'b1', 'down');
  await patch(page);
  await expectAreasSame(page, '순서 바꾸기 뒤');
  snaps.push(await areaSnapshot(page, 'real'));
  expect(snaps[2].map((b) => b.id)).toEqual(['main', 'b2', 'b1', 'b3', 'b4']);

  // 3) b2 삭제 → [Patch]
  await selectOnCanvas(page, 'b2');
  await page.keyboard.press('Delete');
  await patch(page);
  await expectAreasSame(page, '삭제 뒤');
  snaps.push(await areaSnapshot(page, 'real'));
  expect(snaps[3].map((b) => b.id)).toEqual(['main', 'b1', 'b3', 'b4']);

  // 4) 라벨 · 색 → [Patch]
  await setMainLabel(page, '확인');
  await pickColor(page, '#cf202f');
  await patch(page);
  await expectAreasSame(page, '라벨 · 색 뒤');
  snaps.push(await areaSnapshot(page, 'real'));
  expect(snaps[4].map((b) => b.label)[0]).toBe('확인');
  expect(snaps[4].map((b) => b.bg)[0]).toBe(RED);
  const testLast = await areaSnapshot(page, 'test');
  expect(testLast).toEqual(snaps[4]);

  // [실행 취소]를 끝까지: 한 칸씩 그 기록 모습, 테스트 영역은 그대로
  for (let i = 3; i >= 0; i -= 1) {
    await back(page);
    expect(await areaSnapshot(page, 'real'), `[실행 취소] 뒤 실제 영역 = 기록 ${i}`).toEqual(snaps[i]);
    expect(await areaSnapshot(page, 'test'), '테스트 영역 그대로').toEqual(testLast);
  }
  expect((await navState(page)).back, '처음에서 [실행 취소] 꺼짐').toBe(false);
  expect(await realLabels(page)).toEqual(INITIAL_LABELS);

  // [다시 실행]을 끝까지
  for (let i = 1; i <= 4; i += 1) {
    await forward(page);
    expect(await areaSnapshot(page, 'real'), `[다시 실행] 뒤 실제 영역 = 기록 ${i}`).toEqual(snaps[i]);
    expect(await areaSnapshot(page, 'test'), '테스트 영역 그대로').toEqual(testLast);
  }
  expect((await navState(page)).forward, '끝에서 [다시 실행] 꺼짐').toBe(false);
  expect(await areaSnapshot(page, 'real')).toEqual(testLast);
});

test('QA-A37 인스턴스를 60번 더하고 긴 라벨(`A`×200)로 [Patch]해도 desktop은 페이지가 안 늘고 실제 영역 구역 안에서 스크롤되며, 두 크기 모두 가로 스크롤 · 버튼 넘침이 없다', async ({ page }, testInfo) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');
  await page.getByTestId('prop-size').selectOption('L');
  const COUNT = 60;
  for (let i = 0; i < COUNT; i += 1) await page.getByTestId('add-instance').click();
  await expect(page.getByTestId('figma-button')).toHaveCount(4 + COUNT);
  await patch(page);
  await expect(page.getByTestId('real-figma-button')).toHaveCount(4 + COUNT);

  // 긴 라벨 → [Patch] (깜빡임 박스가 떠 있는 동안 아래를 잰다)
  await setMainLabel(page, 'A'.repeat(200));
  await patch(page);
  expect((await realLabels(page))[0]).toBe('A'.repeat(200));
  await expectAreasSame(page, '60개 · 긴 라벨 Patch 뒤');
  expect(Number((await overlayCounts(page)).flash), '깜빡임 박스가 생겼다').toBeGreaterThan(0);

  // 두 크기 공통: 가로 스크롤 없음, 실제 영역 버튼의 오른쪽 끝이 실제 영역 오른쪽 끝을 안 넘음
  expect(await noHorizontalScroll(page)).toBe(true);
  const area = await page.getByTestId('real-area').boundingBox();
  if (area === null) throw new Error('실제 영역이 안 보인다');
  const rights = await page.getByTestId('real-figma-button').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().right));
  expect(rights).toHaveLength(4 + COUNT);
  for (const right of rights) expect(right).toBeLessThanOrEqual(area.x + area.width + 0.5);

  if (testInfo.project.name === 'desktop') {
    const heights = await page.evaluate(() => ({ scrollHeight: (document.scrollingElement ?? document.documentElement).scrollHeight, innerHeight: window.innerHeight }));
    expect(heights.scrollHeight, '페이지 세로 스크롤 없음').toBeLessThanOrEqual(heights.innerHeight);
    const section = await page.getByTestId('real-section').evaluate((el) => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, overflowY: getComputedStyle(el).overflowY }));
    expect(['auto', 'scroll'], 'real-section overflow-y').toContain(section.overflowY);
    expect(section.scrollHeight, '실제 영역 구역 안쪽 높이가 보이는 높이보다 큼').toBeGreaterThan(section.clientHeight);
    for (const id of ['layer-panel', 'real-section', 'property-panel']) {
      const b = await page.getByTestId(id).boundingBox();
      if (b === null) throw new Error(`${id}가 안 보인다`);
      expect(b.y + b.height, `${id} 아래 끝`).toBeLessThanOrEqual(heights.innerHeight);
      expect(b.y + b.height, `${id} 아래 끝이 화면 아래 20px 안`).toBeGreaterThanOrEqual(heights.innerHeight - 20);
    }
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  }
});
