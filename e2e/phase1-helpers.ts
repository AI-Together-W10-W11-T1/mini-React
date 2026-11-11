import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
// [AI Note]: style 속성 글을 엔진과 같은 규칙으로 쪼개려고 DOM 없는 순수 함수만 상대 경로로 가져온다 (패키지 별칭은 Playwright가 모른다).
import { parseStyleText } from '../packages/react-dom-bindings/src/client/style';

export const URL = '/phase1-vdom-playground/';

/** 실제 영역 초기 샘플 (dev_todo 「실제 영역 초기 샘플」, index.html에 직접 써 둔 것과 같다) */
export const SAMPLE_HTML = `<section id="card" class="card">
  <h2>제목</h2>
  <!-- 안내 문구 -->
  <p class="note" style="color: red; font-size: 16px">안녕</p>
  <ul>
    <li>하나</li>
    <li>둘</li>
    <li>셋</li>
  </ul>
  <button disabled>잠김</button>
</section>`;

// ---------------------------------------------------------------------------
// 공통 장치 ① dialog 감시 ② 콘솔 감시 (A5)
// ---------------------------------------------------------------------------

interface PageWatch {
  /** `captureAlert`가 선언한 동작이 진행 중인 횟수 (0이면 alert는 모두 선언 없는 것) */
  expecting: number;
  undeclaredDialogs: string[];
  errors: string[];
  warnings: string[];
}

const watches = new WeakMap<Page, PageWatch>();

function watchOf(page: Page): PageWatch {
  const w = watches.get(page);
  if (w === undefined) throw new Error('이 page에는 감시 장치가 없습니다. e2e/phase1-helpers.ts의 test를 쓰세요.');
  return w;
}

