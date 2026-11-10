import { COMMENT_NODE, TEXT_NODE } from '@mini-react/shared';
import type { AreaChildren, Patch, Path, StyleMap, VNode } from '@mini-react/shared';

// [AI Note]: 이전 · 새 VNode 두 개만 비교해 "고칠 일 목록"을 만든다 (P1-33 — 실제 DOM을 다시 읽지 않는다).
// DOM을 전혀 모른다. 한 줄 = 종류 · 경로 · 전 · 후 (알고리즘 결정 3 A). 경로는 영역 상자 안 자식부터 (결정 4 A).
// 필수 동작은 위치 기반 (결정 2): 같은 자리 · 같은 종류면 그 자리에서 고치고, 다르면 통째로 교체한다.
export function diff(oldChildren: AreaChildren, newChildren: AreaChildren): Patch[] {
  const patches: Patch[] = [];
  diffChildren(oldChildren, newChildren, [], patches);
  return patches;
}

function diffChildren(oldChildren: readonly VNode[], newChildren: readonly VNode[], parent: Path, out: Patch[]): void {
  const common = Math.min(oldChildren.length, newChildren.length);
  for (let i = 0; i < common; i++) {
    diffNode(oldChildren[i], newChildren[i], [...parent, i], out);
  }
}

function diffNode(oldNode: VNode, newNode: VNode, path: Path, out: Patch[]): void {
  if (oldNode.type !== newNode.type) {
    out.push({ kind: 'REPLACE', path, before: oldNode, after: newNode });
    return;
  }
  if (oldNode.type === TEXT_NODE || oldNode.type === COMMENT_NODE) {
    const before = (oldNode.props as { nodeValue: string }).nodeValue;
    const after = (newNode.props as { nodeValue: string }).nodeValue;
    if (before !== after) out.push({ kind: 'SET_TEXT', path, before, after });
    return;
  }
  diffAttrs(oldNode, newNode, path, out);
  diffStyle(oldNode, newNode, path, out);
  diffChildren(oldNode.children, newNode.children, path, out);
}

// [AI Note]: 속성 값 정규화 — 문자열 · 숫자 → 문자열, true → "" (boolean 속성), false · null · undefined → 속성 없음.
// 함수 · style이 아닌 객체는 Phase 1에서 속성으로 다루지 않는다 (이벤트는 phase2). style은 항목별 비교(StyleMap)라 여기서 뺀다.
function readAttrs(node: VNode): Map<string, string> {
  const attrs = new Map<string, string>();
  for (const [name, value] of Object.entries(node.props)) {
    if (name === 'style' && isStyleMap(value)) continue;
    if (typeof value === 'string') attrs.set(name, value);
    else if (typeof value === 'number') attrs.set(name, String(value));
    else if (value === true) attrs.set(name, '');
  }
  return attrs;
}

function readStyle(node: VNode): StyleMap {
  const value = (node.props as { style?: unknown }).style;
  return isStyleMap(value) ? value : {};
}

function isStyleMap(value: unknown): value is StyleMap {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function diffAttrs(oldNode: VNode, newNode: VNode, path: Path, out: Patch[]): void {
  const before = readAttrs(oldNode);
  const after = readAttrs(newNode);
  for (const [name, oldValue] of before) {
    const newValue = after.get(name);
    if (newValue === undefined) out.push({ kind: 'SET_ATTR', path, name, before: oldValue, after: null });
    else if (newValue !== oldValue) out.push({ kind: 'SET_ATTR', path, name, before: oldValue, after: newValue });
  }
  for (const [name, newValue] of after) {
    if (!before.has(name)) out.push({ kind: 'SET_ATTR', path, name, before: null, after: newValue });
  }
}

function diffStyle(oldNode: VNode, newNode: VNode, path: Path, out: Patch[]): void {
  const before = readStyle(oldNode);
  const after = readStyle(newNode);
  for (const [property, oldValue] of Object.entries(before)) {
    const newValue = after[property];
    if (newValue === undefined) out.push({ kind: 'SET_STYLE', path, property, before: oldValue, after: null });
    else if (newValue !== oldValue) out.push({ kind: 'SET_STYLE', path, property, before: oldValue, after: newValue });
  }
  for (const [property, newValue] of Object.entries(after)) {
    if (!(property in before)) out.push({ kind: 'SET_STYLE', path, property, before: null, after: newValue });
  }
}
