import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from '@mini-react/react-dom';
import type { FunctionComponent } from '@mini-react/react-reconciler';
import type { Patch, Path } from '@mini-react/shared';
import { App } from '../App';

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
