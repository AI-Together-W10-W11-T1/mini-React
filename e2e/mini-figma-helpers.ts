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
// 동작
// ---------------------------------------------------------------------------

/** 캔버스의 그 버튼을 눌러 고른다 */
export async function selectOnCanvas(page: Page, id: string): Promise<void> {
  await page.locator(buttonSel(id)).click();
}

/** 레이어 창의 그 행을 눌러 고른다 (행 이름 쪽을 눌러서 [↑] [↓]가 안 눌리게 한다) */
export async function selectInLayer(page: Page, id: string): Promise<void> {
  await page.locator(`${layerSel(id)} [data-testid="layer-name"]`).click();
}

/** 포커스를 입력칸 밖으로 뺀다. 늘 있는 요소를 쓰는 `activeElement.blur()` (선택이 없을 때 사라지는 property-title을 누르지 않는다) */
export async function blurFocus(page: Page): Promise<void> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}

/** Ctrl+Z (포커스를 먼저 뺀다). 키 연결은 Dev-11에서 들어온다 */
export async function pressUndo(page: Page): Promise<void> {
  await blurFocus(page);
  await page.keyboard.press('Control+KeyZ');
}

/** Ctrl+Shift+Z (포커스를 먼저 뺀다) */
export async function pressRedo(page: Page): Promise<void> {
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

/** 지금 「메인 따름」 글자가 있는 칸들 (칸 순서대로) */
export function followingFields(page: Page): Promise<PropField[]> {
  return page
    .locator('[data-testid="prop-row"]')
    .evaluateAll((els) => els.filter((el) => el.querySelector('[data-testid="prop-follow"]') !== null).map((el) => el.getAttribute('data-field') as PropField));
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
