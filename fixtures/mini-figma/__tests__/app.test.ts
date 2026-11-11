import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { render } from '@mini-react/react-dom';
import type { FunctionComponent } from '@mini-react/react-reconciler';
import type { Patch, Path, StateHook, VNode } from '@mini-react/shared';
import { App } from '../App';
import { INITIAL_DOC } from '../model';
import { PALETTE, textColorFor } from '../color';
import { EMPTY_UNDO } from '../undo';
import type { UndoState } from '../undo';

// [AI Note]: mini-figma 앱 단위 테스트 (jsdom, render(App, root)). 화면에는 patch 목록 · 렌더 횟수를 그리지 않으므로(MF-05)
// patch 종류 · 개수는 render()가 돌려주는 인스턴스의 lastPatches로 확인한다.
// 공통 규칙: ① 테스트마다 unmount()를 afterEach에서 부른다 (document의 keydown 리스너가 다음 테스트로 새지 않게)
// ② document.addEventListener spy는 render() 호출 전에 건다 (Dev-11) ③ 준비 동작마다 `await Promise.resolve()`로 렌더를 끝낸 뒤
// 센 동작을 한다 (Batching, 결정 9 B — 같은 틱에 보내면 렌더가 합쳐져 lastPatches에 준비 동작의 줄이 섞인다).

const CANVAS_PREFIX: Path = [0, 1];
const LAYER_PREFIX: Path = [0, 0];

const startsWith = (path: Path, prefix: Path): boolean => prefix.every((n, i) => path[i] === n);
/** patch가 가리키는 경로 (MOVE는 parent) */
const pathOf = (patch: Patch): Path => (patch.kind === 'MOVE' ? patch.parent : patch.path);

/**
 * patch 중 그 영역(접두 경로)의 줄만 모아 `SET_EVENT`를 빼고 종류별 개수로 센다 (qa_todo 「patch 기대 표」 · 공통 주의 13).
 * 렌더마다 핸들러가 새 함수라 SET_EVENT 줄이 생기는 것은 task_002의 알려진 한계라 센 값에서 뺀다.
 * 속성 패널(`[0, 2]`)은 value · checked 때문에 SET_PROP이 섞여서 세지 않는다.
 */
function countsUnder(patches: readonly Patch[], prefix: Path): Record<string, number> {
  const out: Record<string, number> = {};
  for (const patch of patches) {
    if (patch.kind === 'SET_EVENT' || !startsWith(pathOf(patch), prefix)) continue;
    out[patch.kind] = (out[patch.kind] ?? 0) + 1;
  }
  return out;
}
const canvasCounts = (patches: readonly Patch[]): Record<string, number> => countsUnder(patches, CANVAS_PREFIX);
const layerCounts = (patches: readonly Patch[]): Record<string, number> => countsUnder(patches, LAYER_PREFIX);

let root: HTMLElement;
let instance: FunctionComponent;
/** App이 실행된 횟수 = 렌더 횟수 (화면에 렌더 횟수를 안 그리므로 감싸개로 센다) */
let renders = 0;
const CountedApp = (): VNode => {
  renders += 1;
  return App();
};

const area = (): HTMLElement => {
  const app = root.firstElementChild as HTMLElement | null;
  if (app === null) throw new Error('영역 상자 안에 <div class="app">이 없다');
  return app;
};
const testId = (el: Element | undefined | null): string | null => el?.getAttribute('data-testid') ?? null;
const buttons = (): HTMLElement[] => Array.from(root.querySelectorAll<HTMLElement>('[data-testid="figma-button"]'));
const labels = (): string[] => Array.from(root.querySelectorAll('[data-testid="btn-label"]')).map((el) => el.textContent ?? '');
const buttonOf = (id: string): HTMLElement => {
  const found = buttons().find((b) => b.getAttribute('data-id') === id);
  if (found === undefined) throw new Error(`캔버스에 ${id} 버튼이 없다`);
  return found;
};
const layerRow = (id: string): HTMLElement => {
  const found = root.querySelector<HTMLElement>(id === 'main' ? '[data-testid="layer-main"]' : `[data-testid="layer-item"][data-id="${id}"]`);
  if (found === null) throw new Error(`레이어에 ${id} 행이 없다`);
  return found;
};
/** 사용자가 누른 뒤 마이크로태스크 Batching(결정 9 B)으로 렌더가 끝나길 기다린다. 준비 동작마다 한 번씩 부른다 */
const click = async (el: Element): Promise<void> => {
  (el as HTMLElement).click();
  await Promise.resolve();
};
const byId = (id: string): HTMLElement => {
  const found = root.querySelector<HTMLElement>(`[data-testid="${id}"]`);
  if (found === null) throw new Error(`data-testid="${id}"가 없다`);
  return found;
};
/** 입력칸에 글자를 쓰고 `input` 이벤트를 보낸 뒤 렌더가 끝나길 기다린다 (사용자가 한 글자 입력한 것과 같다) */
const typeInto = async (id: string, text: string): Promise<void> => {
  const input = byId(id) as HTMLInputElement;
  input.value = text;
  input.dispatchEvent(new Event('input'));
  await Promise.resolve();
};
/** 색 칩 하나를 누르고 렌더가 끝나길 기다린다 */
const chipOf = (hex: string): HTMLElement => {
  const found = root.querySelector<HTMLElement>(`[data-testid="color-chip"][data-color="${hex}"]`);
  if (found === null) throw new Error(`색 칩 ${hex}가 없다`);
  return found;
};
const pick = (hex: string): Promise<void> => click(chipOf(hex));
const chips = (): HTMLElement[] => Array.from(root.querySelectorAll<HTMLElement>('[data-testid="color-chip"]'));
/** 지금 aria-pressed="true"인 칩의 색들 */
const pressedChips = (): (string | null)[] => chips().filter((c) => c.getAttribute('aria-pressed') === 'true').map((c) => c.getAttribute('data-color'));
const choose = async (id: string, value: string): Promise<void> => {
  const select = byId(id) as HTMLSelectElement;
  select.value = value;
  select.dispatchEvent(new Event('input'));
  await Promise.resolve();
};
const toggle = async (id: string, checked: boolean): Promise<void> => {
  const box = byId(id) as HTMLInputElement;
  box.checked = checked;
  box.dispatchEvent(new Event('input'));
  await Promise.resolve();
};
/** App의 useState 칸 값 (호출 순서: 0 doc · 1 selectedId · 2 history · 3 nextId) */
const slot = (index: number): unknown => (instance.hooks[index] as StateHook).value;
const layerNames = (): string[] =>
  Array.from(root.querySelectorAll('[data-testid="layer-item"] [data-testid="layer-name"]')).map((el) => el.textContent ?? '');

/** `#rrggbb` → jsdom이 style에서 돌려주는 `rgb(r, g, b)` 글 */
const rgb = (hex: string): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};
/** 버튼의 배경색 · 글자색 (색은 클래스가 아니라 인라인 style, FD-23) */
const bgOf = (id: string): string => buttonOf(id).style.getPropertyValue('background-color');
const fgOf = (id: string): string => buttonOf(id).style.getPropertyValue('color');
const bgs = (): string[] => ['main', 'b1', 'b2', 'b3'].map(bgOf);
/** 한 patch 목록에서 캔버스 접두 안 SET_STYLE 줄만 */
const canvasStyles = (patches: readonly Patch[]): Patch[] => patches.filter((p) => p.kind === 'SET_STYLE' && startsWith(p.path, CANVAS_PREFIX));

/** document의 addEventListener · removeEventListener 호출 기록 (render() 전에 걸어야 처음 등록까지 잡힌다 — 1회차 NON-BLOCKING 7) */
let addSpy: MockInstance;
let removeSpy: MockInstance;
const keydownCalls = (spy: MockInstance): number => spy.mock.calls.filter((call) => call[0] === 'keydown').length;
/** 지금 남아 있는 keydown 리스너 수 = 등록 − 해제 */
const keydownListeners = (): number => keydownCalls(addSpy) - keydownCalls(removeSpy);

beforeEach(() => {
  root = document.createElement('div');
  root.setAttribute('data-testid', 'app-root');
  document.body.append(root);
  renders = 0;
  addSpy = vi.spyOn(document, 'addEventListener');
  removeSpy = vi.spyOn(document, 'removeEventListener');
  instance = render(CountedApp, root);
});

afterEach(() => {
  instance.unmount();
  root.remove();
  vi.restoreAllMocks();
});

describe('patch 세는 도우미 (canvasCounts · layerCounts)', () => {
  const p = (path: Path): Patch => ({ kind: 'SET_TEXT', path, before: 'a', after: 'b' });
  const patches: Patch[] = [
    p([0, 1, 1, 0, 0]),
    p([0, 1, 0, 0, 0]),
    p([0, 0, 1, 2, 0]),
    { kind: 'SET_EVENT', path: [0, 1, 1, 0], event: 'click', before: null, after: () => {} },
    { kind: 'SET_PROP', path: [0, 2, 1], name: 'value', before: 'a', after: 'b' },
    { kind: 'MOVE', parent: [0, 1, 1], from: 0, to: 1 },
    { kind: 'MOVE', parent: [0, 0, 1], from: 0, to: 1 },
  ];

  it('캔버스(접두 [0, 1]) 줄만 종류별로 세고 SET_EVENT는 뺀다. MOVE는 parent 경로로 본다', () => {
    expect(canvasCounts(patches)).toEqual({ SET_TEXT: 2, MOVE: 1 });
  });

  it('레이어(접두 [0, 0]) 줄만 센다. 속성 패널 줄은 어느 쪽에도 안 들어간다', () => {
    expect(layerCounts(patches)).toEqual({ SET_TEXT: 1, MOVE: 1 });
  });
});

