import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from '@mini-react/react-dom';
import type { FunctionComponent } from '@mini-react/react-reconciler';
import { readAreaChildren } from '@mini-react/react-dom-bindings';
import { COMMENT_NODE, TEXT_NODE } from '@mini-react/shared';
import type { AreaChildren, ElementVNode, Props, VNode } from '@mini-react/shared';
import { el, text } from '../../../packages/shared/src/__tests__/helpers';
import { App } from '../App';
import { toRealVNodes } from '../previewVNode';

// [AI Note]: toRealVNodes(PP-05) 단위 테스트. 순수 함수라 손으로 만든 VNode로 표를 돌리고, 마지막에 실제 App을 읽은 결과로도 확인한다.

const classOf = (node: VNode): unknown => (node.props as Props).class;
const only = (nodes: AreaChildren): ElementVNode => nodes[0] as ElementVNode;

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const inner of Object.values(value as object)) deepFreeze(inner);
  }
  return value;
}

describe('selected 클래스 토큰 제거', () => {
  it.each<[string, string | undefined]>([
    ['figma-button btn-M selected', 'figma-button btn-M'],
    ['selected figma-button', 'figma-button'],
    ['figma-button btn-M', 'figma-button btn-M'],
    ['selected', undefined],
    ['  selected  ', undefined],
    // 비슷한 이름은 토큰이 아니므로 그대로
    ['unselected', 'unselected'],
    ['not-selected figma-button', 'not-selected figma-button'],
    ['selected-item selected', 'selected-item'],
  ])('class "%s" → %s', (input, expected) => {
    const [out] = toRealVNodes([el('button', { class: input })]);
    if (expected === undefined) expect('class' in (out.props as object)).toBe(false);
    else expect(classOf(out)).toBe(expected);
  });

  it('깊은 자손의 selected도 뺀다', () => {
    const tree = el('div', {}, el('div', { class: 'row' }, el('button', { class: 'a selected b' })));
    const out = only(toRealVNodes([tree]));
    const deep = (out.children[0] as ElementVNode).children[0];
    expect(classOf(deep)).toBe('a b');
  });
});

describe('data-testid 앞에 real- 붙이기', () => {
  it('중첩 · 자식 모두 접두가 붙고, 접두 없는 테스트 영역 testid가 하나도 안 남는다', () => {
    const tree = el(
      'div',
      { 'data-testid': 'canvas-instances' },
      el('button', { 'data-testid': 'figma-button' }, el('span', { 'data-testid': 'btn-label' }, text('x'))),
    );
    const out = toRealVNodes([tree]);
    const ids: string[] = [];
    const walk = (node: VNode): void => {
      const id = (node.props as Props)['data-testid'];
      if (typeof id === 'string') ids.push(id);
      node.children.forEach(walk);
    };
    out.forEach(walk);
    expect(ids).toEqual(['real-canvas-instances', 'real-figma-button', 'real-btn-label']);
  });

  it('testid가 없는 요소 · 속성은 그대로 (키가 생기지 않는다)', () => {
    const [out] = toRealVNodes([el('i', { 'data-id': 'b1' })]);
    expect(out.props).toEqual({ 'data-id': 'b1' });
    expect('data-testid' in (out.props as object)).toBe(false);
  });
});

describe('제목 노드 제거는 최상위에서만', () => {
  it('최상위의 test-area-title만 빼고 나머지 순서는 유지한다', () => {
    const title = el('h2', { 'data-testid': 'test-area-title' }, text('테스트 영역'));
    const a = el('div', { 'data-testid': 'canvas-main' });
    const b = el('div', { 'data-testid': 'canvas-instances' });
    const out = toRealVNodes([title, a, b]);
    expect(out.map((n) => (n.props as Props)['data-testid'])).toEqual(['real-canvas-main', 'real-canvas-instances']);
  });

  it('최상위가 아닌 곳의 같은 testid는 안 뺀다 (접두만 붙음)', () => {
    const nested = el('div', {}, el('h2', { 'data-testid': 'test-area-title' }));
    const out = only(toRealVNodes([nested]));
    expect(out.children).toHaveLength(1);
    expect((out.children[0].props as Props)['data-testid']).toBe('real-test-area-title');
  });
});

describe('입력 불변 · 보존', () => {
  it('깊게 동결한 입력이 안 깨지고 결과는 다른 객체다', () => {
    const input = deepFreeze<AreaChildren>([
      el('div', { class: 'selected', 'data-testid': 'canvas-main' }, el('button', { class: 'figma-button selected', 'data-testid': 'figma-button' })),
    ]);
    const out = toRealVNodes(input);
    expect(out).not.toBe(input);
    expect(out[0]).not.toBe(input[0]);
    // 입력은 그대로
    expect(classOf(input[0])).toBe('selected');
    expect((input[0].props as Props)['data-testid']).toBe('canvas-main');
  });

  it('글자 · 주석 노드, style · data-id · type 속성은 그대로 보존한다', () => {
    const style = { 'background-color': '#0052ff' };
    const input: AreaChildren = [
      { type: COMMENT_NODE, props: { nodeValue: '메모' }, children: [] },
      el('button', { type: 'button', style, 'data-id': 'b2' }, text('취소')),
    ];
    const out = toRealVNodes(input);
    expect(out[0]).toEqual(input[0]);
    const button = out[1] as ElementVNode;
    expect(button.props).toEqual({ type: 'button', style, 'data-id': 'b2' });
    expect(button.children[0].type).toBe(TEXT_NODE);
    expect((button.children[0].props as Props).nodeValue).toBe('취소');
  });
});

describe('실제 App에서 읽은 결과', () => {
  let root: HTMLElement;
  let instance: FunctionComponent;
  beforeEach(() => {
    root = document.createElement('div');
    document.body.append(root);
    instance = render(App, root);
  });
  afterEach(() => {
    instance.unmount();
    root.remove();
  });

  it('b2를 골라 selected가 붙은 채 읽어도 정리 결과에 selected · 테스트 영역 testid가 0개다', async () => {
    root.querySelector<HTMLElement>('[data-testid="figma-button"][data-id="b2"]')?.click();
    await Promise.resolve();
    const canvas = root.querySelector('[data-testid="canvas"]');
    if (canvas === null) throw new Error('canvas 없음');
    const raw = readAreaChildren(canvas);
    // 정리 전: 선택 표시와 제목이 실제로 있다 (이 테스트가 헛돌지 않게)
    const rawJson = JSON.stringify(raw);
    expect(rawJson).toContain('selected');
    expect(rawJson).toContain('test-area-title');

    const json = JSON.stringify(toRealVNodes(raw));
    expect(json).not.toMatch(/"class":"[^"]*\bselected\b/);
    expect(json).not.toContain('test-area-title');
    // 값이 `real-`로 시작하지 않는 data-testid가 없다
    const testids = [...json.matchAll(/"data-testid":"([^"]*)"/g)].map((m) => m[1]);
    expect(testids.length).toBeGreaterThan(0);
    for (const id of testids) expect(id.startsWith('real-'), id).toBe(true);
  });
});
