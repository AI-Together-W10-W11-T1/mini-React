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