describe('시작 화면 (MF-16 · MF-04)', () => {
  it('영역 상자 안 최상위는 <div class="app"> 하나이고 자식 순서는 레이어 · 캔버스 · 속성 패널이다 (경로 접두 [0,0] · [0,1] · [0,2])', () => {
    expect(root.children).toHaveLength(1);
    expect(area().localName).toBe('div');
    expect(area().className).toBe('app');
    expect(Array.from(area().children).map(testId)).toEqual(['layer-panel', 'canvas', 'property-panel']);
    // canvasCounts의 접두 [0, 1]이 정말 캔버스를 가리키는지 한 줄로 지킨다
    expect(testId(root.firstElementChild?.children[1])).toBe('canvas');
    expect(testId(root.firstElementChild?.children[0])).toBe('layer-panel');
  });

  it('캔버스에 메인 버튼 1개 + 인스턴스 버튼 3개, 글자는 버튼 · 버튼 · 취소 · 삭제', () => {
    const canvas = area().children[1];
    expect(canvas.querySelectorAll('[data-testid="canvas-main"] [data-testid="figma-button"]')).toHaveLength(1);
    expect(canvas.querySelectorAll('[data-testid="canvas-instances"] [data-testid="figma-button"]')).toHaveLength(3);
    expect(buttons().map((b) => b.getAttribute('data-id'))).toEqual(['main', 'b1', 'b2', 'b3']);
    expect(labels()).toEqual(['버튼', '버튼', '취소', '삭제']);
  });

  it('Button에 메인 값(크기 M · 파랑 · 아이콘 없음)이 들어가고 b3만 색이 빨강이다 — 색은 style(배경 · 글자색)로 칠하고 클래스에 색 이름이 없다 (FD-23 · 24)', () => {
    const classes = buttons().map((b) => b.className);
    for (const c of classes) expect(c.split(' ')).toContain('btn-M');
    for (const c of classes) expect(c).not.toMatch(/btn-(blue|red|green)/);
    expect(bgs()).toEqual([rgb('#0052ff'), rgb('#0052ff'), rgb('#0052ff'), rgb('#cf202f')]);
    expect(bgs()).toEqual(['rgb(0, 82, 255)', 'rgb(0, 82, 255)', 'rgb(0, 82, 255)', 'rgb(207, 32, 47)']);
    for (const id of ['main', 'b1', 'b2', 'b3']) expect(fgOf(id), `${id} 글자색`).toBe('rgb(255, 255, 255)');
    expect(root.querySelectorAll('[data-testid="btn-icon"]')).toHaveLength(0);
  });

  it('Button이 id · label · size 같은 이름을 DOM 속성으로 펼치지 않는다 (data-id만)', () => {
    for (const b of buttons()) {
      expect(b.hasAttribute('label')).toBe(false);
      expect(b.hasAttribute('size')).toBe(false);
      expect(b.hasAttribute('color')).toBe(false);
      expect(b.hasAttribute('id')).toBe(false);
      expect(b.getAttribute('type')).toBe('button');
    }
  });

  it('레이어 창에 메인 행 + b1 b2 b3 행이 있고 인스턴스 행 이름은 지금 글자다 (④-3)', () => {
    expect(root.querySelectorAll('[data-testid="layer-main"]')).toHaveLength(1);
    expect(root.querySelector('[data-testid="layer-main"]')?.textContent).toContain('메인 Button');
    expect(Array.from(root.querySelectorAll('[data-testid="layer-item"]')).map((el) => el.getAttribute('data-id'))).toEqual(['b1', 'b2', 'b3']);
    expect(layerNames()).toEqual(['버튼', '취소', '삭제']);
  });

  it('속성 패널은 빈 상태 <p data-testid="property-empty">이고 머리 <h2>는 없다', () => {
    const empty = root.querySelector('[data-testid="property-empty"]');
    expect(empty?.localName).toBe('p');
    expect(root.querySelector('[data-testid="property-title"]')).toBeNull();
  });

  it('화면에 patch · 줄 수 · 렌더 횟수를 알리는 요소가 없다 (MF-05)', () => {
    expect(root.querySelector('[data-testid^="log-"]')).toBeNull();
    expect((root.textContent ?? '').toLowerCase()).not.toContain('patch');
  });

  it('처음 그리기(mount)는 patch를 만들지 않는다 (lastPatches 비어 있음)', () => {
    expect(instance.lastPatches).toEqual([]);
  });
});

describe('고르기 (MF-20 · D-05)', () => {
  it('P-1 처음 → b2 고르기: 캔버스 { SET_ATTR: 1 } · 레이어 { SET_ATTR: 1 }, 속성 패널 경로에 REPLACE 1줄 이상(빈 <p> → 머리 <h2>)', async () => {
    const emptyP = root.querySelector('[data-testid="property-empty"]');
    await click(buttonOf('b2'));
    expect(canvasCounts(instance.lastPatches)).toEqual({ SET_ATTR: 1 });
    expect(layerCounts(instance.lastPatches)).toEqual({ SET_ATTR: 1 });
    const panelReplaces = instance.lastPatches.filter((p) => p.kind === 'REPLACE' && startsWith(p.path, [0, 2]));
    expect(panelReplaces.length).toBeGreaterThanOrEqual(1);
    // 화면: 머리 <h2> 「인스턴스 · 취소」, 빈 안내 <p>는 DOM에서 빠짐
    expect(root.querySelector('[data-testid="property-title"]')?.textContent).toBe('인스턴스 · 취소');
    expect(root.querySelector('[data-testid="property-title"]')?.localName).toBe('h2');
    expect(root.querySelector('[data-testid="property-empty"]')).toBeNull();
    expect(emptyP?.isConnected).toBe(false);
  });

  it('P-1 + b2 버튼과 b2 행에만 selected 클래스가 붙는다 (캔버스 · 레이어 모두)', async () => {
    await click(buttonOf('b2'));
    expect(buttons().filter((b) => b.classList.contains('selected')).map((b) => b.getAttribute('data-id'))).toEqual(['b2']);
    expect(Array.from(root.querySelectorAll('.layer-row.selected')).map((r) => r.getAttribute('data-id'))).toEqual(['b2']);
  });

  it('P-2 b2 선택 → b3 고르기: 캔버스 { SET_ATTR: 2 } · 레이어 { SET_ATTR: 2 } (b2 표시가 빠지고 b3에 붙음)', async () => {
    await click(buttonOf('b2'));
    await click(buttonOf('b3'));
    expect(canvasCounts(instance.lastPatches)).toEqual({ SET_ATTR: 2 });
    expect(layerCounts(instance.lastPatches)).toEqual({ SET_ATTR: 2 });
    expect(root.querySelector('[data-testid="property-title"]')?.textContent).toBe('인스턴스 · 삭제');
    expect(buttons().filter((b) => b.classList.contains('selected')).map((b) => b.getAttribute('data-id'))).toEqual(['b3']);
  });

  it('레이어 행을 눌러도 고른다 (메인 행 → 「메인 Button」, b3 행 → 「인스턴스 · 삭제」). 캔버스 · 레이어 표시가 같은 대상', async () => {
    await click(layerRow('main'));
    expect(root.querySelector('[data-testid="property-title"]')?.textContent).toBe('메인 Button');
    expect(buttonOf('main').classList.contains('selected')).toBe(true);
    expect(layerRow('main').classList.contains('selected')).toBe(true);
    await click(layerRow('b3'));
    expect(root.querySelector('[data-testid="property-title"]')?.textContent).toBe('인스턴스 · 삭제');
    expect(buttonOf('b3').classList.contains('selected')).toBe(true);
    expect(layerRow('b3').classList.contains('selected')).toBe(true);
    expect(layerRow('main').classList.contains('selected')).toBe(false);
  });

  it('이미 고른 것을 다시 누르면 같은 값이라 다시 그리지 않는다 (렌더 0번, lastPatches 그대로)', async () => {
    await click(buttonOf('b2'));
    const before = instance.lastPatches;
    await click(buttonOf('b2'));
    expect(instance.lastPatches).toBe(before);
  });

  it('고르기는 Undo 기록에 넣지 않는다: doc · history가 그대로(같은 객체), selectedId만 바뀐다', async () => {
    await click(buttonOf('b2'));
    await click(layerRow('main'));
    await click(buttonOf('b3'));
    expect(slot(0)).toBe(INITIAL_DOC);
    expect(slot(2)).toBe(EMPTY_UNDO);
    expect(slot(1)).toBe('b3');
  });
});

