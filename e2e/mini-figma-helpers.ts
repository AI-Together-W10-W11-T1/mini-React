import type { Page } from '@playwright/test';
import { test, expect, expectNoConsoleWarnings, holdNodes, sameNode, isStillConnected, watchApp, noHorizontalScroll } from './phase2-helpers';
import type { NodeSpec } from './phase2-helpers';

// [AI Note]: mini-figma e2e 공통 도구. 영역 상자 이름(`app-root`)이 phase2와 같아서 phase2-helpers의 holdNodes · sameNode ·
// watchApp · noHorizontalScroll을 그대로 다시 내보낸다. `test`는 phase1-helpers의 확장이라 콘솔 error · 선언 안 한 dialog가 있으면 실패한다.
export { test, expect, expectNoConsoleWarnings, holdNodes, sameNode, isStillConnected, watchApp, noHorizontalScroll };
export type { NodeSpec };

export const URL = '/mini-figma/';
export const AREA = 'app-root';

// ---------------------------------------------------------------------------
// 선택자 · 읽기
// ---------------------------------------------------------------------------

/** 캔버스 버튼 하나(`data-id` = `main` 또는 `b1` …) */
export function buttonSel(id: string): string {
  return `[data-testid="figma-button"][data-id="${id}"]`;
}

/** 레이어 행 하나 (인스턴스 행은 `data-id`, 메인 행은 `layer-main`) */
export function layerSel(id: string): string {
  return id === 'main' ? '[data-testid="layer-main"]' : `[data-testid="layer-item"][data-id="${id}"]`;
}

/** 캔버스 버튼들의 글자 (메인 버튼 → 인스턴스들, 위치 순). 아이콘 글자는 빼고 `btn-label`만 읽는다 */
export function canvasLabels(page: Page): Promise<string[]> {
  return page.getByTestId('btn-label').allTextContents();
}

/** 레이어 창의 인스턴스 행 id들 (위에서 아래 순서) */
export function layerOrder(page: Page): Promise<string[]> {
  return page.getByTestId('layer-item').evaluateAll((els) => els.map((el) => el.getAttribute('data-id') ?? ''));
}

/** 캔버스의 인스턴스 버튼 id들 (메인 버튼은 뺌, 위치 순) */
export function canvasOrder(page: Page): Promise<string[]> {
  return page
    .locator('[data-testid="canvas-instances"] [data-testid="figma-button"]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-id') ?? ''));
}

/** `selected` 클래스가 붙은 캔버스 버튼들의 id (위치 순) */
export function selectedOnCanvas(page: Page): Promise<string[]> {
  return page.locator('[data-testid="figma-button"].selected').evaluateAll((els) => els.map((el) => el.getAttribute('data-id') ?? ''));
}

/** `selected` 클래스가 붙은 레이어 행들의 id (메인 행은 `main`) */
export function selectedInLayer(page: Page): Promise<string[]> {
  return page
    .locator('[data-testid="layer-main"].selected, [data-testid="layer-item"].selected')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-id') ?? ''));
}

/** 속성 패널 머리 글 (`<h2 data-testid="property-title">`) */
export async function titleText(page: Page): Promise<string> {
  return (await page.getByTestId('property-title').textContent()) ?? '';
}

// ---------------------------------------------------------------------------
// 색 읽기 (FD-23: 버튼은 클래스가 아니라 style로 칠한다 → 클래스 대신 computed style을 값으로 읽는다)
// ---------------------------------------------------------------------------

/** `#rrggbb` → `rgb(r, g, b)` (computed style이 돌려주는 글과 같은 모양) */
export function rgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

/** 캔버스 버튼 하나의 배경색 (`rgb(r, g, b)`) */
export function bgOf(page: Page, id: string): Promise<string> {
  return page.locator(buttonSel(id)).evaluate((el) => getComputedStyle(el).backgroundColor);
}

/** 캔버스 버튼 하나의 글자색 (`rgb(r, g, b)`) */
export function textOf(page: Page, id: string): Promise<string> {
  return page.locator(buttonSel(id)).evaluate((el) => getComputedStyle(el).color);
}

