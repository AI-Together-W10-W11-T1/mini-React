import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from '@mini-react/react-dom';
import type { FunctionComponent } from '@mini-react/react-reconciler';
import type { Patch, Path, StateHook } from '@mini-react/shared';
import { App } from '../App';
import { INITIAL_DOC } from '../model';
import { EMPTY_UNDO } from '../undo';

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
/** App의 useState 칸 값 (호출 순서: 0 doc · 1 selectedId · 2 history · 3 nextId) */
const slot = (index: number): unknown => (instance.hooks[index] as StateHook).value;
const layerNames = (): string[] =>
  Array.from(root.querySelectorAll('[data-testid="layer-item"] [data-testid="layer-name"]')).map((el) => el.textContent ?? '');

beforeEach(() => {
  root = document.createElement('div');
  root.setAttribute('data-testid', 'app-root');
  document.body.append(root);
  instance = render(App, root);
});

afterEach(() => {
  instance.unmount();
  root.remove();
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

  it('Button에 메인 값(크기 M · 파랑 · 아이콘 없음)이 들어가고 b3만 색이 빨강이다', () => {
    const classes = buttons().map((b) => b.className);
    for (const c of classes) expect(c.split(' ')).toContain('btn-M');
    expect(classes.map((c) => c.split(' ').find((x) => x.startsWith('btn-') && x !== 'btn-M'))).toEqual(['btn-blue', 'btn-blue', 'btn-blue', 'btn-red']);
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