describe('메인 속성 편집 (MF-14 · MF-15 · P2-10 · D-01 ~ D-04) — patch 기대 표 P-3 ~ P-8', () => {
  // 준비: 메인을 골라 둔다 (준비 동작마다 렌더를 끝낸 뒤 센 동작을 한다)
  beforeEach(async () => {
    await click(buttonOf('main'));
  });

  it('메인을 고르면 속성 패널에 머리 「메인 Button」과 5칸(라벨 · 크기 · 아이콘 보이기 · 아이콘 종류 · 색)이 현재 값으로 뜬다', () => {
    expect(byId('property-title').textContent).toBe('메인 Button');
    expect(Array.from(root.querySelectorAll('[data-testid="prop-row"]')).map((r) => r.getAttribute('data-field'))).toEqual(['label', 'size', 'hasIcon', 'icon', 'color']);
    expect((byId('prop-label') as HTMLInputElement).value).toBe('버튼');
    expect((byId('prop-size') as HTMLSelectElement).value).toBe('M');
    expect((byId('prop-hasicon') as HTMLInputElement).checked).toBe(false);
    expect((byId('prop-icon') as HTMLSelectElement).value).toBe('star');
    expect((byId('prop-color') as HTMLInputElement).value).toBe('#0052ff');
  });

  it('P-3 라벨 한 글자(`버튼!`): 캔버스 { SET_TEXT: 2 }(메인 · b1, b2 · b3는 override) · 레이어 { SET_TEXT: 1 }(b1 행 이름). 렌더 한 번', async () => {
    const before = renders;
    await typeInto('prop-label', '버튼!');
    expect(canvasCounts(instance.lastPatches)).toEqual({ SET_TEXT: 2 });
    expect(layerCounts(instance.lastPatches)).toEqual({ SET_TEXT: 1 });
    expect(renders - before).toBe(1);
    expect(labels()).toEqual(['버튼!', '버튼!', '취소', '삭제']);
    expect(layerNames()).toEqual(['버튼!', '취소', '삭제']);
  });

  it('라벨 입력칸은 다시 만들지 않는다: 같은 노드이고 값은 입력한 글자 그대로 (커서 유지)', async () => {
    const input = byId('prop-label') as HTMLInputElement;
    await typeInto('prop-label', '버튼!');
    await typeInto('prop-label', '버튼!?');
    expect(byId('prop-label')).toBe(input);
    expect(input.value).toBe('버튼!?');
  });

  it('P-4 크기 `L`: 캔버스 { SET_ATTR: 4 }(class) · 레이어 { }', async () => {
    await choose('prop-size', 'L');
    expect(canvasCounts(instance.lastPatches)).toEqual({ SET_ATTR: 4 });
    expect(layerCounts(instance.lastPatches)).toEqual({});
    expect(buttons().every((b) => b.classList.contains('btn-L'))).toBe(true);
  });

  it('P-5 색 #05b169(초록): 캔버스 { SET_STYLE: 6 }(메인 · b1 · b2 × (배경 + 글자색 흰 → 먹), b3는 빨강 override) · 레이어 { }', async () => {
    await pick('#05b169');
    expect(canvasCounts(instance.lastPatches)).toEqual({ SET_STYLE: 6 });
    expect(layerCounts(instance.lastPatches)).toEqual({});
    expect(bgs()).toEqual([rgb('#05b169'), rgb('#05b169'), rgb('#05b169'), rgb('#cf202f')]);
    expect(['main', 'b1', 'b2', 'b3'].map(fgOf)).toEqual([rgb('#0a0b0d'), rgb('#0a0b0d'), rgb('#0a0b0d'), rgb('#ffffff')]);
  });

  it('P-5b 색 #cf202f(빨강): 캔버스 { SET_STYLE: 3 }(배경만 — 글자색은 흰 그대로, b3는 이미 #cf202f라 줄 없음) · 레이어 { }. 한 줄 필드는 property · before · after를 hex로 단언', async () => {
    await pick('#cf202f');
    expect(canvasCounts(instance.lastPatches)).toEqual({ SET_STYLE: 3 });
    expect(layerCounts(instance.lastPatches)).toEqual({});
    const styles = canvasStyles(instance.lastPatches);
    expect(styles).toHaveLength(3);
    for (const patch of styles) {
      expect(patch.kind === 'SET_STYLE' && { property: patch.property, before: patch.before, after: patch.after }).toEqual({ property: 'background-color', before: '#0052ff', after: '#cf202f' });
    }
  });

  it('색을 바꿔도 버튼 노드는 같은 참조이고 class 글이 그대로다', async () => {
    const held = buttons();
    const classes = held.map((b) => b.className);
    await pick('#05b169');
    expect(buttons()).toEqual(held);
    expect(buttons().map((b) => b.className)).toEqual(classes);
  });

  it('글자색은 배경에 따라 textColorFor 규칙을 따른다 (메인 · b1 · b2)', async () => {
    for (const hex of ['#05b169', '#cf202f', '#0052ff']) {
      await pick(hex);
      for (const id of ['main', 'b1', 'b2']) {
        expect(bgOf(id)).toBe(rgb(hex));
        expect(fgOf(id)).toBe(rgb(textColorFor(hex)));
      }
    }
  });

  it('P-6 아이콘 켜기: 캔버스 { INSERT: 4 }(REPLACE · REMOVE · SET_TEXT 0, 각 INSERT 경로 마지막 = 0) · 레이어 { }. 글자 <span> 노드는 같은 참조', async () => {
    const labelSpans = Array.from(root.querySelectorAll('[data-testid="btn-label"]'));
    const before = renders;
    await toggle('prop-hasicon', true);
    expect(canvasCounts(instance.lastPatches)).toEqual({ INSERT: 4 });
    expect(layerCounts(instance.lastPatches)).toEqual({});
    expect(renders - before).toBe(1);
    const inserts = instance.lastPatches.filter((p) => p.kind === 'INSERT' && startsWith(p.path, CANVAS_PREFIX));
    expect(inserts).toHaveLength(4);
    for (const p of inserts) expect(p.kind === 'INSERT' && p.path[p.path.length - 1]).toBe(0);
    // 아이콘은 글자 앞, 글자 <span>은 다시 만들지 않았다
    expect(Array.from(root.querySelectorAll('[data-testid="btn-icon"]')).map((el) => el.textContent)).toEqual(['★', '★', '★', '★']);
    expect(Array.from(root.querySelectorAll('[data-testid="btn-label"]'))).toEqual(labelSpans);
    for (const icon of Array.from(root.querySelectorAll('[data-testid="btn-icon"]'))) {
      expect(icon.nextElementSibling?.getAttribute('data-testid')).toBe('btn-label');
    }
  });

  it('P-7 (P-6 뒤) 아이콘 끄기: 캔버스 { REMOVE: 4 } · 레이어 { }', async () => {
    await toggle('prop-hasicon', true);
    await toggle('prop-hasicon', false);
    expect(canvasCounts(instance.lastPatches)).toEqual({ REMOVE: 4 });
    expect(layerCounts(instance.lastPatches)).toEqual({});
    expect(root.querySelectorAll('[data-testid="btn-icon"]')).toHaveLength(0);
  });

  it('P-8 (P-6 뒤) 종류 `♥`: 캔버스 { SET_TEXT: 4 } — 컴포넌트가 풀려 같은 <span>의 글자 변경으로만 보인다 (Instance swap). 아이콘 노드 같은 참조', async () => {
    await toggle('prop-hasicon', true);
    const icons = Array.from(root.querySelectorAll('[data-testid="btn-icon"]'));
    await choose('prop-icon', 'heart');
    expect(canvasCounts(instance.lastPatches)).toEqual({ SET_TEXT: 4 });
    expect(layerCounts(instance.lastPatches)).toEqual({});
    expect(Array.from(root.querySelectorAll('[data-testid="btn-icon"]'))).toEqual(icons);
    expect(icons.map((el) => el.textContent)).toEqual(['♥', '♥', '♥', '♥']);
  });

  it('같은 값을 다시 쓰면 렌더 0번이다 (크기 M → M)', async () => {
    const before = renders;
    await choose('prop-size', 'M');
    expect(renders - before).toBe(0);
  });

  it('메인 편집은 applyEdit를 거쳐 doc과 history를 같이 바꾼다: 같은 칸 연달아 = 한 단계로 묶이고 다른 칸이면 새 단계', async () => {
    await typeInto('prop-label', '버튼!');
    await typeInto('prop-label', '버튼!?');
    expect((slot(2) as UndoState).past).toHaveLength(1);
    expect((slot(2) as UndoState).group).toEqual({ target: 'main', field: 'label' });
    await choose('prop-size', 'L');
    expect((slot(2) as UndoState).past).toHaveLength(2);
    expect((slot(2) as UndoState).group).toEqual({ target: 'main', field: 'size' });
  });

  it('메인을 바꿔도 doc의 instances 배열은 같은 참조다', async () => {
    const before = (slot(0) as typeof INITIAL_DOC).instances;
    await pick('#05b169');
    expect((slot(0) as typeof INITIAL_DOC).instances).toBe(before);
  });
});

/** 속성 패널의 그 칸 안 ↻ 버튼 (override일 때만 있음) */
const resetButton = (field: string): HTMLElement | null => root.querySelector<HTMLElement>(`[data-testid="prop-row"][data-field="${field}"] [data-testid="prop-reset"]`);
const overriddenRows = (): string[] => Array.from(root.querySelectorAll('[data-testid="prop-row"].override')).map((r) => r.getAttribute('data-field') ?? '');
const followRows = (): string[] =>
  Array.from(root.querySelectorAll('[data-testid="prop-row"]'))
    .filter((r) => r.querySelector('[data-testid="prop-follow"]') !== null)
    .map((r) => r.getAttribute('data-field') ?? '');
/** b2 버튼 안 경로 접두: 캔버스 [0, 1] → 인스턴스 줄(1번 자식) → 위치 1 */
const B2_PATH: Path = [0, 1, 1, 1];

