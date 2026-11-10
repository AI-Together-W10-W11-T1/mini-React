// 테스트 전용: 고정 씨앗 무작위 트리 생성기 (diff · invertPatches 왕복 검증용). 테스트가 아니므로 직접 테스트하지 않는다.
// [AI Note]: 인접한 글자 노드는 만들지 않는다 (HTML 왕복과 같은 생성기를 쓸 수 있게). key는 쓰지 않는다 (위치 비교 전용).
import { COMMENT_NODE, TEXT_NODE } from '@mini-react/shared';
import type { AreaChildren, ElementVNode, StyleMap, VNode } from '@mini-react/shared';

/** mulberry32: 같은 씨앗이면 항상 같은 수열 */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAGS = ['div', 'p', 'span', 'ul', 'li', 'b', 'section'];
const ATTRS = ['id', 'class', 'title', 'data-x', 'disabled'];
const WORDS = ['a', 'b', 'c', 'hello', ' ', '\n  ', '😀', '<>&'];
const STYLES = ['color', 'margin', 'font-size', 'top'];

type Rng = () => number;
const pick = <T>(rng: Rng, list: readonly T[]): T => list[Math.floor(rng() * list.length)];

function randomProps(rng: Rng): ElementVNode['props'] {
  const props: { [name: string]: unknown } = {};
  for (const name of ATTRS) {
    if (rng() < 0.25) props[name] = name === 'disabled' ? '' : pick(rng, ['x', 'y', 'z']);
  }
  if (rng() < 0.3) {
    const style: { [p: string]: string } = {};
    for (const p of STYLES) if (rng() < 0.4) style[p] = pick(rng, ['1', '2', 'red']);
    if (Object.keys(style).length > 0) props.style = style as StyleMap;
  }
  return props;
}

function randomChildren(rng: Rng, depth: number): VNode[] {
  const count = depth <= 0 ? Math.floor(rng() * 2) : Math.floor(rng() * 5);
  const out: VNode[] = [];
  for (let i = 0; i < count; i++) {
    const last = out[out.length - 1];
    const r = rng();
    if (r < 0.25 && last?.type !== TEXT_NODE) out.push({ type: TEXT_NODE, props: { nodeValue: pick(rng, WORDS) }, children: [] });
    else if (r < 0.32) out.push({ type: COMMENT_NODE, props: { nodeValue: pick(rng, WORDS) }, children: [] });
    else out.push({ type: pick(rng, TAGS), props: randomProps(rng), children: randomChildren(rng, depth - 1) });
  }
  return out;
}

export function randomTree(rng: Rng, depth = 3): AreaChildren {
  return randomChildren(rng, depth);
}

/** old에서 몇 군데만 고친 새 트리 (글자 · 속성 · style · 추가 · 삭제 · 교체) */
export function mutateTree(rng: Rng, list: AreaChildren): AreaChildren {
  const out: VNode[] = [];
  for (const node of list) {
    const r = rng();
    if (r < 0.08) continue; // 삭제
    if (r < 0.14) {
      out.push({ type: pick(rng, TAGS), props: randomProps(rng), children: randomChildren(rng, 1) }); // 교체
      continue;
    }
    if (node.type === TEXT_NODE || node.type === COMMENT_NODE) {
      out.push(rng() < 0.3 ? { ...node, props: { nodeValue: pick(rng, WORDS) } } as VNode : node);
    } else {
      const props = rng() < 0.3 ? randomProps(rng) : node.props;
      out.push({ ...node, props, children: mutateTree(rng, node.children) } as VNode);
    }
    if (rng() < 0.08) out.push({ type: pick(rng, TAGS), props: randomProps(rng), children: [] }); // 추가
  }
  if (rng() < 0.2) out.push({ type: pick(rng, TAGS), props: {}, children: [] });
  // 인접 글자 노드가 생겼으면 사이에 요소를 끼워 막는다
  return out.flatMap((n, i) => (i > 0 && n.type === TEXT_NODE && out[i - 1].type === TEXT_NODE ? [{ type: 'br', props: {}, children: [] } as VNode, n] : [n]));
}