// [AI Note]: Playwright는 핸들러가 없으면 alert를 조용히 닫아 버린다. 검사기가 정상 글을 잘못 막아도 모르고 지나가지 않도록
// 선언하지 않은 dialog는 닫은 뒤 테스트를 실패시킨다. 콘솔 error · pageerror가 한 건이라도 있으면 모든 테스트가 실패한다.
export const test = base.extend<{ watch: void }>({
  watch: [
    async ({ page }, use) => {
      const w: PageWatch = { expecting: 0, undeclaredDialogs: [], errors: [], warnings: [] };
      watches.set(page, w);
      page.on('console', (m) => {
        if (m.type() === 'error') w.errors.push(`console.error: ${m.text()}`);
        else if (m.type() === 'warning') w.warnings.push(`console.warning: ${m.text()}`);
      });
      page.on('pageerror', (e) => w.errors.push(`pageerror: ${e.message}`));
      page.on('dialog', async (dialog) => {
        if (w.expecting > 0) return; // captureAlert가 처리한다
        w.undeclaredDialogs.push(`${dialog.type()}: ${dialog.message()}`);
        await dialog.dismiss();
      });
      await use();
      expect(w.undeclaredDialogs, '선언하지 않은 dialog가 떴다 (captureAlert로 선언해야 한다)').toEqual([]);
      expect(w.errors, '콘솔 error · pageerror가 있다').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** QA-1 · QA-A2 · QA-A4: 콘솔 경고도 0건이어야 하는 시나리오가 끝에서 부른다 */
export function expectNoConsoleWarnings(page: Page): void {
  expect(watchOf(page).warnings, '콘솔 warning이 있다').toEqual([]);
}

/**
 * alert를 기대하는 동작을 선언한다. 동작 중 뜬 alert는 글을 모아 확인(accept)하고, 정확히 한 번 떠야 통과한다.
 * 돌려주는 값은 alert 글이다.
 */
export async function captureAlert(page: Page, action: () => Promise<unknown>): Promise<string> {
  const w = watchOf(page);
  const messages: string[] = [];
  const onDialog = async (dialog: import('@playwright/test').Dialog): Promise<void> => {
    messages.push(dialog.message());
    await dialog.accept();
  };
  w.expecting++;
  page.on('dialog', onDialog);
  try {
    await action();
    await expect.poll(() => messages.length, { message: '선언한 alert가 뜨지 않았다' }).toBeGreaterThan(0);
  } finally {
    page.off('dialog', onDialog);
    w.expecting--;
  }
  expect(messages, 'alert는 한 번만 떠야 한다').toHaveLength(1);
  return messages[0];
}

// ---------------------------------------------------------------------------
// 구조 비교 (structureOf · structureOfHtml)
// ---------------------------------------------------------------------------

export type StructNode =
  | { t: 'text'; v: string }
  | { t: 'comment'; v: string }
  | {
      t: 'el';
      tag: string;
      /** 이름 → 값 (이름 순으로 정렬: 속성 순서는 비교하지 않는다). `style`은 따로 둔다 */
      attrs: Array<[string, string]>;
      /** `el.style.cssText` + `style` 속성 글을 엔진 규칙으로 쪼갠 항목 집합 (브라우저가 모르는 항목을 버리는 것을 잡는다, A4) */
      style: { cssText: string; items: Array<[string, string]> } | null;
      children: StructNode[];
    };

// 페이지 안에서 DOM을 훑어 raw 구조(글 그대로)를 만든다. 반복문 대신 재귀지만 e2e 샘플 크기라 문제 없다
interface RawNode {
  t: 'text' | 'comment' | 'el';
  v?: string;
  tag?: string;
  attrs?: Array<[string, string]>;
  styleAttr?: string | null;
  cssText?: string;
  children?: RawNode[];
}

function finalize(raw: RawNode): StructNode {
  if (raw.t === 'text') return { t: 'text', v: raw.v ?? '' };
  if (raw.t === 'comment') return { t: 'comment', v: raw.v ?? '' };
  const attrs = (raw.attrs ?? []).slice().sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const style =
    raw.styleAttr === null || raw.styleAttr === undefined
      ? null
      : {
          cssText: raw.cssText ?? '',
          items: Object.entries(parseStyleText(raw.styleAttr)).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
        };
  return { t: 'el', tag: raw.tag ?? '', attrs, style, children: (raw.children ?? []).map(finalize) };
}

/** 영역 상자(`data-testid`) 안 자식들의 구조. 영역 상자 자신은 비교하지 않는다 (§5) */
export async function structureOf(page: Page, testId: string): Promise<StructNode[]> {
  const raw = await page.evaluate((id) => {
    const walk = (node: Node): RawNode => {
      if (node.nodeType === Node.TEXT_NODE) return { t: 'text', v: node.nodeValue ?? '' };
      if (node.nodeType === Node.COMMENT_NODE) return { t: 'comment', v: node.nodeValue ?? '' };
      const el = node as HTMLElement;
      return {
        t: 'el',
        tag: el.localName,
        attrs: Array.from(el.attributes)
          .filter((a) => a.name !== 'style')
          .map((a): [string, string] => [a.name, a.value]),
        styleAttr: el.getAttribute('style'),
        cssText: el.style.cssText,
        children: Array.from(el.childNodes).map(walk),
      };
    };
    const area = document.querySelector(`[data-testid="${id}"]`);
    if (area === null) throw new Error(`data-testid="${id}"가 없다`);
    return Array.from(area.childNodes).map(walk);
  }, testId);
  return raw.map(finalize);
}

/** HTML 글을 `<template>`에 넣어 파싱한 구조 (편집창 글과 비교할 때 쓴다) */
export async function structureOfHtml(page: Page, html: string): Promise<StructNode[]> {
  const raw = await page.evaluate((source) => {
    const walk = (node: Node): RawNode => {
      if (node.nodeType === Node.TEXT_NODE) return { t: 'text', v: node.nodeValue ?? '' };
      if (node.nodeType === Node.COMMENT_NODE) return { t: 'comment', v: node.nodeValue ?? '' };
      const el = node as HTMLElement;
      return {
        t: 'el',
        tag: el.localName,
        attrs: Array.from(el.attributes)
          .filter((a) => a.name !== 'style')
          .map((a): [string, string] => [a.name, a.value]),
        styleAttr: el.getAttribute('style'),
        cssText: el.style.cssText,
        children: Array.from(el.childNodes).map(walk),
      };
    };
    const template = document.createElement('template');
    template.innerHTML = source;
    return Array.from(template.content.childNodes).map(walk);
  }, html);
  return raw.map(finalize);
}

/** 영역(`real-area` · `test-area`)의 구조와 편집창 글의 구조가 모두 같은지 세 칸을 한 번에 비교한다 */
export async function expectThreeSame(page: Page): Promise<void> {
  const real = await structureOf(page, 'real-area');
  const test = await structureOf(page, 'test-area');
  const editor = await structureOfHtml(page, await page.getByTestId('html-editor').inputValue());
  expect(test, '테스트 영역 ≠ 실제 영역').toEqual(real);
  expect(editor, '편집창 글 ≠ 실제 영역').toEqual(real);
}

// ---------------------------------------------------------------------------
// 참조 유지 (holdNodes · sameNode)
// ---------------------------------------------------------------------------

/** 노드를 가리키는 법: 영역 안 CSS 선택자, `child`를 주면 그 요소의 `childNodes[child]` (글자 · 주석 노드) */
export type NodeSpec = string | { sel: string; child: number };

export interface HoldOptions {
  /** 기본 `real-area` */
  area?: string;
}

function resolveInPage(areaId: string, spec: NodeSpec): Node | null {
  const area = document.querySelector(`[data-testid="${areaId}"]`);
  if (area === null) return null;
  const sel = typeof spec === 'string' ? spec : spec.sel;
  const el = sel === ':area' ? area : area.querySelector(sel);
  if (el === null) return null;
  return typeof spec === 'string' ? el : (el.childNodes[spec.child] ?? null);
}

/** 이름을 붙여 노드를 `window.__keep`에 붙잡아 둔다 (DOM 속성은 쓰지 않는다) */
export async function holdNodes(page: Page, nodes: Record<string, NodeSpec>, options: HoldOptions = {}): Promise<void> {
  await page.evaluate(
    ({ nodes: map, areaId, resolverSource }) => {
      const resolve = new Function('areaId', 'spec', `return (${resolverSource})(areaId, spec)`) as (a: string, s: unknown) => Node | null;
      const w = window as unknown as { __keep?: Record<string, Node | null> };
      w.__keep = w.__keep ?? {};
      for (const [name, spec] of Object.entries(map)) {
        const found = resolve(areaId, spec);
        if (found === null) throw new Error(`붙잡을 노드가 없다: ${name}`);
        w.__keep[name] = found;
      }
    },
    { nodes, areaId: options.area ?? 'real-area', resolverSource: resolveInPage.toString() },
  );
}

/** 붙잡아 둔 노드가 지금 `spec`이 가리키는 노드와 같은 참조(`===`)인가 */
export async function sameNode(page: Page, name: string, spec: NodeSpec, options: HoldOptions = {}): Promise<boolean> {
  return page.evaluate(
    ({ name: key, spec: s, areaId, resolverSource }) => {
      const resolve = new Function('areaId', 'spec', `return (${resolverSource})(areaId, spec)`) as (a: string, s: unknown) => Node | null;
      const kept = (window as unknown as { __keep?: Record<string, Node | null> }).__keep?.[key];
      if (kept === undefined || kept === null) throw new Error(`붙잡아 둔 노드가 없다: ${key}`);
      return kept === resolve(areaId, s);
    },
    { name, spec, areaId: options.area ?? 'real-area', resolverSource: resolveInPage.toString() },
  );
}

/** 붙잡아 둔 노드가 아직 문서에 붙어 있는가 (`isConnected`) */
export async function isStillConnected(page: Page, name: string): Promise<boolean> {
  return page.evaluate((key) => {
    const kept = (window as unknown as { __keep?: Record<string, Node | null> }).__keep?.[key];
    if (kept === undefined || kept === null) throw new Error(`붙잡아 둔 노드가 없다: ${key}`);
    return kept.isConnected;
  }, name);
}

// ---------------------------------------------------------------------------
// DOM 변경 관찰 (observeMutations)
// ---------------------------------------------------------------------------

export interface MutationSummary {
  characterData: number;
  attributes: number;
  childList: number;
  total: number;
  /** `종류:target` 목록. target은 요소면 태그 이름, 글자 · 주석 노드면 `#text` · `#comment` */
  targets: string[];
}

export interface MutationWatcher {
  /** 지금까지 모인 기록을 요약하고 비운다 */
  takeSummary(): Promise<MutationSummary>;
}

/** 영역에 `MutationObserver`를 심는다. 기록은 `takeSummary()`가 종류별 개수 · target 태그로 요약한다 (B1 ~ B3 · QA-8) */
export async function observeMutations(page: Page, area = 'real-area'): Promise<MutationWatcher> {
  const key = `__mut_${area}`;
  await page.evaluate(
    ({ id, slot }) => {
      const target = document.querySelector(`[data-testid="${id}"]`);
      if (target === null) throw new Error(`data-testid="${id}"가 없다`);
      const store = { observer: null as MutationObserver | null, records: [] as MutationRecord[] };
      store.observer = new MutationObserver((list) => store.records.push(...list));
      store.observer.observe(target, { subtree: true, childList: true, attributes: true, characterData: true });
      (window as unknown as Record<string, unknown>)[slot] = store;
    },
    { id: area, slot: key },
  );
  return {
    async takeSummary() {
      return page.evaluate((slot) => {
        const store = (window as unknown as Record<string, { observer: MutationObserver; records: MutationRecord[] }>)[slot];
        const records = [...store.records, ...store.observer.takeRecords()];
        store.records.length = 0;
        const describe = (n: Node): string =>
          n.nodeType === Node.TEXT_NODE ? '#text' : n.nodeType === Node.COMMENT_NODE ? '#comment' : (n as Element).localName;
        const out = { characterData: 0, attributes: 0, childList: 0, total: records.length, targets: [] as string[] };
        for (const r of records) {
          out[r.type] += 1;
          out.targets.push(`${r.type}:${describe(r.target)}`);
        }
        return out;
      }, key);
    },
  };
}

// ---------------------------------------------------------------------------
// 편집창 도우미 (edit)
// ---------------------------------------------------------------------------

export async function editorValue(page: Page): Promise<string> {
  return page.getByTestId('html-editor').inputValue();
}

/** 편집창 글을 읽어 `fn`으로 일부만 바꾼 글로 다시 채운다 (샘플 들여쓰기에 기대지 않기 위해). 채운 글을 돌려준다 */
export async function edit(page: Page, fn: (current: string) => string, options: { allowSame?: boolean } = {}): Promise<string> {
  const editor = page.getByTestId('html-editor');
  const current = await editor.inputValue();
  const next = fn(current);
  // 글이 그대로면 `replace`가 아무것도 못 찾은 것일 수 있다 (예: boolean 속성은 편집창에서 `disabled=""`로 보인다). 조용히 넘어가지 않는다
  if (next === current && options.allowSame !== true) throw new Error('edit: 편집창 글이 바뀌지 않았다 (replace 대상을 못 찾았나?)');
  await editor.fill(next);
  return next;
}
