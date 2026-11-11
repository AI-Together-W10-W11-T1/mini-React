import { test, expect, URL, clickAdd, selectOnCanvas, moveInLayer, pickColor, pressBack, pressForward, realBgOf, watchSel, watchApp, noHorizontalScroll, areaSnapshot, realLabels, realButtonSel, watchFlash, boxInside, boxOverlap, boxSame, overlayCounts, navState, setMainLabel, titleText, buttonSel, blurFocus, layerOrder, canvasOrder, selectedOnCanvas, selectedInLayer, overriddenFields, inRow, rgb } from './mini-figma-helpers';
import type { ButtonLook } from './mini-figma-helpers';
import { holdNodes as holdReal, sameNode as sameReal } from './phase1-helpers';

// [AI Note]: patch-preview(task_006) 인수 QA-46 ~ 54 + 공격 QA-A30 ~ A35 · A37. PP-06 변경(Dev-8, 2026-11-12): [실행 취소] · [다시 실행]은 테스트 영역(doc)도 그 칸 상태로 되돌린다 → QA-52 · 53 · 54 · A30 ~ A35 개정, 신규 QA-55 ~ 62 · A38 ~ A40 (같은 준비를 쓰는 것은 한 test로 묶고 이름에 번호를 모두 적음). 이 스펙의 테스트는 desktop · mobile 두 프로젝트에서 모두 돈다.
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

  // 버튼 3개: 켜짐 · 꺼짐 + 모양. PP-07 변경: [실행 취소] [다시 실행] [Patch]가 도구 막대에 있고 순서는 앱 이름 · [실행 취소] · [다시 실행] · [Patch]([+ 인스턴스]는 속성 패널로 옮김), [↶] [↷]는 없다. 실제 영역 머리글에는 제목만
  expect(await page.getByTestId('toolbar').evaluate((el) => Array.from(el.children).map((c) => c.getAttribute('data-testid')))).toEqual(['app-name', 'back-button', 'forward-button', 'patch-button']);
  await expect(page.getByTestId('undo-button')).toHaveCount(0);
  await expect(page.getByTestId('redo-button')).toHaveCount(0);
  expect(await page.locator('.real-header button').count()).toBe(0);
  expect(await page.locator('.real-header').evaluate((el) => Array.from(el.children).map((c) => c.getAttribute('data-testid')))).toEqual(['real-title']);
  // 좁아 줄바꿈돼도 도구 막대 버튼이 화면 밖으로 안 나간다
  const viewportWidth = page.viewportSize()?.width ?? 0;
  for (const id of ['app-name', 'back-button', 'forward-button', 'patch-button']) {
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
  // 파랑 알약(.btn-primary)은 아무것도 안 골랐을 때 [Patch] 하나, 메인을 고르면 속성 패널의 [+ 인스턴스]가 더해진다
  const primary = () => page.locator('.btn-primary').evaluateAll((els) => els.map((el) => el.getAttribute('data-testid')));
  expect(await primary()).toEqual(['patch-button']);
  await selectOnCanvas(page, 'main');
  expect((await primary()).sort()).toEqual(['add-instance', 'patch-button']);
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
  await clickAdd(page);
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

test('QA-52 History 동기화: 라벨 → [Patch] → 크기 → [Patch] 뒤 [실행 취소] ×2 · [다시 실행] ×2가 매번 실제 영역과 테스트 영역(속성 패널 값 포함)을 함께 그 기록 모습으로 움직이고 선택은 그대로다 (PP-06 변경)', async ({ page }) => {
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

  /** 테스트 영역 = 실제 영역 = 그 칸 모습이고 속성 패널 값도 그 칸 값이다. 선택(메인)은 그대로 (PP-06 변경) */
  const step = async (action: () => Promise<void>, expected: ButtonLook[], props: { size: string; label: string }, buttons: { back: boolean; forward: boolean }, where: string): Promise<void> => {
    await action();
    expect(await areaSnapshot(page, 'real'), `${where}: 실제 영역`).toEqual(expected);
    expect(await areaSnapshot(page, 'test'), `${where}: 테스트 영역도 그 칸 모습`).toEqual(expected);
    await expect(page.getByTestId('prop-size')).toHaveValue(props.size);
    await expect(page.getByTestId('prop-label')).toHaveValue(props.label);
    expect(await selectedOnCanvas(page), `${where}: 선택(메인) 그대로`).toEqual(['main']);
    const s = await navState(page);
    expect({ back: s.back, forward: s.forward }, `${where}: 버튼`).toEqual(buttons);
    await expectRealSame(page);
    expect((await flash.take()).boxes.length, `${where}: 박스 ≥ 1`).toBeGreaterThanOrEqual(1);
  };
  const PA = { size: 'M', label: '확인' };
  const P0 = { size: 'M', label: '버튼' };
  const PB = { size: 'L', label: '확인' };

  expect(await navState(page)).toEqual({ patch: true, back: true, forward: false });
  await step(() => back(page), A, PA, { back: true, forward: true }, '[실행 취소] 1');
  await step(() => back(page), initial, P0, { back: false, forward: true }, '[실행 취소] 2');
  await step(() => forward(page), A, PA, { back: true, forward: true }, '[다시 실행] 1');
  await step(() => forward(page), B, PB, { back: true, forward: false }, '[다시 실행] 2');

  // 같은 기록을 단축키로도 움직인다: Ctrl+Z ×2 → 처음, Ctrl+Shift+Z ×2 → B (버튼과 같은 모습 · 같은 버튼 상태)
  await step(() => pressBack(page), A, PA, { back: true, forward: true }, 'Ctrl+Z 1');
  await step(() => pressBack(page), initial, P0, { back: false, forward: true }, 'Ctrl+Z 2');
  await step(() => pressForward(page), A, PA, { back: true, forward: true }, 'Ctrl+Shift+Z 1');
  await step(() => pressForward(page), B, PB, { back: true, forward: false }, 'Ctrl+Shift+Z 2');
});

test('QA-53 실행 취소한 뒤 편집을 끼워 [Patch]하면 앞쪽 기록을 버린다: 두 영역이 새 모습 C가 되고 [다시 실행]은 꺼지며(원래 B는 어디에도 안 나옴), [실행 취소] 두 번이면 처음까지(기록 3칸) (PP-06 변경)', async ({ page }) => {
  await page.goto(URL);
  const initial = await areaSnapshot(page, 'real');
  await setMainLabel(page, '확인');
  await patch(page);
  const A = await areaSnapshot(page, 'real');
  await page.getByTestId('prop-size').selectOption('L');
  await patch(page);
  const B = await areaSnapshot(page, 'real');

  // [실행 취소] 뒤 두 영역 = A. 이 상태의 편집 없는 [Patch]는 무변경이라 아무 일 없다 (새 QA-62가 따로 봄)
  await back(page);
  expect(await areaSnapshot(page, 'real')).toEqual(A);
  expect(await areaSnapshot(page, 'test')).toEqual(A);
  expect((await navState(page)).forward).toBe(true);
  await patch(page);
  expect(await areaSnapshot(page, 'real')).toEqual(A);
  expect((await navState(page)).forward, '편집 없는 [Patch]는 기록을 안 만든다').toBe(true);

  // 색 #cf202f를 편집해 끼운 뒤 [Patch] → 새 모습 C (A + 빨강)
  await pickColor(page, '#cf202f');
  await patch(page);
  const C = await areaSnapshot(page, 'real');
  expect(C[0].bg).toBe(RED);
  expect(C[0].label).toBe('확인');
  expect(C.every((b) => b.cls.includes('btn-M'))).toBe(true);
  expect(await areaSnapshot(page, 'test')).toEqual(C);
  expect(await navState(page)).toEqual({ patch: true, back: true, forward: false });

  // [실행 취소] 두 번 = A → 처음, 칸마다 두 영역 같음 (기록 3칸)
  await back(page);
  expect(await areaSnapshot(page, 'real')).toEqual(A);
  expect(await areaSnapshot(page, 'test')).toEqual(A);
  await back(page);
  expect(await areaSnapshot(page, 'real')).toEqual(initial);
  expect(await areaSnapshot(page, 'test')).toEqual(initial);
  expect(await navState(page)).toEqual({ patch: true, back: false, forward: true });
  // [다시 실행]으로 끝까지 가도 원래 B(크기 L)는 안 나온다
  await forward(page);
  await forward(page);
  expect(await areaSnapshot(page, 'real')).toEqual(C);
  expect(await areaSnapshot(page, 'real')).not.toEqual(B);
  expect((await navState(page)).forward).toBe(false);
});

test('QA-54 실제 영역은 눌러도 키를 받아도 반응이 없고, Ctrl+Z · Ctrl+Shift+Z는 [실행 취소] · [다시 실행]와 같은 기록을 움직여 두 영역이 함께 파랑 ↔ 빨강이 되며 선택 · 속성 패널 제목은 그대로다 (PP-06 변경)', async ({ page }) => {
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

  // ② 편집(색) → [Patch] → 단축키 Ctrl+Z = [실행 취소], Ctrl+Shift+Z = [다시 실행]: 두 영역이 함께 움직이고 선택 · 속성 패널 제목은 그대로 (앱 편집 Undo는 없다)
  await pickColor(page, '#cf202f');
  await patch(page);
  const afterEdit = await areaSnapshot(page, 'real');
  expect(afterEdit[1].bg).toBe(RED);
  const testBefore = await areaSnapshot(page, 'test');
  const propTitle = await titleText(page);

  await pressBack(page);
  expect((await areaSnapshot(page, 'real'))[1].bg, 'Ctrl+Z → 실제 영역 [실행 취소]').toBe(BLUE);
  expect(await navState(page)).toEqual({ patch: true, back: false, forward: true });
  expect((await areaSnapshot(page, 'test'))[1].bg, '테스트 영역 b1도 처음 색(파랑)').toBe(BLUE);
  expect(await areaSnapshot(page, 'test')).toEqual(await areaSnapshot(page, 'real'));
  await expect(page.getByTestId('prop-color')).toHaveValue('#0052ff');
  expect(await titleText(page)).toBe(propTitle);
  expect(await page.locator('[data-testid="figma-button"].selected').getAttribute('data-id')).toBe('b1');

  await pressForward(page);
  expect(await areaSnapshot(page, 'real'), 'Ctrl+Shift+Z → [다시 실행]').toEqual(afterEdit);
  expect(await areaSnapshot(page, 'test'), '테스트 영역도 빨강').toEqual(testBefore);
  await expect(page.getByTestId('prop-color')).toHaveValue('#cf202f');
  expect(await navState(page)).toEqual({ patch: true, back: true, forward: false });

  // 버튼으로도 같은 기록: [실행 취소] 버튼 → 두 영역 파랑 → 단축키 [다시 실행] → 빨강
  await back(page);
  expect((await areaSnapshot(page, 'real'))[1].bg).toBe(BLUE);
  expect((await areaSnapshot(page, 'test'))[1].bg).toBe(BLUE);
  await pressForward(page);
  expect(await areaSnapshot(page, 'real')).toEqual(afterEdit);
  expect(await areaSnapshot(page, 'test')).toEqual(testBefore);
  expect(await page.locator('[data-testid="figma-button"].selected').getAttribute('data-id')).toBe('b1');
  // 앱 편집 Undo는 없다(도구 막대에 [↶] [↷] 없음). 끝에서 Ctrl+Z를 두 번 더 → 처음에서 멈추고 테스트 영역도 파랑 (PP-06 변경)
  await expect(page.getByTestId('undo-button')).toHaveCount(0);
  await pressBack(page);
  await pressBack(page);
  expect((await areaSnapshot(page, 'test'))[1].bg, '처음에서 멈추고 테스트 영역 파랑').toBe(BLUE);
  expect(await areaSnapshot(page, 'test')).toEqual(await areaSnapshot(page, 'real'));
  expect((await navState(page)).back).toBe(false);
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
  expect(await areaSnapshot(page, 'test'), '테스트 영역도 처음 모습 (PP-06 변경)').toEqual(initial);
  expect(await page.getByTestId('btn-label').allTextContents()).toEqual(INITIAL_LABELS);
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
  const mutTest = await watchSel(page, 'test', '[data-testid="canvas"]');
  const flash = await watchFlash(page);

  // [실행 취소] 10번: 3번째에서 disabled, 4 ~ 10번째는 force 클릭
  let index = 3;
  for (let i = 1; i <= 10; i += 1) {
    if (i <= 3) await back(page);
    else await page.getByTestId('back-button').click({ force: true });
    index = Math.max(0, index - 1);
    expect(await areaSnapshot(page, 'real'), `[실행 취소] ${i}번째`).toEqual(history[index]);
    expect(await areaSnapshot(page, 'test'), `[실행 취소] ${i}번째 테스트 영역도`).toEqual(history[index]);
    expect(await page.getByTestId('back-button').isEnabled(), `[실행 취소] ${i}번째 뒤 [실행 취소] 켜짐`).toBe(index > 0);
    expect(await page.getByTestId('forward-button').isEnabled(), `[실행 취소] ${i}번째 뒤 [다시 실행] 켜짐`).toBe(true);
    const m = await mut.take();
    const mt = await mutTest.take();
    const f = await flash.take();
    if (i > 3) {
      expect(m.total, `[실행 취소] ${i}번째는 DOM 변경 0`).toBe(0);
      expect(mt.total, `[실행 취소] ${i}번째 테스트 영역도 변경 0`).toBe(0);
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
    expect(await areaSnapshot(page, 'test'), `[다시 실행] ${i}번째 테스트 영역도`).toEqual(history[index]);
    expect(await page.getByTestId('forward-button').isEnabled(), `[다시 실행] ${i}번째 뒤 [다시 실행] 켜짐`).toBe(index < 3);
    expect(await page.getByTestId('back-button').isEnabled(), `[다시 실행] ${i}번째 뒤 [실행 취소] 켜짐`).toBe(true);
    const m = await mut.take();
    const mt = await mutTest.take();
    const f = await flash.take();
    if (i > 3) {
      expect(m.total, `[다시 실행] ${i}번째는 DOM 변경 0`).toBe(0);
      expect(mt.total, `[다시 실행] ${i}번째 테스트 영역도 변경 0`).toBe(0);
      expect(f.boxes, `[다시 실행] ${i}번째는 박스 0`).toHaveLength(0);
    }
  }
  // 단축키 연타: Ctrl+Z 10번 · Ctrl+Shift+Z 10번도 한 번에 한 칸, 처음 · 끝에서 멈춘다 (버튼과 같은 기록)
  index = 3;
  for (let i = 1; i <= 10; i += 1) {
    await pressBack(page);
    index = Math.max(0, index - 1);
    expect(await areaSnapshot(page, 'real'), `Ctrl+Z ${i}번째`).toEqual(history[index]);
    expect(await areaSnapshot(page, 'test'), `Ctrl+Z ${i}번째 테스트 영역도`).toEqual(history[index]);
    expect(await page.getByTestId('back-button').isEnabled(), `Ctrl+Z ${i}번째 뒤 [실행 취소] 켜짐`).toBe(index > 0);
  }
  for (let i = 1; i <= 10; i += 1) {
    await pressForward(page);
    index = Math.min(3, index + 1);
    expect(await areaSnapshot(page, 'real'), `Ctrl+Shift+Z ${i}번째`).toEqual(history[index]);
    expect(await areaSnapshot(page, 'test'), `Ctrl+Shift+Z ${i}번째 테스트 영역도`).toEqual(history[index]);
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
  // PP-06 변경: 테스트 영역 글자 · 라벨 입력칸 값도 `버튼`
  expect(await page.getByTestId('btn-label').allTextContents()).toEqual(INITIAL_LABELS);
  expect(await page.getByTestId('canvas').locator('b').count()).toBe(0);
  await expect(page.getByTestId('prop-label')).toHaveValue('버튼');
});

test('QA-A33 빈 입력: 메인 라벨을 모두 지우고 [Patch]하면 실제 영역 메인 · b1 글자 span이 빈 글자로 남고(노드 제거 아님), [실행 취소]하면 두 영역 모두 `버튼`으로 돌아온다 (PP-06 변경)', async ({ page }) => {
  await page.goto(URL);
  const spanSel = (id: string) => `${realButtonSel(id)} [data-testid="real-btn-label"]`;
  const testSpanSel = `${buttonSel('main')} [data-testid="btn-label"]`;
  await holdReal(page, { realMainLabel: spanSel('main'), realB1Label: spanSel('b1') });
  await holdReal(page, { testMainLabel: testSpanSel }, { area: 'app-root' });
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

  // [실행 취소] = 두 영역 모두 `버튼`으로 복원 (전: 테스트 영역은 빈 글자 그대로였음), 글자 span 4개 노드는 그대로
  await back(page);
  expect(await realLabels(page)).toEqual(INITIAL_LABELS);
  await expect(page.getByTestId('real-btn-label')).toHaveCount(4);
  expect(await sameReal(page, 'realMainLabel', spanSel('main'))).toBe(true);
  expect(await page.getByTestId('btn-label').allTextContents(), '테스트 영역 글자도 복원').toEqual(INITIAL_LABELS);
  await expect(page.getByTestId('btn-label')).toHaveCount(4);
  expect(await sameReal(page, 'testMainLabel', testSpanSel, { area: 'app-root' }), '테스트 영역 메인 글자 span도 같은 노드').toBe(true);
  expect(await areaSnapshot(page, 'test')).not.toEqual(testAfterPatch);
  await expectAreasSame(page, '빈 라벨 [실행 취소] 뒤');
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
  await clickAdd(page);
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

  /** 캔버스 · 레이어 행 순서도 그 칸 모습이다 (PP-06 변경) */
  const expectOrders = async (i: number, where: string): Promise<void> => {
    const ids = snaps[i].map((b) => b.id).filter((id) => id !== 'main');
    expect(await canvasOrder(page), `${where}: 캔버스 순서`).toEqual(ids);
    expect(await layerOrder(page), `${where}: 레이어 순서`).toEqual(ids);
  };
  // [실행 취소]를 끝까지: 한 칸씩 칸마다 테스트 영역 = 실제 영역 = 그 기록 모습 (전: 테스트 영역은 마지막 모습 그대로)
  for (let i = 3; i >= 0; i -= 1) {
    await back(page);
    expect(await areaSnapshot(page, 'real'), `[실행 취소] 뒤 실제 영역 = 기록 ${i}`).toEqual(snaps[i]);
    expect(await areaSnapshot(page, 'test'), `[실행 취소] 뒤 테스트 영역 = 기록 ${i}`).toEqual(snaps[i]);
    await expectOrders(i, `[실행 취소] 뒤 기록 ${i}`);
  }
  expect((await navState(page)).back, '처음에서 [실행 취소] 꺼짐').toBe(false);
  expect(await realLabels(page)).toEqual(INITIAL_LABELS);

  // [다시 실행]을 끝까지
  for (let i = 1; i <= 4; i += 1) {
    await forward(page);
    expect(await areaSnapshot(page, 'real'), `[다시 실행] 뒤 실제 영역 = 기록 ${i}`).toEqual(snaps[i]);
    expect(await areaSnapshot(page, 'test'), `[다시 실행] 뒤 테스트 영역 = 기록 ${i}`).toEqual(snaps[i]);
    await expectOrders(i, `[다시 실행] 뒤 기록 ${i}`);
  }
  expect((await navState(page)).forward, '끝에서 [다시 실행] 꺼짐').toBe(false);
  expect(await areaSnapshot(page, 'real')).toEqual(testLast);
  expect(await areaSnapshot(page, 'test')).toEqual(testLast);
});

// ---------------------------------------------------------------------------
// PP-06 변경 (Dev-8, 2026-11-12): [실행 취소] · [다시 실행]이 테스트 영역도 그 칸 상태로 되돌린다
// ---------------------------------------------------------------------------

/** 테스트 영역 = 실제 영역 = expected 모습 (PP-06 변경 「두 영역이 같다」) */
async function expectBoth(page: import('@playwright/test').Page, expected: ButtonLook[], where: string): Promise<void> {
  expect(await areaSnapshot(page, 'real'), `${where}: 실제 영역`).toEqual(expected);
  expect(await areaSnapshot(page, 'test'), `${where}: 테스트 영역`).toEqual(expected);
}

test('QA-55 · 61 색을 빨강으로 바꿔 [Patch]한 뒤 [실행 취소] = 두 영역 모두 파랑 · [다시 실행] = 모두 빨강(속성 패널 색 입력값 · 선택 그대로), 단축키 Ctrl+Z · Ctrl+Shift+Z와 버튼이 같은 칸을 움직인다', async ({ page }) => {
  await page.goto(URL);
  const initial = await areaSnapshot(page, 'real');
  expect(initial.map((b) => b.bg)).toEqual([BLUE, BLUE, BLUE, RED]);
  await selectOnCanvas(page, 'main');
  await pickColor(page, '#cf202f');
  await patch(page);
  const red = await areaSnapshot(page, 'real');
  expect(red.map((b) => b.bg)).toEqual([RED, RED, RED, RED]);
  await expectBoth(page, red, 'Patch 뒤');

  const at = async (expected: ButtonLook[], color: string, buttons: { back: boolean; forward: boolean }, where: string): Promise<void> => {
    await expectBoth(page, expected, where);
    await expect(page.getByTestId('prop-color'), `${where}: 속성 패널 색 입력값`).toHaveValue(color);
    expect(await selectedOnCanvas(page), `${where}: 선택(메인) 그대로`).toEqual(['main']);
    const s = await navState(page);
    expect({ back: s.back, forward: s.forward }, `${where}: 버튼`).toEqual(buttons);
  };

  // QA-55: 버튼
  await back(page);
  await at(initial, '#0052ff', { back: false, forward: true }, 'QA-55 [실행 취소]');
  await forward(page);
  await at(red, '#cf202f', { back: true, forward: false }, 'QA-55 [다시 실행]');

  // QA-61: 단축키 → 단축키 → 버튼 → 단축키 (같은 칸을 움직임)
  await pressBack(page);
  await at(initial, '#0052ff', { back: false, forward: true }, 'QA-61 Ctrl+Z');
  await pressForward(page);
  await at(red, '#cf202f', { back: true, forward: false }, 'QA-61 Ctrl+Shift+Z');
  await back(page);
  await at(initial, '#0052ff', { back: false, forward: true }, 'QA-61 [실행 취소] 버튼');
  await pressForward(page);
  await at(red, '#cf202f', { back: true, forward: false }, 'QA-61 Ctrl+Shift+Z (버튼 뒤)');
});

test('QA-56 · 57 · 62 Patch 안 한 편집은 이동하면 버려지고(실행 취소 · 다시 실행 모두), 실행 취소 뒤 편집 없는 [Patch]는 아무 일도 안 하며 [다시 실행]은 계속 켜져 있다', async ({ page }) => {
  await page.goto(URL);
  const initial = await areaSnapshot(page, 'real');
  await setMainLabel(page, '확인');
  await patch(page);
  const A = await areaSnapshot(page, 'real');

  // QA-56: 크기 L을 고르기만(Patch 안 함) → [실행 취소] = 편집 버려지고 처음 모습
  await page.getByTestId('prop-size').selectOption('L');
  expect(await areaSnapshot(page, 'test'), '헛돌지 않게: 테스트 영역은 L 편집 중').not.toEqual(A);
  await back(page);
  await expectBoth(page, initial, 'QA-56 [실행 취소]');
  await expect(page.getByTestId('prop-size')).toHaveValue('M');
  await expect(page.getByTestId('prop-label')).toHaveValue('버튼');
  // [다시 실행] = A (확인 · M), 버려진 L은 안 돌아온다
  await forward(page);
  await expectBoth(page, A, 'QA-56 [다시 실행]');
  await expect(page.getByTestId('prop-size')).toHaveValue('M');
  await expect(page.getByTestId('prop-label')).toHaveValue('확인');

  // QA-57: B(크기 L)까지 Patch 후 [실행 취소]해서 A 칸, 라벨 `임시`를 고르기만 → [다시 실행] = 편집 버리고 B
  await page.getByTestId('prop-size').selectOption('L');
  await patch(page);
  const B = await areaSnapshot(page, 'real');
  expect(B.every((b) => b.cls.includes('btn-L'))).toBe(true);
  await back(page);
  await expectBoth(page, A, 'QA-57 A 칸');
  await page.getByTestId('prop-label').fill('임시');
  expect((await areaSnapshot(page, 'test'))[0].label, '헛돌지 않게: 테스트 영역은 `임시` 편집 중').toBe('임시');
  await forward(page);
  await expectBoth(page, B, 'QA-57 [다시 실행]');
  await expect(page.getByTestId('prop-label')).toHaveValue('확인');
  await expect(page.getByTestId('prop-size')).toHaveValue('L');

  // QA-62: A 칸으로 돌아가 편집 없이 [Patch] 3번 = 무변경 (실제 영역 변경 0 · 박스 0 · 테스트 영역도 그대로), [다시 실행] 계속 켜짐
  await back(page);
  await expectBoth(page, A, 'QA-62 A 칸');
  const mut = await watchSel(page, 'real', '[data-testid="real-area"]');
  const mutTest = await watchSel(page, 'test', '[data-testid="canvas"]');
  const flash = await watchFlash(page);
  for (let i = 0; i < 3; i += 1) await patch(page);
  expect((await mut.take()).total, '실제 영역 DOM 변경 0').toBe(0);
  expect((await mutTest.take()).total, '테스트 영역 DOM 변경 0').toBe(0);
  expect((await flash.take()).boxes, '박스 0').toHaveLength(0);
  await expectBoth(page, A, 'QA-62 [Patch] ×3 뒤');
  expect(await navState(page), '[다시 실행] 계속 켜짐').toEqual({ patch: true, back: true, forward: true });
  await forward(page);
  await expectBoth(page, B, 'QA-62 [다시 실행]');
});

test('QA-58 · 59 인스턴스 b4를 추가해 [Patch]한 뒤 고르고 [실행 취소] = b4가 두 영역 · 레이어에서 사라지고 선택이 풀리며 [다시 실행]해도 선택은 풀린 채, 번호는 재사용되지 않는다(b5 · b6)', async ({ page }) => {
  await page.goto(URL);
  const initial = await areaSnapshot(page, 'real');
  await clickAdd(page);
  await patch(page);
  const withB4 = await areaSnapshot(page, 'real');
  expect(withB4.map((b) => b.id)).toEqual(['main', 'b1', 'b2', 'b3', 'b4']);
  await selectOnCanvas(page, 'b4');
  expect(await titleText(page)).toContain('인스턴스');
  expect(await layerOrder(page)).toEqual(['b1', 'b2', 'b3', 'b4']);

  // QA-58: [실행 취소] = b4 사라짐 + 선택 풀림
  await back(page);
  await expectBoth(page, initial, 'QA-58 [실행 취소]');
  expect(await canvasOrder(page)).toEqual(['b1', 'b2', 'b3']);
  expect(await layerOrder(page)).toEqual(['b1', 'b2', 'b3']);
  await expect(page.getByTestId('figma-button')).toHaveCount(4);
  expect(await selectedOnCanvas(page)).toEqual([]);
  expect(await selectedInLayer(page)).toEqual([]);
  await expect(page.locator('.selected')).toHaveCount(0);
  await expect(page.getByTestId('property-empty')).toBeVisible();
  // [다시 실행] = b4가 돌아오지만 선택은 풀린 채
  await forward(page);
  await expectBoth(page, withB4, 'QA-58 [다시 실행]');
  expect(await layerOrder(page)).toEqual(['b1', 'b2', 'b3', 'b4']);
  expect(await selectedOnCanvas(page)).toEqual([]);
  expect(await selectedInLayer(page)).toEqual([]);
  await expect(page.getByTestId('property-empty')).toBeVisible();

  // QA-59: [실행 취소] 뒤 [+ 인스턴스] = b5 (b4 번호 재사용 안 함), [다시 실행]은 Patch 안 한 b5를 버리고 b4 모습, 다시 [+ 인스턴스] = b6
  await back(page);
  await clickAdd(page);
  expect(await canvasOrder(page)).toEqual(['b1', 'b2', 'b3', 'b5']);
  await forward(page);
  expect(await canvasOrder(page)).toEqual(['b1', 'b2', 'b3', 'b4']);
  await expectBoth(page, withB4, 'QA-59 [다시 실행]');
  await clickAdd(page);
  expect(await canvasOrder(page)).toEqual(['b1', 'b2', 'b3', 'b4', 'b6']);
});

test('QA-60 고른 인스턴스 b2의 색 override가 [실행 취소]하면 이전 칸 값으로 돌아간다: 선택 · 속성 패널 제목은 그대로, override 표시(↻)가 사라지고 [다시 실행]하면 돌아온다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'b2');
  const title = await titleText(page);
  expect(title).toContain('인스턴스');
  await pickColor(page, '#05b169');
  expect(await overriddenFields(page), 'b2는 처음부터 라벨이 override, 색이 더해짐').toEqual(['label', 'color']);
  await patch(page);
  const green = await areaSnapshot(page, 'real');
  expect(green[2].bg).toBe(rgb('#05b169'));

  await back(page);
  expect(await selectedOnCanvas(page), '선택은 b2 그대로').toEqual(['b2']);
  expect(await titleText(page)).toBe(title);
  expect(await overriddenFields(page), '색 override 표시(↻)가 사라지고 라벨만 남음').toEqual(['label']);
  await expect(page.locator(inRow('color', 'prop-reset'))).toHaveCount(0);
  await expect(page.getByTestId('prop-color')).toHaveValue('#0052ff');
  expect((await areaSnapshot(page, 'real'))[2].bg).toBe(BLUE);
  expect((await areaSnapshot(page, 'test'))[2].bg).toBe(BLUE);

  await forward(page);
  expect(await overriddenFields(page)).toEqual(['label', 'color']);
  await expectBoth(page, green, 'QA-60 [다시 실행]');
  expect(await selectedOnCanvas(page)).toEqual(['b2']);
});

test('QA-A38 처음 칸 · 끝 칸에서 편집만 한 상태는 꺼진 [실행 취소] · [다시 실행] · 단축키로 버려지지 않고(명세 「처음 · 끝에서는 꺼짐」 우선), 그 상태를 [Patch]하면 정상적으로 새 기록이 된다', async ({ page }) => {
  await page.goto(URL);
  const initial = await areaSnapshot(page, 'real');
  const mut = await watchSel(page, 'real', '[data-testid="real-area"]');
  const flash = await watchFlash(page);

  // ① 처음 칸(기록 0칸)에서 라벨을 `임시`로 바꾸고 포커스를 뺀 뒤 꺼진 [실행 취소] · Ctrl+Z
  await setMainLabel(page, '임시');
  await blurFocus(page);
  const edited = await areaSnapshot(page, 'test');
  expect(edited[0].label).toBe('임시');
  await page.getByTestId('back-button').click({ force: true });
  await pressBack(page);
  expect(await areaSnapshot(page, 'test'), '편집이 안 버려짐').toEqual(edited);
  await expect(page.getByTestId('prop-label')).toHaveValue('임시');
  expect(await areaSnapshot(page, 'real')).toEqual(initial);
  expect((await mut.take()).total, '실제 영역 DOM 변경 0').toBe(0);
  expect((await flash.take()).boxes, '박스 0').toHaveLength(0);

  // ② 라벨 `임시` → [Patch] (A, 끝 칸), 크기 L을 고르기만 한 뒤 꺼진 [다시 실행] · Ctrl+Shift+Z
  await patch(page);
  const A = await areaSnapshot(page, 'real');
  await flash.take();
  await mut.take();
  await page.getByTestId('prop-size').selectOption('L');
  const editedL = await areaSnapshot(page, 'test');
  expect(editedL.every((b) => b.cls.includes('btn-L'))).toBe(true);
  await page.getByTestId('forward-button').click({ force: true });
  await pressForward(page);
  expect(await areaSnapshot(page, 'test'), '편집이 안 버려짐').toEqual(editedL);
  await expect(page.getByTestId('prop-size')).toHaveValue('L');
  expect(await areaSnapshot(page, 'real')).toEqual(A);
  expect((await mut.take()).total, '실제 영역 DOM 변경 0').toBe(0);
  expect((await flash.take()).boxes, '박스 0').toHaveLength(0);

  // 이 상태를 [Patch]하면 정상적으로 새 기록
  await patch(page);
  const B = await areaSnapshot(page, 'real');
  expect(B).toEqual(editedL);
  expect(await navState(page)).toEqual({ patch: true, back: true, forward: false });
  await back(page);
  await expectBoth(page, A, 'A38 [실행 취소]');
});

test('QA-A39 Patch 안 한 삭제는 [실행 취소]하면 버려져 b2가 되살아나고(선택은 풀린 채), [다시 실행]하면 A 모습(b2 있음 · 라벨 `확인`)이다', async ({ page }) => {
  await page.goto(URL);
  const initial = await areaSnapshot(page, 'real');
  await setMainLabel(page, '확인');
  await patch(page);
  const A = await areaSnapshot(page, 'real');
  await selectOnCanvas(page, 'b2');
  await page.keyboard.press('Delete'); // Patch 안 함
  expect(await canvasOrder(page), '헛돌지 않게: 삭제됨').toEqual(['b1', 'b3']);
  expect(await selectedOnCanvas(page)).toEqual([]);

  await back(page);
  await expectBoth(page, initial, 'A39 [실행 취소]');
  expect(await canvasOrder(page)).toEqual(['b1', 'b2', 'b3']);
  expect(await layerOrder(page)).toEqual(['b1', 'b2', 'b3']);
  expect(await selectedOnCanvas(page)).toEqual([]);
  expect(await selectedInLayer(page)).toEqual([]);
  await expect(page.getByTestId('property-empty')).toBeVisible();

  await forward(page);
  await expectBoth(page, A, 'A39 [다시 실행]');
  expect(await canvasOrder(page)).toEqual(['b1', 'b2', 'b3']);
  expect((await areaSnapshot(page, 'test'))[0].label).toBe('확인');
});

test('QA-A40 특수문자 · 빈 라벨을 [Patch]한 뒤 [실행 취소] ×3 · [다시 실행] ×2 왕복: 칸마다 두 영역 · 라벨 입력칸 값이 같고 `b` 요소 0개, 글자 span 4개 노드는 그대로다', async ({ page }) => {
  const special = '<b>x</b> &amp; "q" \'a\' 😀';
  await page.goto(URL);
  const initial = await areaSnapshot(page, 'real');
  const testSpanSel = `${buttonSel('main')} [data-testid="btn-label"]`;
  await holdReal(page, { testMainLabel: testSpanSel }, { area: 'app-root' });
  await setMainLabel(page, special);
  await patch(page);
  const S = await areaSnapshot(page, 'real');
  await page.getByTestId('prop-label').fill('');
  await patch(page);
  const E = await areaSnapshot(page, 'real');
  expect(S[0].label).toBe(special);
  expect(E.map((b) => b.label)).toEqual(['', '', '취소', '삭제']);

  const at = async (expected: ButtonLook[], labelValue: string, where: string): Promise<void> => {
    await expectBoth(page, expected, where);
    await expect(page.getByTestId('prop-label'), `${where}: 라벨 입력칸 값`).toHaveValue(labelValue);
    expect(await page.getByTestId('canvas').locator('b').count(), `${where}: 테스트 영역 b 요소 0개`).toBe(0);
    expect(await page.getByTestId('real-area').locator('b').count(), `${where}: 실제 영역 b 요소 0개`).toBe(0);
    await expect(page.getByTestId('btn-label')).toHaveCount(4);
    await expect(page.getByTestId('real-btn-label')).toHaveCount(4);
  };
  await at(E, '', '끝 칸 (빈 글자)');
  await back(page);
  await at(S, special, '[실행 취소] 1');
  await back(page);
  await at(initial, '버튼', '[실행 취소] 2');
  await page.getByTestId('back-button').click({ force: true }); // 3번째 = 처음이라 꺼진 버튼
  await at(initial, '버튼', '[실행 취소] 3 (꺼짐)');
  await forward(page);
  await at(S, special, '[다시 실행] 1');
  await forward(page);
  await at(E, '', '[다시 실행] 2');
  expect(await sameReal(page, 'testMainLabel', testSpanSel, { area: 'app-root' }), '테스트 영역 메인 글자 span이 같은 노드').toBe(true);
});

test('QA-A37 인스턴스를 60번 더하고 긴 라벨(`A`×200)로 [Patch]해도 desktop은 페이지가 안 늘고 실제 영역 구역 안에서 스크롤되며, 두 크기 모두 가로 스크롤 · 버튼 넘침이 없다', async ({ page }, testInfo) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');
  await page.getByTestId('prop-size').selectOption('L');
  const COUNT = 60;
  for (let i = 0; i < COUNT; i += 1) await clickAdd(page);
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