/** 캔버스 버튼 하나의 class 글 */
export async function classOf(page: Page, id: string): Promise<string> {
  return (await page.locator(buttonSel(id)).getAttribute('class')) ?? '';
}

/** 메인 · b1 · b2 · b3 버튼의 배경색 (위치 순) */
export async function colorsOf(page: Page): Promise<string[]> {
  const out: string[] = [];
  for (const id of ['main', 'b1', 'b2', 'b3']) out.push(await bgOf(page, id));
  return out;
}

// ---------------------------------------------------------------------------
// 동작
// ---------------------------------------------------------------------------

/** 색 칩 하나를 누른다 (속성 패널 팔레트 판, `data-color` = `#rrggbb`) */
export async function pickColor(page: Page, hex: string): Promise<void> {
  await page.locator(`[data-testid="color-chip"][data-color="${hex}"]`).click();
}

/** 색 입력칸(`<input type="color">`)에 값을 넣는다 — Playwright `fill`은 `input` + `change`를 보낸다 */
export async function pickColorInput(page: Page, hex: string): Promise<void> {
  await page.getByTestId('prop-color').fill(hex);
}

/** 캔버스의 그 버튼을 눌러 고른다 */
export async function selectOnCanvas(page: Page, id: string): Promise<void> {
  await page.locator(buttonSel(id)).click();
}

/** [+ 인스턴스]를 누른다. 버튼은 메인을 골랐을 때만 속성 패널 오른쪽 아래에 있으므로, 없으면 메인을 먼저 고른다 */
export async function clickAdd(page: Page): Promise<void> {
  if ((await page.getByTestId('add-instance').count()) === 0) await selectOnCanvas(page, 'main');
  await page.getByTestId('add-instance').click();
}

/** 레이어 창의 그 행을 눌러 고른다 (행 이름 쪽을 눌러서 [↑] [↓]가 안 눌리게 한다) */
export async function selectInLayer(page: Page, id: string): Promise<void> {
  await page.locator(`${layerSel(id)} [data-testid="layer-name"]`).click();
}

/** 레이어 행의 [↑] 또는 [↓]를 누른다 (행 고르기와는 별개 — 고르기가 안 바뀌어야 한다, ④-4) */
export async function moveInLayer(page: Page, id: string, direction: 'up' | 'down'): Promise<void> {
  await page.locator(`${layerSel(id)} [data-testid="layer-${direction}"]`).click();
}

/** 포커스를 입력칸 밖으로 뺀다. 늘 있는 요소를 쓰는 `activeElement.blur()` (선택이 없을 때 사라지는 property-title을 누르지 않는다) */
export async function blurFocus(page: Page): Promise<void> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}

/** Ctrl+Z = 실제 영역 State History [실행 취소] (포커스를 먼저 뺀다 — 라벨 글자 칸 안의 키는 앱이 무시하므로) */
export async function pressBack(page: Page): Promise<void> {
  await blurFocus(page);
  await page.keyboard.press('Control+KeyZ');
}

/** Ctrl+Shift+Z = 실제 영역 [다시 실행] (포커스를 먼저 뺀다) */
export async function pressForward(page: Page): Promise<void> {
  await blurFocus(page);
  await page.keyboard.press('Control+Shift+KeyZ');
}

/**
 * `document`의 keydown 등록 · 해제 횟수를 세는 장치를 심는다 (`window.__keydown = { add, remove }`).
 * `page.goto` 전에 불러야 한다. 지금 남은 리스너 수는 `keydownListenerCount`.
 */
export async function installKeydownCounter(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const counter = { add: 0, remove: 0 };
    (window as unknown as { __keydown: typeof counter }).__keydown = counter;
    const add = document.addEventListener.bind(document);
    const remove = document.removeEventListener.bind(document);
    document.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
      if (type === 'keydown') counter.add += 1;
      add(type, listener, options);
    }) as typeof document.addEventListener;
    document.removeEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) => {
      if (type === 'keydown') counter.remove += 1;
      remove(type, listener, options);
    }) as typeof document.removeEventListener;
  });
}

/** 지금 남은 keydown 리스너 수 (등록 − 해제) */
export function keydownListenerCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const c = (window as unknown as { __keydown: { add: number; remove: number } }).__keydown;
    return c.add - c.remove;
  });
}