describe('인스턴스 속성 편집 · override 표시 · ↻ (MF-12 ~ 15 · MF-21) — patch 기대 표 P-9 ~ P-14 · P-21 · P-22', () => {
  it('인스턴스를 고르면 5칸이 합쳐진 값(메인 값 위에 인스턴스 값)으로 뜨고 override 칸은 색 구분 + ↻, 아닌 칸은 「메인 따름」이다 (b2 · b3 · b1)', async () => {
    await click(buttonOf('b2'));
    expect(byId('property-title').textContent).toBe('인스턴스 · 취소');
    expect((byId('prop-label') as HTMLInputElement).value).toBe('취소');
    expect(overriddenRows()).toEqual(['label']);
    expect(followRows()).toEqual(['size', 'hasIcon', 'icon', 'color']);
    expect(root.querySelectorAll('[data-testid="prop-reset"]')).toHaveLength(1);

    await click(buttonOf('b3'));
    expect(overriddenRows()).toEqual(['label', 'color']);
    expect(followRows()).toEqual(['size', 'hasIcon', 'icon']);
    expect((byId('prop-color') as HTMLInputElement).value).toBe('#cf202f');

    await click(buttonOf('b1'));
    expect(overriddenRows()).toEqual([]);
    expect(followRows()).toEqual(['label', 'size', 'hasIcon', 'icon', 'color']);
    expect(root.querySelectorAll('[data-testid="prop-reset"]')).toHaveLength(0);
    expect((byId('prop-label') as HTMLInputElement).value).toBe('버튼');
  });

  it('P-9 b1 선택 → 라벨 `확인`: 캔버스 { SET_TEXT: 1 } · 레이어 { SET_TEXT: 1 }. 인스턴스 편집 한 번 = 렌더 한 번', async () => {
    await click(buttonOf('b1'));
    const before = renders;
    await typeInto('prop-label', '확인');
    expect(canvasCounts(instance.lastPatches)).toEqual({ SET_TEXT: 1 });
    expect(layerCounts(instance.lastPatches)).toEqual({ SET_TEXT: 1 });
    expect(renders - before).toBe(1);
    expect(labels()).toEqual(['버튼', '확인', '취소', '삭제']);
    expect(overriddenRows()).toEqual(['label']);
    expect(byId('property-title').textContent).toBe('인스턴스 · 확인');
  });

  it('P-22 b1 선택 → 크기 `S`: 캔버스 { SET_ATTR: 1 }(b1만 btn-S, 메인 · b2 · b3는 btn-M) · 레이어 { }', async () => {
    await click(buttonOf('b1'));
    await choose('prop-size', 'S');
    expect(canvasCounts(instance.lastPatches)).toEqual({ SET_ATTR: 1 });
    expect(layerCounts(instance.lastPatches)).toEqual({});
    expect(buttons().map((b) => (b.classList.contains('btn-S') ? 'S' : b.classList.contains('btn-M') ? 'M' : '?'))).toEqual(['M', 'S', 'M', 'M']);
  });

  it('P-10 b2 선택 → 아이콘 보이기 켜기: 캔버스 { INSERT: 1 } — 경로는 b2 버튼 경로 + [0] · 레이어 { }', async () => {
    await click(buttonOf('b2'));
    await toggle('prop-hasicon', true);
    expect(canvasCounts(instance.lastPatches)).toEqual({ INSERT: 1 });
    expect(layerCounts(instance.lastPatches)).toEqual({});
    const insert = instance.lastPatches.find((p) => p.kind === 'INSERT' && startsWith(p.path, CANVAS_PREFIX));
    expect(insert?.kind === 'INSERT' && insert.path).toEqual([...B2_PATH, 0]);
    expect(buttonOf('b2').querySelector('[data-testid="btn-icon"]')?.textContent).toBe('★');
    expect(overriddenRows()).toEqual(['label', 'hasIcon']);
  });

  it('P-11 (P-10 뒤) 아이콘 종류 `♥`: 캔버스 { SET_TEXT: 1 }(b2 아이콘 글자)', async () => {
    await click(buttonOf('b2'));
    await toggle('prop-hasicon', true);
    await choose('prop-icon', 'heart');
    expect(canvasCounts(instance.lastPatches)).toEqual({ SET_TEXT: 1 });
    expect(layerCounts(instance.lastPatches)).toEqual({});
    expect(buttonOf('b2').querySelector('[data-testid="btn-icon"]')?.textContent).toBe('♥');
  });

  // P-12 · P-13의 준비: b2가 아이콘 override(켜짐 + ♥)를 가진 상태에서 메인을 고른다
  const prepareB2Icon = async (): Promise<void> => {
    await click(buttonOf('b2'));
    await toggle('prop-hasicon', true);
    await choose('prop-icon', 'heart');
    await click(buttonOf('main'));
  };

  it('P-12 b2에 아이콘 override(켜짐 + ♥)가 있는 채 메인 아이콘 켜기: 캔버스 { INSERT: 3 }(메인 · b1 · b3) — b2 경로의 줄은 0', async () => {
    await prepareB2Icon();
    await toggle('prop-hasicon', true);
    expect(canvasCounts(instance.lastPatches)).toEqual({ INSERT: 3 });
    expect(layerCounts(instance.lastPatches)).toEqual({});
    expect(instance.lastPatches.filter((p) => p.kind !== 'SET_EVENT' && startsWith(p.kind === 'MOVE' ? p.parent : p.path, B2_PATH))).toHaveLength(0);
    expect(buttonOf('b2').querySelector('[data-testid="btn-icon"]')?.textContent).toBe('♥');
  });

  it('P-13 (P-12 뒤) 메인 종류 `♥`, 이어서 `★`: 각각 캔버스 { SET_TEXT: 3 }(메인 · b1 · b3) — b2 줄 0, b2는 ♥ 그대로', async () => {
    await prepareB2Icon();
    await toggle('prop-hasicon', true);
    for (const [kind, glyph] of [['heart', '♥'], ['star', '★']] as const) {
      await choose('prop-icon', kind);
      expect(canvasCounts(instance.lastPatches)).toEqual({ SET_TEXT: 3 });
      expect(instance.lastPatches.filter((p) => p.kind !== 'SET_EVENT' && startsWith(p.kind === 'MOVE' ? p.parent : p.path, B2_PATH))).toHaveLength(0);
      expect(['main', 'b1', 'b3'].map((id) => buttonOf(id).querySelector('[data-testid="btn-icon"]')?.textContent)).toEqual([glyph, glyph, glyph]);
      expect(buttonOf('b2').querySelector('[data-testid="btn-icon"]')?.textContent).toBe('♥');
    }
  });

  it('P-14 b2: 켜짐 + ♥ override, 메인 꺼짐 → ① hasIcon ↻ = { REMOVE: 1 } ② icon ↻ = 렌더는 되지만 캔버스 줄 0 ③ 메인 켜기 = { INSERT: 4 }(b2도 ★)', async () => {
    await click(buttonOf('b2'));
    await toggle('prop-hasicon', true);
    await choose('prop-icon', 'heart');

    // ① hasIcon ↻
    const r1 = renders;
    await click(resetButton('hasIcon') as HTMLElement);
    expect(canvasCounts(instance.lastPatches)).toEqual({ REMOVE: 1 });
    expect(layerCounts(instance.lastPatches)).toEqual({});
    expect(renders - r1).toBe(1);
    expect(buttonOf('b2').querySelector('[data-testid="btn-icon"]')).toBeNull();

    // ② icon ↻ — 꺼진 상태라 눈에 보이는 변화 없음. doc은 바뀌었으니 렌더는 1번
    const r2 = renders;
    await click(resetButton('icon') as HTMLElement);
    expect(renders - r2).toBe(1);
    expect(canvasCounts(instance.lastPatches)).toEqual({});
    expect(layerCounts(instance.lastPatches)).toEqual({});
    expect(overriddenRows()).toEqual(['label']);

    // ③ 메인 켜기: 4개 버튼 모두 ★ (b2도 메인을 따라)
    await click(buttonOf('main'));
    await toggle('prop-hasicon', true);
    expect(canvasCounts(instance.lastPatches)).toEqual({ INSERT: 4 });
    expect(layerCounts(instance.lastPatches)).toEqual({});
    expect(buttons().map((b) => b.querySelector('[data-testid="btn-icon"]')?.textContent)).toEqual(['★', '★', '★', '★']);
  });

  it('P-21 b1 라벨 override(`확인`) 상태 → ↻: 캔버스 { SET_TEXT: 1 }(메인 글자로) · 레이어 { SET_TEXT: 1 }', async () => {
    await click(buttonOf('b1'));
    await typeInto('prop-label', '확인');
    const before = renders;
    await click(resetButton('label') as HTMLElement);
    expect(canvasCounts(instance.lastPatches)).toEqual({ SET_TEXT: 1 });
    expect(layerCounts(instance.lastPatches)).toEqual({ SET_TEXT: 1 });
    expect(renders - before).toBe(1);
    expect(labels()).toEqual(['버튼', '버튼', '취소', '삭제']);
    expect(overriddenRows()).toEqual([]);
  });

  it('↻ 뒤 doc의 인스턴스에 그 키가 없고 `undefined` 값도 없다. Button 글자 · class에도 undefined가 안 나오고, 이후 메인 변경을 다시 따라간다', async () => {
    await click(buttonOf('b3'));
    await click(resetButton('color') as HTMLElement);
    await click(resetButton('label') as HTMLElement);
    const b3 = (slot(0) as typeof INITIAL_DOC).instances.find((it) => it.id === 'b3');
    expect(b3).toEqual({ id: 'b3' });
    expect(Object.keys(b3 ?? {})).toEqual(['id']);
    expect(Object.values(b3 ?? {})).not.toContain(undefined);
    expect(buttons().map((b) => b.className + '|' + b.textContent).join('\n')).not.toContain('undefined');
    expect(labels()).toEqual(['버튼', '버튼', '취소', '버튼']);
    // 메인을 바꾸면 b3도 따라감
    await click(buttonOf('main'));
    await pick('#05b169');
    await typeInto('prop-label', '저장');
    expect(bgOf('b3')).toBe(rgb('#05b169'));
    expect(labels()).toEqual(['저장', '저장', '취소', '저장']);
  });

  it('빈 라벨 override: 메인 값으로 돌아가지 않고 글자 노드는 빈 글자로 남는다. 레이어 행 이름 · 패널 머리는 id', async () => {
    await click(buttonOf('b1'));
    await typeInto('prop-label', '');
    expect(labels()).toEqual(['버튼', '', '취소', '삭제']);
    expect(layerNames()).toEqual(['b1', '취소', '삭제']);
    expect(byId('property-title').textContent).toBe('인스턴스 · b1');
    expect(overriddenRows()).toEqual(['label']);
  });

  it('인스턴스 편집은 doc의 다른 인스턴스 · 메인을 같은 객체로 둔다 (참조 유지)', async () => {
    const before = slot(0) as typeof INITIAL_DOC;
    await click(buttonOf('b1'));
    await typeInto('prop-label', '확인');
    const after = slot(0) as typeof INITIAL_DOC;
    expect(after.main).toBe(before.main);
    expect(after.instances[1]).toBe(before.instances[1]);
    expect(after.instances[2]).toBe(before.instances[2]);
    expect(after.instances[0]).not.toBe(before.instances[0]);
  });

  it('인스턴스 편집 · ↻는 같은 대상 + 같은 칸이면 한 단계로 묶이고 ↻는 새 단계(묶음 끝)다', async () => {
    await click(buttonOf('b1'));
    await typeInto('prop-label', '확');
    await typeInto('prop-label', '확인');
    expect((slot(2) as UndoState).past).toHaveLength(1);
    expect((slot(2) as UndoState).group).toEqual({ target: 'b1', field: 'label' });
    await click(resetButton('label') as HTMLElement);
    expect((slot(2) as UndoState).past).toHaveLength(2);
    expect((slot(2) as UndoState).group).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Dev-3: 팔레트 판 — 칩 8개 + 직접 고르기 (FD-21 · 22 · 25, P-25 ~ P-27)
// ---------------------------------------------------------------------------

describe('팔레트 판 (Dev-3)', () => {
  const PANEL_PREFIX: Path = [0, 2];
  /** 속성 패널 줄을 SET_EVENT만 빼고 종류별로 센다 (P-25만 팔레트 구조가 정해져 있어 센다) */
  const panelCounts = (patches: readonly Patch[]): Record<string, number> => countsUnder(patches, PANEL_PREFIX);

  beforeEach(async () => {
    await click(buttonOf('main'));
  });

  it('메인을 고르면 칩 8개(data-color가 PALETTE와 같은 순서)가 있고 지금 색 칩만 aria-pressed="true", 나머지는 문자열 "false"다', () => {
    expect(chips().map((c) => c.getAttribute('data-color'))).toEqual([...PALETTE]);
    expect(PALETTE).toHaveLength(8);
    expect(pressedChips()).toEqual(['#0052ff']);
    expect(chips().filter((c) => c.getAttribute('aria-pressed') === 'false')).toHaveLength(7);
    for (const chip of chips()) {
      expect(chip.localName).toBe('button');
      expect(chip.getAttribute('type')).toBe('button');
      expect(chip.getAttribute('aria-label')).toBe(`색 ${chip.getAttribute('data-color')}`);
      expect(chip.textContent).toBe('');
      expect(chip.style.getPropertyValue('background-color')).toBe(rgb(chip.getAttribute('data-color') ?? ''));
    }
  });

  it('색 입력칸(prop-color)은 type=color이고 값은 지금 색이며, 값 글자(color-hex)도 지금 색이다. 색 칸에 <select>가 없다', () => {
    const input = byId('prop-color') as HTMLInputElement;
    expect(input.localName).toBe('input');
    expect(input.type).toBe('color');
    expect(input.value).toBe('#0052ff');
    expect(byId('color-hex').textContent).toBe('#0052ff');
    expect(root.querySelector('[data-testid="color-palette"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="prop-row"][data-field="color"] select')).toBeNull();
  });

  it('칩을 누르면 onEdit로 메인 값 · 버튼 배경 · 칩 표시 · 입력칸 값 · 값 글자가 같이 바뀐다 (칩 8개 전부)', async () => {
    for (const hex of PALETTE) {
      await pick(hex);
      expect(bgs().slice(0, 3), hex).toEqual([rgb(hex), rgb(hex), rgb(hex)]);
      expect(bgOf('b3')).toBe(rgb('#cf202f'));
      expect(pressedChips()).toEqual([hex]);
      expect((byId('prop-color') as HTMLInputElement).value).toBe(hex);
      expect(byId('color-hex').textContent).toBe(hex);
      expect((slot(0) as typeof INITIAL_DOC).main.color).toBe(hex);
    }
  });

  it('P-25 칩 #cf202f: 캔버스 { SET_STYLE: 3 } · 속성 패널 { SET_ATTR: 2(칩 두 개의 aria-pressed), SET_PROP: 1(색 입력칸 value), SET_TEXT: 1(color-hex 글자) } — 팔레트 판이 바뀐 곳만 고친다', async () => {
    const before = chips();
    const input = byId('prop-color');
    await pick('#cf202f');
    expect(canvasCounts(instance.lastPatches)).toEqual({ SET_STYLE: 3 });
    expect(layerCounts(instance.lastPatches)).toEqual({});
    expect(panelCounts(instance.lastPatches)).toEqual({ SET_ATTR: 2, SET_PROP: 1, SET_TEXT: 1 });
    // 칩 · 입력칸은 같은 노드
    expect(chips()).toEqual(before);
    expect(byId('prop-color')).toBe(input);
  });

  it('P-26 색 입력칸 input 연속 #112233 → #223344 → #334455 → #ffee00: 각각 캔버스 { SET_STYLE: 3 }, 마지막만 { SET_STYLE: 6 }(글자색 흰 → 먹). past 1칸 (한 단계)', async () => {
    const input = byId('prop-color');
    for (const hex of ['#112233', '#223344', '#334455']) {
      await typeInto('prop-color', hex);
      expect(canvasCounts(instance.lastPatches), hex).toEqual({ SET_STYLE: 3 });
      expect(pressedChips(), `${hex}는 칩 8개 밖 색`).toEqual([]);
    }
    await typeInto('prop-color', '#ffee00');
    expect(canvasCounts(instance.lastPatches)).toEqual({ SET_STYLE: 6 });
    expect(['main', 'b1', 'b2'].map(fgOf)).toEqual([rgb('#0a0b0d'), rgb('#0a0b0d'), rgb('#0a0b0d')]);
    expect(byId('color-hex').textContent).toBe('#ffee00');
    expect(byId('prop-color')).toBe(input);
    expect((slot(2) as UndoState).past).toHaveLength(1);
    expect((slot(2) as UndoState).group).toEqual({ target: 'main', field: 'color' });
  });

  it('칩 연달아 + 입력칸이 같은 칸 묶음이다: past 1칸 · 묶음 { target: main, field: color }', async () => {
    await pick('#cf202f');
    await pick('#05b169');
    await typeInto('prop-color', '#336699');
    expect((slot(2) as UndoState).past).toHaveLength(1);
    expect((slot(2) as UndoState).group).toEqual({ target: 'main', field: 'color' });
    expect((slot(0) as typeof INITIAL_DOC).main.color).toBe('#336699');
  });

  it('같은 칩 다시 누르기 · 같은 색을 입력칸에 다시 input = 렌더 0번 · lastPatches 그대로 (P-20)', async () => {
    await pick('#cf202f');
    const patches = instance.lastPatches;
    const before = renders;
    await pick('#cf202f');
    await typeInto('prop-color', '#cf202f');
    expect(renders - before).toBe(0);
    expect(instance.lastPatches).toBe(patches);
    expect((slot(2) as UndoState).past).toHaveLength(1);
  });

  it('입력칸의 input에 대문자 값이 와도 상태에는 브라우저가 정리한 소문자만 들어간다 (#EEF0F3 → #eef0f3)', async () => {
    await typeInto('prop-color', '#EEF0F3');
    expect((slot(0) as typeof INITIAL_DOC).main.color).toBe('#eef0f3');
    expect(byId('color-hex').textContent).toBe('#eef0f3');
    expect(pressedChips()).toEqual(['#eef0f3']);
    expect(bgOf('main')).toBe(rgb('#eef0f3'));
  });

  it('형식 밖 값이 와도 브라우저가 #000000으로 정리해 상태는 항상 #rrggbb다', async () => {
    await typeInto('prop-color', 'not-a-color');
    expect((slot(0) as typeof INITIAL_DOC).main.color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('인스턴스 b1(메인 따름)을 고르면 색 칸이 「메인 따름」이고 칩은 메인 색에 표시된다. 칩을 누르면 override(override 클래스 + ↻), 메인과 같은 색 칩도 override다 (MF-12)', async () => {
    await click(buttonOf('b1'));
    expect(followRows()).toContain('color');
    expect(pressedChips()).toEqual(['#0052ff']);
    await pick('#0052ff'); // 메인과 같은 값
    expect(overriddenRows()).toEqual(['color']);
    expect(resetButton('color')).not.toBeNull();
    expect((slot(0) as typeof INITIAL_DOC).instances[0]).toEqual({ id: 'b1', color: '#0052ff' });
    // 메인 색을 바꿔도 b1은 안 따라간다
    await click(buttonOf('main'));
    await pick('#05b169');
    expect(bgOf('b1')).toBe(rgb('#0052ff'));
    expect(bgOf('b2')).toBe(rgb('#05b169'));
  });

  it('↻ = 키 지우기: 인스턴스에 color 키가 없고(undefined 값도 없음) 메인 색을 다시 따라간다', async () => {
    await click(buttonOf('b1'));
    await pick('#05b169');
    await click(resetButton('color') as HTMLElement);
    expect((slot(0) as typeof INITIAL_DOC).instances[0]).toEqual({ id: 'b1' });
    expect(Object.keys((slot(0) as typeof INITIAL_DOC).instances[0])).toEqual(['id']);
    expect(followRows()).toContain('color');
    expect(bgOf('b1')).toBe(rgb('#0052ff'));
    expect(root.innerHTML).not.toContain('undefined');
    await click(buttonOf('main'));
    await pick('#f4b000');
    expect(bgOf('b1')).toBe(rgb('#f4b000'));
  });

  it('P-27 b1(메인 따름) 선택 → 칩 #05b169: 캔버스 { SET_STYLE: 2 }(b1 버튼만 배경 + 글자색, 메인 · b2 · b3 줄 0) · 속성 패널 REPLACE 1줄 이상(「메인 따름」 <span> → ↻ <button>)', async () => {
    await click(buttonOf('b1'));
    await pick('#05b169');
    expect(canvasCounts(instance.lastPatches)).toEqual({ SET_STYLE: 2 });
    expect(layerCounts(instance.lastPatches)).toEqual({});
    expect(instance.lastPatches.filter((p) => p.kind === 'REPLACE' && startsWith(p.path, PANEL_PREFIX)).length).toBeGreaterThanOrEqual(1);
    expect(bgs()).toEqual([rgb('#0052ff'), rgb('#05b169'), rgb('#0052ff'), rgb('#cf202f')]);
  });

  it('칩을 누를 때 인스턴스 고르기를 오가도 색 입력칸 · 칩 노드를 다시 만들지 않는다 (같은 색 칸 안에서)', async () => {
    const input = byId('prop-color');
    const held = chips();
    await pick('#05b169');
    await pick('#a8acb3');
    expect(byId('prop-color')).toBe(input);
    expect(chips()).toEqual(held);
  });
});

// ---------------------------------------------------------------------------
// Dev-9: 인스턴스 추가 · 삭제 · 메인 삭제 불가 (P-16 · P-17, MF-22 ~ 24)
// ---------------------------------------------------------------------------

describe('인스턴스 추가 · 삭제 (Dev-9)', () => {
  const addButton = (): HTMLElement => byId('add-instance');
  const deleteButton = (): HTMLElement => byId('delete-instance');

  it('P-16 [+ 인스턴스] 한 번 = 캔버스 { INSERT: 1 } · 레이어 { INSERT: 1 }, 렌더 1번, 끝에 b4, 선택은 그대로', async () => {
    const before = renders;
    await click(addButton());
    expect(canvasCounts(instance.lastPatches)).toEqual({ INSERT: 1 });
    expect(layerCounts(instance.lastPatches)).toEqual({ INSERT: 1 });
    expect(renders - before).toBe(1);
    expect(buttons().map((b) => b.getAttribute('data-id'))).toEqual(['main', 'b1', 'b2', 'b3', 'b4']);
    expect(layerNames()).toEqual(['버튼', '취소', '삭제', '버튼']);
    expect(slot(1)).toBeNull();
  });

  it('새 인스턴스는 override가 없다 (doc에 { id: b4 }만 있고 메인을 따른다)', async () => {
    await click(addButton());
    const doc = slot(0) as typeof INITIAL_DOC;
    expect(doc.instances[3]).toEqual({ id: 'b4' });
    expect(Object.keys(doc.instances[3])).toEqual(['id']);
    expect(Object.keys(doc)).toEqual(['main', 'instances']);
    expect(doc.instances.slice(0, 3)).toEqual(INITIAL_DOC.instances);
    // 추가는 새 단계(묶음 없음)
    expect((slot(2) as UndoState).past).toHaveLength(1);
    expect((slot(2) as UndoState).group).toBeNull();
  });

  it('P-17 b2를 고르고 [삭제] = 캔버스 { REMOVE: 1 } · 레이어 { REMOVE: 1 } + 속성 패널 REPLACE 1줄 이상(머리 <h2> → 빈 <p>, D-05), 렌더 1번, 선택 풀림', async () => {
    await click(buttonOf('b2'));
    const heading = byId('property-title');
    const before = renders;
    await click(deleteButton());
    expect(canvasCounts(instance.lastPatches)).toEqual({ REMOVE: 1 });
    expect(layerCounts(instance.lastPatches)).toEqual({ REMOVE: 1 });
    const panelReplaces = instance.lastPatches.filter((p) => p.kind === 'REPLACE' && startsWith(p.path, [0, 2]));
    expect(panelReplaces.length).toBeGreaterThanOrEqual(1);
    expect(heading.isConnected).toBe(false);
    expect(byId('property-empty').localName).toBe('p');
    expect(renders - before, '삭제 한 동작 = 렌더 1번 (doc · selectedId · history 세 setter가 한 번으로 합쳐짐)').toBe(1);
    expect(slot(1)).toBeNull();
    expect(buttons().map((b) => b.getAttribute('data-id'))).toEqual(['main', 'b1', 'b3']);
    expect(layerNames()).toEqual(['버튼', '삭제']);
    // 삭제는 새 단계 하나
    expect((slot(2) as UndoState).past).toHaveLength(1);
  });

  it('메인을 골랐을 때는 [삭제] 버튼이 없다. 인스턴스를 고르면 생기고 선택이 풀리면 사라진다', async () => {
    expect(root.querySelector('[data-testid="delete-instance"]')).toBeNull();
    await click(buttonOf('main'));
    expect(root.querySelector('[data-testid="delete-instance"]')).toBeNull();
    await click(buttonOf('b1'));
    expect(root.querySelector('[data-testid="delete-instance"]')).not.toBeNull();
    await click(deleteButton());
    expect(root.querySelector('[data-testid="delete-instance"]')).toBeNull();
  });

  it('지운 번호를 다시 쓰지 않는다: b3를 지우고 추가하면 b4, 또 추가하면 b5 (nextId는 doc 밖의 칸)', async () => {
    await click(buttonOf('b3'));
    await click(deleteButton());
    await click(addButton());
    expect((slot(0) as typeof INITIAL_DOC).instances.map((it) => it.id)).toEqual(['b1', 'b2', 'b4']);
    await click(addButton());
    expect((slot(0) as typeof INITIAL_DOC).instances.map((it) => it.id)).toEqual(['b1', 'b2', 'b4', 'b5']);
    expect(slot(3)).toBe(6);
  });

  it('b1을 지운 뒤 b2를 고르면 b2가 골라진다 (선택은 위치가 아니라 id)', async () => {
    await click(buttonOf('b1'));
    await click(deleteButton());
    await click(buttonOf('b2'));
    expect(slot(1)).toBe('b2');
    expect((slot(0) as typeof INITIAL_DOC).instances.map((it) => it.id)).toEqual(['b2', 'b3']);
  });
});

// ---------------------------------------------------------------------------
// Dev-10: 순서 바꾸기 [↑] [↓] (P-15 · P-20, MF-25)
// ---------------------------------------------------------------------------

describe('순서 바꾸기 (Dev-10)', () => {
  const moveButton = (id: string, direction: 'up' | 'down'): HTMLElement => {
    const found = layerRow(id).querySelector<HTMLElement>(`[data-testid="layer-${direction}"]`);
    if (found === null) throw new Error(`${id} 행에 [${direction}]가 없다`);
    return found;
  };
  const order = (): (string | null)[] => buttons().slice(1).map((b) => b.getAttribute('data-id'));

  it('P-15 b1 행 [↓] = 캔버스 { MOVE: 1 } · 레이어 { MOVE: 1 } (INSERT · REMOVE · REPLACE · SET_TEXT 0), 렌더 1번, 순서 b2 b1 b3', async () => {
    const before = renders;
    await click(moveButton('b1', 'down'));
    expect(canvasCounts(instance.lastPatches)).toEqual({ MOVE: 1 });
    expect(layerCounts(instance.lastPatches)).toEqual({ MOVE: 1 });
    expect(renders - before).toBe(1);
    expect(order()).toEqual(['b2', 'b1', 'b3']);
    expect(layerNames()).toEqual(['취소', '버튼', '삭제']);
  });

  it('순서를 바꿔도 버튼 · 레이어 행 DOM 노드는 같은 참조다 (다시 만들지 않고 옮겨짐)', async () => {
    const held = [buttonOf('b1'), buttonOf('b2'), buttonOf('b3'), layerRow('b1'), layerRow('b2'), layerRow('b3')];
    await click(moveButton('b1', 'down'));
    await click(moveButton('b3', 'up'));
    expect(order()).toEqual(['b2', 'b3', 'b1']);
    const now = [buttonOf('b1'), buttonOf('b2'), buttonOf('b3'), layerRow('b1'), layerRow('b2'), layerRow('b3')];
    held.forEach((node, i) => expect(now[i]).toBe(node));
  });

  it('[↑] · [↓]는 행의 고르기를 같이 부르지 않는다 (stopPropagation): 선택이 그대로이고 selected 클래스가 안 옮겨 감', async () => {
    await click(buttonOf('b2'));
    await click(moveButton('b1', 'down'));
    await click(moveButton('b3', 'up'));
    expect(slot(1)).toBe('b2');
    expect(root.querySelectorAll('.selected')).toHaveLength(2); // b2의 캔버스 버튼 · 레이어 행
    expect(buttonOf('b2').classList.contains('selected')).toBe(true);
    expect(layerRow('b2').classList.contains('selected')).toBe(true);
  });

  it('선택이 없을 때 [↓]를 눌러도 행이 골라지지 않는다', async () => {
    await click(moveButton('b1', 'down'));
    expect(slot(1)).toBeNull();
  });

  it('P-20 경계: 맨 위 [↑] · 맨 아래 [↓]는 눌러도 렌더 0번 · 기록 없음 · lastPatches 그대로이고 버튼은 그대로 있다 (disabled 아님)', async () => {
    await click(moveButton('b1', 'down')); // 준비: 순서 b2 b1 b3 (패치 값은 이 렌더의 것)
    const patchesBefore = instance.lastPatches;
    const historyBefore = slot(2);
    const docBefore = slot(0);
    const before = renders;
    await click(moveButton('b2', 'up')); // 맨 위
    await click(moveButton('b3', 'down')); // 맨 아래
    expect(renders - before).toBe(0);
    expect(instance.lastPatches).toBe(patchesBefore);
    expect(slot(2)).toBe(historyBefore);
    expect(slot(0)).toBe(docBefore);
    expect(order()).toEqual(['b2', 'b1', 'b3']);
    expect(moveButton('b2', 'up').hasAttribute('disabled')).toBe(false);
    expect(moveButton('b3', 'down').hasAttribute('disabled')).toBe(false);
  });

  it('인스턴스 행마다 [↑] [↓]가 있고 메인 행에는 없다. 순서 바꾸기는 새 단계 하나(묶음 끝)다', async () => {
    expect(root.querySelectorAll('[data-testid="layer-up"]')).toHaveLength(3);
    expect(root.querySelectorAll('[data-testid="layer-down"]')).toHaveLength(3);
    expect(layerRow('main').querySelector('[data-testid="layer-up"], [data-testid="layer-down"]')).toBeNull();
    await click(moveButton('b1', 'down'));
    expect((slot(2) as UndoState).past).toHaveLength(1);
    expect((slot(2) as UndoState).group).toBeNull();
  });

  it('메인 값을 바꾼 뒤에도 순서 바꾸기는 글자 변경 없이 MOVE만이다 (SET_TEXT 0)', async () => {
    await click(buttonOf('main'));
    await typeInto('prop-label', '저장');
    await click(moveButton('b2', 'up'));
    expect(canvasCounts(instance.lastPatches)).toEqual({ MOVE: 1 });
    expect(order()).toEqual(['b2', 'b1', 'b3']);
  });
});

// ---------------------------------------------------------------------------
// Dev-11: 키보드 · Undo/Redo 연결 (P-17 키 · P-18 · P-19 · P-20, MF-30 ~ 34, Q17-3 · Q17-4)
// ---------------------------------------------------------------------------

describe('키보드 · Undo/Redo (Dev-11)', () => {
  interface KeyOptions {
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    repeat?: boolean;
  }
  /** 키 하나를 누른 것처럼 document까지 올라가는 keydown을 보내고 렌더가 끝나길 기다린다 (target 기본 = body) */
  const press = async (key: string, options: KeyOptions = {}, target: Element = document.body): Promise<boolean> => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });
    target.dispatchEvent(event);
    await Promise.resolve();
    return event.defaultPrevented; // [AI Note]: 앱이 브라우저 기본 동작(Undo/Redo)을 막았는지 (Q18)
  };
  const undoKey = (): Promise<boolean> => press('z', { ctrlKey: true });
  const redoKey = (): Promise<boolean> => press('z', { ctrlKey: true, shiftKey: true });
  const ids = (): (string | null)[] => buttons().slice(1).map((b) => b.getAttribute('data-id'));
  const docIds = (): string[] => (slot(0) as typeof INITIAL_DOC).instances.map((it) => it.id);

  it('keydown 리스너는 처음에 1개이고, 상태가 여러 번 바뀐 뒤에도 1개다 (등록 − 해제 = 1, 쌓이지 않음 — MF-34)', async () => {
    expect(keydownListeners()).toBe(1);
    await click(buttonOf('b1'));
    await click(buttonOf('b2'));
    await typeInto('prop-label', '가');
    await typeInto('prop-label', '가나');
    await click(byId('add-instance'));
    await click(layerRow('b1').querySelector('[data-testid="layer-down"]') as HTMLElement);
    await click(buttonOf('main'));
    await choose('prop-size', 'L');
    await click(buttonOf('b3'));
    await click(byId('delete-instance'));
    await undoKey();
    await redoKey();
    await undoKey();
    expect(keydownCalls(addSpy)).toBeGreaterThan(5);
    expect(keydownListeners()).toBe(1);
    // 직접 증거: 실제 숫자를 출력에 남긴다
    console.log(`[keydown 리스너] add=${keydownCalls(addSpy)} remove=${keydownCalls(removeSpy)} 남음=${keydownListeners()} (렌더 ${renders}번)`);
  });

  it('unmount() 뒤에는 남은 리스너가 0개이고, 그 뒤 keydown을 보내도 아무 일 없다 (cleanup)', async () => {
    await click(buttonOf('b2'));
    const docBefore = slot(0);
    const renderCount = renders;
    instance.unmount();
    expect(keydownListeners()).toBe(0);
    await press('Delete');
    await undoKey();
    expect(slot(0)).toBe(docBefore);
    expect(renders).toBe(renderCount);
    expect(ids()).toEqual(['b1', 'b2', 'b3']);
  });

  it('P-17 키: b2를 고르고 Delete = 캔버스 { REMOVE: 1 } · 레이어 { REMOVE: 1 } + 속성 패널 REPLACE 1줄 이상, 렌더 1번, 선택 풀림 (Backspace도 같음)', async () => {
    await click(buttonOf('b2'));
    const before = renders;
    await press('Delete');
    expect(canvasCounts(instance.lastPatches)).toEqual({ REMOVE: 1 });
    expect(layerCounts(instance.lastPatches)).toEqual({ REMOVE: 1 });
    expect(instance.lastPatches.filter((p) => p.kind === 'REPLACE' && startsWith(p.path, [0, 2])).length).toBeGreaterThanOrEqual(1);
    expect(renders - before, '삭제 한 동작 = 렌더 1번').toBe(1);
    console.log(`[P-17 키] 캔버스 ${JSON.stringify(canvasCounts(instance.lastPatches))} 레이어 ${JSON.stringify(layerCounts(instance.lastPatches))} 속성 패널 REPLACE ${instance.lastPatches.filter((p) => p.kind === 'REPLACE' && startsWith(p.path, [0, 2])).length}줄 렌더 +${renders - before}`);
    expect(slot(1)).toBeNull();
    expect(ids()).toEqual(['b1', 'b3']);
    await click(buttonOf('b3'));
    await press('Backspace');
    expect(ids()).toEqual(['b1']);
    expect(slot(1)).toBeNull();
  });

  it('메인을 골랐거나 아무것도 안 골랐을 때 Delete · Backspace는 렌더 0번 · doc · history 그대로다 (MF-24)', async () => {
    const doc = slot(0);
    const history = slot(2);
    await press('Delete'); // 선택 없음
    await click(buttonOf('main'));
    const afterSelect = renders;
    await press('Delete');
    await press('Backspace');
    expect(renders - afterSelect).toBe(0);
    expect(slot(0)).toBe(doc);
    expect(slot(2)).toBe(history);
    expect(slot(1)).toBe('main');
    expect(ids()).toEqual(['b1', 'b2', 'b3']);
  });

  it('P-18 (삭제 뒤) Undo = 캔버스 { INSERT: 1 } · 레이어 { INSERT: 1 }, 렌더 1번, 선택은 풀린 채 (삭제 취소)', async () => {
    await click(buttonOf('b2'));
    await press('Delete');
    const before = renders;
    await undoKey();
    expect(canvasCounts(instance.lastPatches)).toEqual({ INSERT: 1 });
    expect(layerCounts(instance.lastPatches)).toEqual({ INSERT: 1 });
    expect(renders - before, 'Undo 한 동작 = 렌더 1번').toBe(1);
    expect(ids()).toEqual(['b1', 'b2', 'b3']);
    expect(slot(1)).toBeNull();
  });

  it('P-19 메인 색 빨강(1단계) → Undo = 캔버스 { SET_STYLE: 3 }(메인 · b1 · b2 배경만) · 레이어 { }, Redo도 { SET_STYLE: 3 }으로 다시 빨강', async () => {
    await click(buttonOf('main'));
    await pick('#cf202f');
    const before = renders;
    await undoKey();
    expect(canvasCounts(instance.lastPatches)).toEqual({ SET_STYLE: 3 });
    expect(layerCounts(instance.lastPatches)).toEqual({});
    expect(renders - before).toBe(1);
    expect(bgs()).toEqual([rgb('#0052ff'), rgb('#0052ff'), rgb('#0052ff'), rgb('#cf202f')]);
    await redoKey();
    expect(canvasCounts(instance.lastPatches)).toEqual({ SET_STYLE: 3 });
    expect(bgs()).toEqual([rgb('#cf202f'), rgb('#cf202f'), rgb('#cf202f'), rgb('#cf202f')]);
    expect(slot(1)).toBe('main'); // 고르기는 그대로
  });

  it('Ctrl+Z · Meta+Z = Undo, Ctrl+Shift+Z(`Z`로 와도) · Meta+Shift+Z = Redo', async () => {
    await click(buttonOf('main'));
    await choose('prop-size', 'L');
    await press('z', { metaKey: true });
    expect(buttonOf('main').classList.contains('btn-M')).toBe(true);
    await press('Z', { ctrlKey: true, shiftKey: true });
    expect(buttonOf('main').classList.contains('btn-L')).toBe(true);
    await press('z', { metaKey: true });
    expect(buttonOf('main').classList.contains('btn-M')).toBe(true);
    await press('Z', { metaKey: true, shiftKey: true });
    expect(buttonOf('main').classList.contains('btn-L')).toBe(true);
  });

  it('한 키 입력 = 한 단계: 서로 다른 세 수정 뒤 Ctrl+Z 한 번은 마지막 묶음 하나만 되돌린다. 같은 칸을 연달아 고친 것은 한 번에 되돌아간다', async () => {
    await click(buttonOf('main'));
    await pick('#cf202f'); // 단계 1
    await choose('prop-size', 'L'); // 단계 2
    await typeInto('prop-label', '새'); // 단계 3
    await typeInto('prop-label', '새로'); // 단계 3에 묶임
    expect((slot(2) as UndoState).past).toHaveLength(3);
    await undoKey();
    expect(labels()[0]).toBe('버튼'); // 단계 3 두 글자가 한 번에
    expect(buttonOf('main').classList.contains('btn-L')).toBe(true);
    expect(bgOf('main')).toBe(rgb('#cf202f'));
    expect((slot(2) as UndoState).past).toHaveLength(2);
  });

  it('라벨 글자 칸(글자 input) 안의 keydown은 앱 동작이 없고 막지도 않는다 (Q18 ③) — 렌더 0번 · doc · history 그대로 · defaultPrevented false', async () => {
    await click(buttonOf('b2'));
    await pick('#05b169');
    const doc = slot(0);
    const history = slot(2);
    const before = renders;
    const label = byId('prop-label');
    const results = [
      await press('Delete', {}, label),
      await press('Backspace', {}, label),
      await press('z', { ctrlKey: true }, label),
      await press('z', { metaKey: true }, label),
      await press('Z', { ctrlKey: true, shiftKey: true }, label),
    ];
    expect(results, '브라우저 기본 동작(글자 지우기 · 되돌리기)을 막지 않음').toEqual([false, false, false, false, false]);
    expect(renders - before).toBe(0);
    expect(slot(0)).toBe(doc);
    expect(slot(2)).toBe(history);
    expect(ids()).toEqual(['b1', 'b2', 'b3']);
    expect(slot(1)).toBe('b2');
  });

  it('선택 상자 · 체크박스 안의 Delete · Backspace는 무시하고 막지 않는다 (Q18) — 렌더 0번 · doc · history 그대로', async () => {
    await click(buttonOf('b2'));
    await pick('#05b169');
    const doc = slot(0);
    const history = slot(2);
    const before = renders;
    for (const target of [byId('prop-size'), byId('prop-hasicon'), byId('prop-color')]) {
      expect(await press('Delete', {}, target)).toBe(false);
      expect(await press('Backspace', {}, target)).toBe(false);
    }
    expect(renders - before).toBe(0);
    expect(slot(0)).toBe(doc);
    expect(slot(2)).toBe(history);
    expect(ids()).toEqual(['b1', 'b2', 'b3']);
    expect(slot(1)).toBe('b2');
  });

  it('선택 상자 안의 Ctrl+Z · Ctrl+Shift+Z = 앱 Undo · Redo + preventDefault (Q18 ②)', async () => {
    await click(buttonOf('b2'));
    await choose('prop-size', 'L');
    expect(buttonOf('b2').classList.contains('btn-L')).toBe(true);
    expect(await press('z', { ctrlKey: true }, byId('prop-size'))).toBe(true);
    expect(buttonOf('b2').classList.contains('btn-L')).toBe(false);
    expect(buttonOf('b2').classList.contains('btn-M')).toBe(true);
    expect(await press('Z', { ctrlKey: true, shiftKey: true }, byId('prop-size'))).toBe(true);
    expect(buttonOf('b2').classList.contains('btn-L')).toBe(true);
    expect(await press('z', { metaKey: true }, byId('prop-icon'))).toBe(true);
    expect(buttonOf('b2').classList.contains('btn-M')).toBe(true);
  });

  it('색 입력칸(prop-color) 안의 Ctrl+Z · Ctrl+Shift+Z = 앱 Undo · Redo + preventDefault, Delete · Backspace는 무시하고 막지 않는다 (④-3, Q18 ② 확장)', async () => {
    await click(buttonOf('b2'));
    await pick('#05b169');
    expect(bgOf('b2')).toBe(rgb('#05b169'));
    const doc = slot(0);
    const history = slot(2);
    const before = renders;
    expect(await press('Delete', {}, byId('prop-color'))).toBe(false);
    expect(await press('Backspace', {}, byId('prop-color'))).toBe(false);
    expect(renders - before, 'Delete · Backspace = 렌더 0번').toBe(0);
    expect(slot(0)).toBe(doc);
    expect(slot(2)).toBe(history);
    expect(ids()).toEqual(['b1', 'b2', 'b3']);
    expect(await press('z', { ctrlKey: true }, byId('prop-color'))).toBe(true);
    expect(bgOf('b2')).toBe(rgb('#0052ff'));
    expect(await press('Z', { ctrlKey: true, shiftKey: true }, byId('prop-color'))).toBe(true);
    expect(bgOf('b2')).toBe(rgb('#05b169'));
    expect(slot(1)).toBe('b2');
  });

  it('체크박스 안의 Ctrl+Z · Ctrl+Shift+Z = 앱 Undo · Redo + preventDefault (Q18 ②)', async () => {
    await click(buttonOf('b2'));
    await toggle('prop-hasicon', true);
    const withIcon = root.querySelectorAll('[data-testid="btn-icon"]').length;
    expect(withIcon).toBeGreaterThan(0);
    expect(await press('z', { ctrlKey: true }, byId('prop-hasicon'))).toBe(true);
    expect(root.querySelectorAll('[data-testid="btn-icon"]').length).toBe(withIcon - 1);
    expect(await press('Z', { ctrlKey: true, shiftKey: true }, byId('prop-hasicon'))).toBe(true);
    expect(root.querySelectorAll('[data-testid="btn-icon"]').length).toBe(withIcon);
  });

  it('입력칸 밖(body)에서 cancelable Ctrl+Z · Ctrl+Shift+Z는 defaultPrevented true + 앱 Undo · Redo, 그 밖의 키(Delete · Escape · Ctrl+Y · Alt+Z)는 false (Q18 ①)', async () => {
    await click(buttonOf('main'));
    await pick('#cf202f');
    expect(await press('z', { ctrlKey: true })).toBe(true);
    expect(bgOf('main')).toBe(rgb('#0052ff'));
    expect(await press('Z', { ctrlKey: true, shiftKey: true })).toBe(true);
    expect(bgOf('main')).toBe(rgb('#cf202f'));
    // 되돌릴 것이 없어도 앱이 처리한 키이므로 막는다 (브라우저 기본 Undo가 남은 글자 기록에 적용되지 않게)
    await undoKey();
    expect(await undoKey()).toBe(true);
    // 메인이 선택돼 Delete는 아무 일 없고, 어느 쪽이든 막지 않는다
    expect(await press('Delete')).toBe(false);
    expect(await press('Escape')).toBe(false);
    expect(await press('y', { ctrlKey: true })).toBe(false);
    expect(await press('z', { ctrlKey: true, altKey: true })).toBe(false);
  });

  it('입력칸 밖 Undo는 앱 한 단계만 되돌린다 — 글자 입력 뒤 색을 바꾸고 Ctrl+Z 하면 색만 돌아가고 글자는 그대로 (QA-29 단위판)', async () => {
    await click(buttonOf('main'));
    await typeInto('prop-label', '새');
    await pick('#cf202f');
    expect(await undoKey()).toBe(true);
    expect(labels()[0]).toBe('새');
    expect(bgOf('main')).toBe(rgb('#0052ff'));
    expect((slot(2) as UndoState).past).toHaveLength(1);
  });

  it('수정키 조합은 아무 일 없다 (Q17-4): Shift+Delete · Ctrl+Backspace · Alt+Delete · Meta+Backspace · Alt+Z · Ctrl+Alt+Z · Ctrl+Y · Escape · z', async () => {
    await click(buttonOf('b2'));
    await pick('#05b169');
    const doc = slot(0);
    const before = renders;
    await press('Delete', { shiftKey: true });
    await press('Backspace', { ctrlKey: true });
    await press('Delete', { altKey: true });
    await press('Backspace', { metaKey: true });
    await press('z', { altKey: true });
    await press('z', { ctrlKey: true, altKey: true });
    await press('y', { ctrlKey: true });
    await press('Escape');
    await press('z');
    expect(renders - before).toBe(0);
    expect(slot(0)).toBe(doc);
    expect(ids()).toEqual(['b1', 'b2', 'b3']);
    // 대조: 수정키 없는 Delete는 지운다 (키 반복 repeat도 그대로 처리 — Q17-4)
    await press('Delete', { repeat: true });
    expect(ids()).toEqual(['b1', 'b3']);
  });

  it('Undo로 고른 것이 사라지면 선택이 null이다: b4를 추가해 고르고 Undo → null. 삭제를 Redo로 되풀이하면 다시 null', async () => {
    await click(byId('add-instance'));
    await click(buttonOf('b4'));
    expect(slot(1)).toBe('b4');
    await undoKey();
    expect(slot(1)).toBeNull();
    expect(byId('property-empty').localName).toBe('p');
    // 삭제 → Undo(b2 복귀, 선택 풀린 채) → b2 고름 → Redo(b2 다시 삭제) → 선택 null
    await click(buttonOf('b2'));
    await press('Delete');
    await undoKey();
    expect(slot(1)).toBeNull();
    await click(buttonOf('b2'));
    await redoKey();
    expect(slot(1)).toBeNull();
    expect(ids()).toEqual(['b1', 'b3']);
  });

  it('다른 것이 끼어들거나 사라져도 선택은 id로 유지된다 (b3를 고른 채 b1 삭제 취소 · 다시 삭제)', async () => {
    await click(buttonOf('b1'));
    await press('Delete');
    await click(buttonOf('b3'));
    await undoKey();
    expect(ids()).toEqual(['b1', 'b2', 'b3']);
    expect(slot(1)).toBe('b3');
    await redoKey();
    expect(ids()).toEqual(['b2', 'b3']);
    expect(slot(1)).toBe('b3');
  });

  it('Q17-3 b4 추가 → Undo → 다시 추가 = b5 (nextId는 Undo로 안 되돌아감). 또 Undo → 추가 = b6', async () => {
    await click(byId('add-instance'));
    expect(docIds()).toEqual(['b1', 'b2', 'b3', 'b4']);
    expect(slot(3)).toBe(5);
    await undoKey();
    expect(docIds()).toEqual(['b1', 'b2', 'b3']);
    expect(slot(3), 'nextId는 Undo가 안 건드림').toBe(5);
    await click(byId('add-instance'));
    expect(docIds()).toEqual(['b1', 'b2', 'b3', 'b5']);
    await undoKey();
    await click(byId('add-instance'));
    expect(docIds()).toEqual(['b1', 'b2', 'b3', 'b6']);
    expect(root.querySelector('[data-id="b4"]')).toBeNull();
  });

  it('P-20 되돌릴 것 · 다시 할 것이 없으면 Undo · Redo는 렌더 0번 · lastPatches 그대로다', async () => {
    const patches = instance.lastPatches;
    const before = renders;
    await undoKey();
    await redoKey();
    expect(renders - before).toBe(0);
    expect(instance.lastPatches).toBe(patches);
    expect(slot(2)).toBe(EMPTY_UNDO);
  });

  it('Undo 한도 (Q17-2): [+ 인스턴스] 60번 = past 최대 49칸, Undo 49번 뒤 더는 안 돌아간다 (처음 b1~b3로는 못 감)', async () => {
    const add = byId('add-instance');
    for (let i = 0; i < 60; i += 1) await click(add);
    expect((slot(2) as UndoState).past).toHaveLength(49);
    expect(docIds()).toHaveLength(63);
    for (let i = 0; i < 49; i += 1) await undoKey();
    // 60번 추가 중 앞의 11번(b4~b14)은 기록에서 빠져 있다 → 49번 되돌리면 b1~b14가 남는다
    expect(docIds()).toEqual(Array.from({ length: 14 }, (_, i) => `b${i + 1}`));
    await undoKey();
    expect(docIds()).toHaveLength(14);
  });
});
