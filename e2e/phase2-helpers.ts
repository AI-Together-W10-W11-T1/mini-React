import type { Page } from '@playwright/test';
import { holdNodes as holdNodes1, sameNode as sameNode1, isStillConnected as isStillConnected1, test, expect, expectNoConsoleWarnings } from './phase1-helpers';
import type { NodeSpec } from './phase1-helpers';

// [AI Note]: Phase 2 e2e 공통 도구. `test`는 phase1-helpers의 확장(콘솔 error 한 건이라도 있으면 실패, 선언하지 않은 dialog도 실패)을
// 그대로 다시 내보낸다. Phase 2 검증 페이지에는 alert가 없으므로 captureAlert를 쓰는 시나리오가 없다.
export { test, expect, expectNoConsoleWarnings };
export type { NodeSpec };

export const URL = '/phase2-app/';
/** 영역 상자 `data-testid` (index.html의 보이지 않는 감싸개 <div>, 안에 App() 결과 <main> 하나) */
export const AREA = 'app-root';

/** 노드를 붙잡아 둔다 (영역 상자는 app-root) */
export function holdNodes(page: Page, nodes: Record<string, NodeSpec>): Promise<void> {
  return holdNodes1(page, nodes, { area: AREA });
}

/** 붙잡아 둔 노드가 지금 spec이 가리키는 노드와 같은 참조(`===`)인가 */
export function sameNode(page: Page, name: string, spec: NodeSpec): Promise<boolean> {
  return sameNode1(page, name, spec, { area: AREA });
}

export function isStillConnected(page: Page, name: string): Promise<boolean> {
  return isStillConnected1(page, name);
}

// ---------------------------------------------------------------------------
// DOM 변경 관찰: 본문과 기록판(`log-*`)을 따로 센다
// ---------------------------------------------------------------------------

export interface MutationCounts {
  characterData: number;
  attributes: number;
  childList: number;
  total: number;
  /** `종류:target` 목록. target은 요소면 태그 이름, 글자 · 주석 노드면 `#text` · `#comment` */
  targets: string[];
}

export interface AppMutations {
  /** 기록판(`data-testid`가 `log-`로 시작하는 요소) 안을 뺀 나머지 */
  body: MutationCounts;
  /** 기록판 안 (effect · patch 칸은 effect가 textContent로 직접 쓰므로 본문과 섞지 않는다) */
  log: MutationCounts;
}

export interface AppWatcher {
  /** 지금까지 모인 기록을 본문 · 기록판으로 나눠 요약하고 비운다 */
  take(): Promise<AppMutations>;
}

/** `app-root`에 MutationObserver를 심는다 */
export async function watchApp(page: Page): Promise<AppWatcher> {
  await page.evaluate((id) => {
    const target = document.querySelector(`[data-testid="${id}"]`);
    if (target === null) throw new Error(`data-testid="${id}"가 없다`);
    const store = { observer: null as MutationObserver | null, records: [] as MutationRecord[] };
    store.observer = new MutationObserver((list) => store.records.push(...list));
    store.observer.observe(target, { subtree: true, childList: true, attributes: true, characterData: true });
    (window as unknown as Record<string, unknown>).__appMut = store;
  }, AREA);
  return {
    async take() {
      return page.evaluate(() => {
        const store = (window as unknown as { __appMut: { observer: MutationObserver; records: MutationRecord[] } }).__appMut;
        const records = [...store.records, ...store.observer.takeRecords()];
        store.records.length = 0;
        const empty = (): MutationCounts => ({ characterData: 0, attributes: 0, childList: 0, total: 0, targets: [] });
        const out = { body: empty(), log: empty() };
        const describe = (n: Node): string =>
          n.nodeType === Node.TEXT_NODE ? '#text' : n.nodeType === Node.COMMENT_NODE ? '#comment' : (n as Element).localName;
        for (const r of records) {
          const el = r.target.nodeType === Node.ELEMENT_NODE ? (r.target as Element) : r.target.parentElement;
          const side = el !== null && el.closest('[data-testid^="log-"]') !== null ? out.log : out.body;
          side[r.type] += 1;
          side.total += 1;
          side.targets.push(`${r.type}:${describe(r.target)}`);
        }
        return out;
      });
    },
  };
}

// ---------------------------------------------------------------------------
// 읽기 도우미
// ---------------------------------------------------------------------------

/** 가로 스크롤이 없는가 (문서 폭이 화면 폭 이하) */
export function noHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
}

/** 기록판 칸(`log-*`)의 숫자. 칸에는 숫자만 들어 있다 */
export async function logNumber(page: Page, id: 'log-render' | 'log-effect' | 'log-memo' | 'log-patch' | 'log-patch-events'): Promise<number> {
  const text = (await page.getByTestId(id).textContent()) ?? '';
  return Number(text);
}

/** 지금까지 `App()`이 실행된 횟수 (기록판 `log-render` 칸) */
export function renderCount(page: Page): Promise<number> {
  return logNumber(page, 'log-render');
}

/** `[count]` effect가 실행된 횟수 (기록판 `log-effect` 칸) */
export function effectCount(page: Page): Promise<number> {
  return logNumber(page, 'log-effect');
}

/** ③ 목록의 `useMemo`가 다시 계산한 횟수 (기록판 `log-memo` 칸) */
export function memoCount(page: Page): Promise<number> {
  return logNumber(page, 'log-memo');
}

/** 마지막 update의 patch 전체 줄 수 (`log-patch`) */
export function patchCount(page: Page): Promise<number> {
  return logNumber(page, 'log-patch');
}

/** 마지막 update의 patch 중 이벤트 교체(`SET_EVENT`) 줄 수 (`log-patch-events`) */
export function patchEventCount(page: Page): Promise<number> {
  return logNumber(page, 'log-patch-events');
}

/** `counter-value` 칸의 글 (숫자만 들어 있다) */
export async function counterText(page: Page): Promise<string> {
  return (await page.getByTestId('counter-value').textContent()) ?? '';
}

/** 할 일 입력창에 글을 쓰고 [추가]를 누른다 */
export async function addTodo(page: Page, text: string): Promise<void> {
  await page.getByTestId('todo-input').fill(text);
  await page.getByTestId('todo-add').click();
}

/** 항목 줄 `<li>`를 가리키는 선택자 (`data-id`) */
export function itemSel(id: string): string {
  return `[data-testid="todo-item"][data-id="${id}"]`;
}

/** 항목 줄 안의 요소를 가리키는 선택자 (예: `inItem('todo-1', 'todo-remove')`) */
export function inItem(id: string, testId: string): string {
  return `${itemSel(id)} [data-testid="${testId}"]`;
}

/** 화면에 보이는 항목 글자들 (위에서 아래 순서) */
export function itemTexts(page: Page): Promise<string[]> {
  return page.getByTestId('todo-text').allTextContents();
}

/** 화면에 보이는 항목 id들 (위에서 아래 순서) */
export function itemIds(page: Page): Promise<string[]> {
  return page.getByTestId('todo-item').evaluateAll((els) => els.map((el) => el.getAttribute('data-id') ?? ''));
}