// ---------------------------------------------------------------------------
// 속성 패널 · 한 노드 관찰
// ---------------------------------------------------------------------------

export type PropField = 'label' | 'size' | 'hasIcon' | 'icon' | 'color';
export const PROP_FIELDS: readonly PropField[] = ['label', 'size', 'hasIcon', 'icon', 'color'];

/** 속성 패널의 칸 하나 (`data-field`) */
export function rowSel(field: PropField): string {
  return `[data-testid="prop-row"][data-field="${field}"]`;
}

/** 칸 안의 요소 선택자. 예: `inRow('label', 'prop-reset')` */
export function inRow(field: PropField, testId: string): string {
  return `${rowSel(field)} [data-testid="${testId}"]`;
}

/** 지금 override 표시(`override` 클래스 + ↻ 버튼)가 있는 칸들 (칸 순서대로) */
export function overriddenFields(page: Page): Promise<PropField[]> {
  return page
    .locator('[data-testid="prop-row"].override')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-field') as PropField));
}

/** 지금 메인을 따르는 칸들 (칸 순서대로) = 인스턴스를 골랐을 때 override 표시가 없는 칸. 「메인 따름」 글자는 없앴다 — 표시 없음이 곧 메인 따름. 메인을 골랐으면 빈 배열 */
export function followingFields(page: Page): Promise<PropField[]> {
  return page.locator('[data-testid="property-panel"]').evaluate((panel) =>
    panel.querySelector('[data-testid="property-title"]')?.textContent?.startsWith('인스턴스')
      ? Array.from(panel.querySelectorAll('[data-testid="prop-row"]:not(.override)')).map((el) => el.getAttribute('data-field') as PropField)
      : [],
  );
}

export interface NodeWatcher {
  /** 지금까지 모인 DOM 변경 기록을 종류별로 세고 비운다 (그 노드의 자손 포함) */
  take(): Promise<{ characterData: number; attributes: number; childList: number; total: number }>;
}

/** `app-root` 안 CSS 선택자로 고른 노드 하나에 MutationObserver를 심는다 (버튼마다 따로 변경을 세고 싶을 때) */
export async function watchSel(page: Page, name: string, selector: string): Promise<NodeWatcher> {
  const slot = `__nodeMut_${name}`;
  await page.evaluate(
    ({ sel, key }) => {
      const target = document.querySelector(`[data-testid="${'app-root'}"] ${sel}`);
      if (target === null) throw new Error(`관찰할 노드가 없다: ${sel}`);
      const store = { observer: null as MutationObserver | null, records: [] as MutationRecord[] };
      store.observer = new MutationObserver((list) => store.records.push(...list));
      store.observer.observe(target, { subtree: true, childList: true, attributes: true, characterData: true });
      (window as unknown as Record<string, unknown>)[key] = store;
    },
    { sel: selector, key: slot },
  );
  return {
    take() {
      return page.evaluate((key) => {
        const store = (window as unknown as Record<string, { observer: MutationObserver; records: MutationRecord[] }>)[key];
        const records = [...store.records, ...store.observer.takeRecords()];
        store.records.length = 0;
        const out = { characterData: 0, attributes: 0, childList: 0, total: records.length };
        for (const r of records) out[r.type] += 1;
        return out;
      }, slot);
    },
  };
}

// ---------------------------------------------------------------------------
// 실제 영역 (patch-preview, task_006) — 두 영역 비교 · 깜빡임 기록
// ---------------------------------------------------------------------------

/** 실제 영역 버튼 하나 (`data-id`). testid는 테스트 영역과 겹치지 않게 `real-` 접두 */
export function realButtonSel(id: string): string {
  return `[data-testid="real-figma-button"][data-id="${id}"]`;
}

export interface ButtonLook {
  id: string;
  label: string;
  icon: boolean;
  /** class에서 `selected`를 뺀 글 (두 영역의 「같은 모습」 비교에서 고르기 표시는 일부러 다르다) */
  cls: string;
  bg: string;
  fg: string;
}

