import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from '@mini-react/react-dom';
import type { FunctionComponent } from '@mini-react/react-reconciler';
import type { Patch, VNode } from '@mini-react/shared';
import { h } from '@mini-react/react';
import { Canvas } from '../components/Canvas';
import { INITIAL_DOC, setInstanceField, setMainField, setVariableValue } from '../model';
import type { Doc } from '../model';

// [AI Note]: Canvas 단위 테스트 (task_007 VR-03 · 06). Canvas는 props만 받는 순수 함수라 작은 루트 하나로 엔진에 그려 본다.
// 루트는 바깥 변수 `doc`을 읽고, 값을 바꾼 뒤 instance.update()로 다시 그린다 → lastPatches가 그 한 번의 diff.

let root: HTMLElement;
let instance: FunctionComponent;
let doc: Doc;
const Host = (): VNode => h(Canvas, { main: doc.main, instances: doc.instances, variables: doc.variables, selectedId: null, onSelect: () => {} });

const button = (id: string): HTMLElement => {
  const found = root.querySelector<HTMLElement>(`[data-testid="figma-button"][data-id="${id}"]`);
  if (found === null) throw new Error(`${id} 버튼이 없다`);
  return found;
};
const bg = (id: string): string => button(id).style.backgroundColor;
const fg = (id: string): string => button(id).style.color;
const rgb = (hex: string): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};
const redraw = (next: Doc): void => {
  doc = next;
  instance.update();
};
const styleLines = (patches: readonly Patch[]): Patch[] => patches.filter((p) => p.kind === 'SET_STYLE');

beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
  doc = INITIAL_DOC;
  instance = render(Host, root);
});
afterEach(() => {
  instance.unmount();
  root.remove();
});

describe('Canvas — 변수를 푼 색으로 칠한다 (VR-03)', () => {
  it('연결이 없으면 처음 모습 그대로 (메인 · b1 · b2 파랑, b3 빨강)', () => {
    expect([bg('main'), bg('b1'), bg('b2'), bg('b3')]).toEqual([rgb('#0052ff'), rgb('#0052ff'), rgb('#0052ff'), rgb('#cf202f')]);
  });

  it('메인이 var:primary → 메인 · 따르는 인스턴스가 변수 값으로 칠해지고 글자색도 푼 색 기준', () => {
    redraw(setVariableValue(setMainField(doc, 'color', 'var:primary'), 'primary', '#f4b000'));
    for (const id of ['main', 'b1', 'b2']) {
      expect(bg(id), id).toBe(rgb('#f4b000'));
      expect(fg(id), id).toBe(rgb('#0a0b0d'));
    }
    expect(bg('b3')).toBe(rgb('#cf202f'));
    expect(fg('b3')).toBe(rgb('#ffffff'));
    expect(root.innerHTML).not.toContain('var:');
  });

  it('인스턴스가 var:success → 그 변수 값', () => {
    redraw(setInstanceField(doc, 'b3', 'color', 'var:success'));
    expect(bg('b3')).toBe(rgb('#05b169'));
  });

  it('없는 id: 인스턴스 var:ghost → 메인 색, 메인도 var:ghost → #0052ff', () => {
    redraw(setMainField(setInstanceField(doc, 'b1', 'color', 'var:ghost'), 'color', '#112233'));
    expect(bg('b1')).toBe(rgb('#112233'));
    redraw(setMainField(doc, 'color', 'var:ghost'));
    expect(bg('main')).toBe(rgb('#0052ff'));
    expect(bg('b1')).toBe(rgb('#0052ff'));
  });
});

describe('Canvas — 변수 값만 바뀐 두 번째 그리기의 patch (VP-2 · 3 · 4 · 6 캔버스 줄)', () => {
  const linkedMain = (): Doc => setMainField(INITIAL_DOC, 'color', 'var:primary');
  beforeEach(() => {
    redraw(linkedMain());
  });

  it('VP-1 연결만 하면 푼 색이 같아 patch 0줄', () => {
    // beforeEach의 redraw가 이미 연결 — 그 렌더의 patch를 본다
    expect(instance.lastPatches.filter((p) => p.kind !== 'SET_EVENT')).toEqual([]);
  });

  it('VP-2 Primary #f4b000: 메인 · b1 · b2 배경 + 글자색 = SET_STYLE 6줄, 다른 줄 0', () => {
    const b3Before = button('b3');
    redraw(setVariableValue(doc, 'primary', '#f4b000'));
    const patches = instance.lastPatches.filter((p) => p.kind !== 'SET_EVENT');
    expect(patches.every((p) => p.kind === 'SET_STYLE')).toBe(true);
    expect(styleLines(patches)).toHaveLength(6);
    expect(button('b3')).toBe(b3Before);
  });

  it('VP-3 Primary #0066ff: 글자색 안 바뀌어 SET_STYLE 3줄', () => {
    redraw(setVariableValue(doc, 'primary', '#0066ff'));
    expect(styleLines(instance.lastPatches)).toHaveLength(3);
  });

  it('VP-4 b2가 override #05b169면 b2 · b3는 0줄 (메인 · b1만 4줄)', () => {
    redraw(setInstanceField(doc, 'b2', 'color', '#05b169'));
    const b2 = button('b2');
    redraw(setVariableValue(doc, 'primary', '#f4b000'));
    expect(styleLines(instance.lastPatches)).toHaveLength(4);
    expect(button('b2')).toBe(b2);
    expect(bg('b2')).toBe(rgb('#05b169'));
  });

  it('VP-6 b3만 Danger에 연결 → Danger 값 변경은 b3 SET_STYLE 2줄뿐', () => {
    redraw(setInstanceField(doc, 'b3', 'color', 'var:danger'));
    const [mainEl, b1El] = [button('main'), button('b1')];
    redraw(setVariableValue(doc, 'danger', '#05b169'));
    expect(styleLines(instance.lastPatches)).toHaveLength(2);
    expect(bg('b3')).toBe(rgb('#05b169'));
    expect(button('main')).toBe(mainEl);
    expect(button('b1')).toBe(b1El);
  });

  it('연결 없는 변수 값 바꾸기(VP-11)는 캔버스 줄 0', () => {
    redraw(setMainField(doc, 'color', '#0052ff'));
    redraw(setVariableValue(doc, 'success', '#112233'));
    expect(instance.lastPatches.filter((p) => p.kind !== 'SET_EVENT')).toEqual([]);
  });
});