/**
 * 한 영역의 버튼 모습 목록 (위치 순). 두 영역이 「같은 모습」이라는 말은 이 목록이 같다는 뜻이다 (testid · selected는 일부러 다르다).
 * `test` = 테스트 영역(캔버스), `real` = 실제 영역.
 */
export function areaSnapshot(page: Page, which: 'test' | 'real'): Promise<ButtonLook[]> {
  const prefix = which === 'real' ? 'real-' : '';
  return page.evaluate((pre) => {
    return Array.from(document.querySelectorAll<HTMLElement>(`[data-testid="${pre}figma-button"]`)).map((b) => {
      const cs = getComputedStyle(b);
      return {
        id: b.getAttribute('data-id') ?? '',
        label: b.querySelector(`[data-testid="${pre}btn-label"]`)?.textContent ?? '',
        icon: b.querySelector(`[data-testid="${pre}btn-icon"]`) !== null,
        cls: (b.getAttribute('class') ?? '').split(/\s+/).filter((c) => c !== 'selected' && c !== '').join(' '),
        bg: cs.backgroundColor,
        fg: cs.color,
      };
    });
  }, prefix);
}

/** 실제 영역 버튼들의 글자 (위치 순) */
export function realLabels(page: Page): Promise<string[]> {
  return page.getByTestId('real-btn-label').allTextContents();
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FlashRecord {
  /** 깜빡임 박스(`.viz-box`)가 생길 때마다 쌓은 위치 · 크기 (문서 좌표) */
  boxes: Box[];
  /** 박스가 생긴 순간의 실제 영역 버튼 위치 (`data-id` → 문서 좌표). 박스와 같은 순간에 재서 스크롤에 안 흔들린다 */
  buttons: Record<string, Box>;
}

export interface FlashWatcher {
  /** 지금까지 생긴 박스 기록을 돌려주고 비운다 */
  take(): Promise<FlashRecord>;
}

/**
 * `real-overlay`에 박스(`.viz-box`)가 **생길 때마다** 그 위치 · 크기를 기록해 둔다. 깜빡임은 시간에 기대는 효과라 사라지는 시간은 재지 않는다.
 * 박스는 몇백 ms 뒤 사라지므로 이 기록이 「박스가 생겼다 · 바뀐 노드 위에 있다」의 근거다. `page.goto` 뒤, 동작 전에 부른다.
 */
export async function watchFlash(page: Page): Promise<FlashWatcher> {
  await page.evaluate(() => {
    const layer = document.querySelector('[data-testid="real-overlay"]');
    if (layer === null) throw new Error('real-overlay가 없다');
    const store = { boxes: [] as Box[], buttons: {} as Record<string, Box> };
    const toBox = (r: DOMRect): Box => ({ x: r.x + window.scrollX, y: r.y + window.scrollY, width: r.width, height: r.height });
    const observer = new MutationObserver((list) => {
      let added = false;
      for (const record of list) {
        for (const node of Array.from(record.addedNodes)) {
          if (node instanceof HTMLElement && node.classList.contains('viz-box')) {
            store.boxes.push(toBox(node.getBoundingClientRect()));
            added = true;
          }
        }
      }
      if (added) {
        for (const b of Array.from(document.querySelectorAll<HTMLElement>('[data-testid="real-figma-button"]'))) {
          store.buttons[b.getAttribute('data-id') ?? ''] = toBox(b.getBoundingClientRect());
        }
      }
    });
    observer.observe(layer, { childList: true });
    (window as unknown as { __flash: typeof store }).__flash = store;
  });
  return {
    take() {
      return page.evaluate(() => {
        const store = (window as unknown as { __flash: FlashRecord }).__flash;
        const out = { boxes: [...store.boxes], buttons: { ...store.buttons } };
        store.boxes.length = 0;
        store.buttons = {};
        return out;
      });
    },
  };
}

/** 박스 안에 들어 있나 (`tol`px 여유) */
export function boxInside(inner: Box, outer: Box, tol = 1): boolean {
  return inner.x >= outer.x - tol && inner.y >= outer.y - tol && inner.x + inner.width <= outer.x + outer.width + tol && inner.y + inner.height <= outer.y + outer.height + tol;
}

/** 두 상자가 겹치나 (닿기만 하는 것은 겹침이 아님) */
export function boxOverlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** 두 상자가 `tol`px 안에서 같은가 */
export function boxSame(a: Box, b: Box, tol = 2): boolean {
  return Math.abs(a.x - b.x) <= tol && Math.abs(a.y - b.y) <= tol && Math.abs(a.width - b.width) <= tol && Math.abs(a.height - b.height) <= tol;
}

/** 깜빡임 층의 `data-last-patch-count` · `data-last-flash-count` (아직 없으면 null) */
export function overlayCounts(page: Page): Promise<{ patch: string | null; flash: string | null }> {
  return page.getByTestId('real-overlay').evaluate((el) => ({ patch: el.getAttribute('data-last-patch-count'), flash: el.getAttribute('data-last-flash-count') }));
}

/** 실제 영역 버튼 3개의 켜짐 · 꺼짐 */
export async function navState(page: Page): Promise<{ patch: boolean; back: boolean; forward: boolean }> {
  return {
    patch: await page.getByTestId('patch-button').isEnabled(),
    back: await page.getByTestId('back-button').isEnabled(),
    forward: await page.getByTestId('forward-button').isEnabled(),
  };
}

/** 메인을 고르고 속성 패널 라벨 칸에 글자를 넣는다 (Playwright `fill`은 `input`을 보낸다) */
export async function setMainLabel(page: Page, label: string): Promise<void> {
  await selectOnCanvas(page, 'main');
  await page.getByTestId('prop-label').fill(label);
}

/** 실제 영역 버튼 하나의 배경색 (`rgb(r, g, b)`) */
export function realBgOf(page: Page, id: string): Promise<string> {
  return page.locator(realButtonSel(id)).evaluate((el) => getComputedStyle(el).backgroundColor);
}

/** 실제 영역 버튼 하나의 class 글 */
export async function realClassOf(page: Page, id: string): Promise<string> {
  return (await page.locator(realButtonSel(id)).getAttribute('class')) ?? '';
}

// ---------------------------------------------------------------------------
// 변수 (variables, task_007) — 레이어 창 안 변수 구역 · 속성 패널 변수 상자
// ---------------------------------------------------------------------------

export interface VariableRow {
  id: string;
  name: string;
  /** 색 입력칸 값 */
  value: string;
  /** hex 글자 */
  hex: string;
  /** 색 칩의 배경색 (`rgb(r, g, b)`) */
  chip: string;
}

/** 변수 줄 하나 (`data-id` = `primary` · `danger` · `success`) */
export function variableRowSel(id: string): string {
  return `[data-testid="variable-row"][data-id="${id}"]`;
}

/** 변수 구역의 줄들 (위에서 아래 순서) */
export function variableRows(page: Page): Promise<VariableRow[]> {
  return page.getByTestId('variable-row').evaluateAll((els) =>
    els.map((el) => ({
      id: el.getAttribute('data-id') ?? '',
      name: el.querySelector('[data-testid="variable-name"]')?.textContent ?? '',
      value: (el.querySelector('[data-testid="variable-color"]') as HTMLInputElement).value,
      hex: el.querySelector('[data-testid="variable-hex"]')?.textContent ?? '',
      chip: getComputedStyle(el.querySelector('[data-testid="variable-chip"]') as Element).backgroundColor,
    })),
  );
}

/** 그 이름의 변수 줄 색 입력칸에 값을 넣는다 (`fill` = `input` + `change`, 색 입력칸은 task_005 `pickColorInput`과 같은 방식) */
export async function setVariable(page: Page, name: string, hex: string): Promise<void> {
  await page
    .getByTestId('variable-row')
    .filter({ has: page.getByTestId('variable-name').getByText(name, { exact: true }) })
    .getByTestId('variable-color')
    .fill(hex);
}

/** 속성 패널 색 구역의 변수 상자 (`prop-variable`) */
export function linkSelect(page: Page) {
  return page.getByTestId('prop-variable');
}

/** 변수 상자에서 고른다 (`name` = 변수 이름 또는 「없음」). Playwright `selectOption`은 `input` 이벤트를 보낸다 */
export async function linkTo(page: Page, name: string): Promise<void> {
  await linkSelect(page).selectOption({ label: name });
}
