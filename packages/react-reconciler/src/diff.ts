import { COMMENT_NODE, TEXT_NODE } from '@mini-react/shared';
import type { AreaChildren, DomPropName, DomPropValue, EventHandler, Key, Patch, Path, StyleMap, VNode } from '@mini-react/shared';

// [AI Note]: 이전 · 새 VNode 두 개만 비교해 "고칠 일 목록"을 만든다 (P1-33 — 실제 DOM을 다시 읽지 않는다).
// DOM을 전혀 모른다. 한 줄 = 종류 · 경로 · 전 · 후 (알고리즘 결정 3 A). 경로는 영역 상자 안 자식부터 (결정 4 A).
// 필수 동작은 위치 기반 (결정 2): 같은 자리 · 같은 종류면 그 자리에서 고치고, 다르면 통째로 교체한다.
export function diff(oldChildren: AreaChildren, newChildren: AreaChildren): Patch[] {
  const patches: Patch[] = [];
  diffChildren(oldChildren, newChildren, [], patches);
  return patches;
}

function diffChildren(oldChildren: readonly VNode[], newChildren: readonly VNode[], parent: Path, out: Patch[]): void {
  // [AI Note]: Key 확장 (알고리즘 결정 2 B). "자식 목록 단위"로 판단한다 — 옛 · 새 목록의 모든 자식에 key가 있고
  // 각 목록 안에서 중복이 없을 때만 key 표 매칭. 아니면 필수 동작(위치 비교) 그대로.
  if (isKeyed(oldChildren) && isKeyed(newChildren)) {
    diffKeyedChildren(oldChildren, newChildren, parent, out);
    return;
  }
  const common = Math.min(oldChildren.length, newChildren.length);
  // ① 겹치는 자리부터 재귀 비교
  for (let i = 0; i < common; i++) {
    diffNode(oldChildren[i], newChildren[i], [...parent, i], out);
  }
  // [AI Note]: 목록은 순서대로 하나씩 적용하고 경로는 "그 순간의 트리" 기준이라 순서가 중요하다 (알고리즘 결정 3 · 4).
  // ② 남는 옛 자식은 뒤에서부터 REMOVE (앞 번호가 안 밀림) → ③ 남는 새 자식은 앞에서부터 INSERT (앞 번호가 먼저 자리 잡음)
  for (let i = oldChildren.length - 1; i >= common; i--) {
    out.push({ kind: 'REMOVE', path: [...parent, i], node: oldChildren[i] });
  }
  for (let i = common; i < newChildren.length; i++) {
    out.push({ kind: 'INSERT', path: [...parent, i], node: newChildren[i] });
  }
}

/** 모든 자식에 key가 있고 중복이 없는가 (글자 · 주석 노드는 key가 없으므로 섞여 있으면 false). 빈 목록은 true */
function isKeyed(children: readonly VNode[]): boolean {
  const seen = new Set<Key>();
  for (const child of children) {
    const key = (child as { key?: Key }).key;
    // 1 과 "1"은 다른 key (Set의 같음 비교 그대로)
    if (key === undefined || seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

// [AI Note]: key 비교 순서 — ① 새 목록에 없는 옛 key를 뒤에서부터 REMOVE → ② 새 목록을 앞에서부터 보며
// 현재 목록에서 그 key의 자리(from)가 to와 다르면 MOVE, 없으면 INSERT → ③ 짝이 맞은 노드끼리 재귀 diff (태그가 다르면 REPLACE).
// ②가 끝나면 목록 순서가 새 목록과 같아져 ③의 경로는 최종 자리 기준이고, 재귀 diff는 이 목록의 구조를 바꾸지 않는다.
// 최소 이동 수는 보장하지 않는다 (예: [a,b,c] → [b,c,a]는 1번이면 되지만 2번 이동). 단순함 우선 (최장 증가 부분 수열은 버린 후보).
function diffKeyedChildren(oldChildren: readonly VNode[], newChildren: readonly VNode[], parent: Path, out: Patch[]): void {
  const newKeys = new Set(newChildren.map((child) => (child as { key: Key }).key));
  const oldByKey = new Map<Key, VNode>();
  oldChildren.forEach((child) => oldByKey.set((child as { key: Key }).key, child));

  // ① 사라진 key: 뒤에서부터 REMOVE (앞 번호가 안 밀림). 남은 옛 key 순서를 current에 추적한다
  const current: Key[] = [];
  for (let i = oldChildren.length - 1; i >= 0; i--) {
    const old = oldChildren[i];
    if (!newKeys.has((old as { key: Key }).key)) out.push({ kind: 'REMOVE', path: [...parent, i], node: old });
  }
  for (const old of oldChildren) {
    const key = (old as { key: Key }).key;
    if (newKeys.has(key)) current.push(key);
  }

  // ② 새 목록 앞에서부터: 0..to-1은 이미 새 목록과 같으므로 from >= to. 자리가 다르면 MOVE, 없으면 INSERT
  for (let to = 0; to < newChildren.length; to++) {
    const key = (newChildren[to] as { key: Key }).key;
    const from = current.indexOf(key);
    if (from === -1) {
      out.push({ kind: 'INSERT', path: [...parent, to], node: newChildren[to] });
      current.splice(to, 0, key);
    } else if (from !== to) {
      out.push({ kind: 'MOVE', parent, from, to });
      current.splice(from, 1);
      current.splice(to, 0, key);
    }
  }

  // ③ 짝이 맞은 노드끼리 재귀 diff (새로 INSERT한 노드는 통째로 새것이라 비교하지 않음)
  newChildren.forEach((child, to) => {
    const old = oldByKey.get((child as { key: Key }).key);
    if (old !== undefined) diffNode(old, child, [...parent, to], out);
  });
}

function diffNode(oldNode: VNode, newNode: VNode, path: Path, out: Patch[]): void {
  // [AI Note]: diff는 요소 · 글자만 안다. 컴포넌트 VNode는 FunctionComponent가 resolveComponents로 먼저 풀어서 넘겨야 한다.
  if (typeof oldNode.type === 'function' || typeof newNode.type === 'function') {
    throw new Error('diff는 풀리지 않은 컴포넌트 VNode를 비교할 수 없습니다. resolveComponents로 먼저 풀어야 합니다.');
  }
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
  diffProps(oldNode, newNode, path, out);
  diffEvents(oldNode, newNode, path, out);
  diffChildren(oldNode.children, newNode.children, path, out);
}

// [AI Note]: 속성 값 정규화 — 문자열 · 숫자 → 문자열, true → "" (boolean 속성), false · null · undefined → 속성 없음.
// 함수 · style이 아닌 객체는 속성으로 다루지 않는다 (함수 이벤트는 diffEvents가 따로 비교). style은 항목별 비교(StyleMap)라 여기서 뺀다.
function readAttrs(node: VNode): Map<string, string> {
  const attrs = new Map<string, string>();
  for (const [name, value] of Object.entries(node.props)) {
    if (name === 'style' && isStyleMap(value)) continue;
    if (isDomPropName(name)) continue; // value · checked는 속성이 아니라 DOM 프로퍼티 (diffProps)
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
  // [AI Note]: 보통 객체의 `after[property]` · `property in before`는 프로토타입 체인까지 본다 (`constructor` · `__proto__` 등).
  // 항목이 "자기 것으로" 있는지만 `Object.hasOwn`으로 보고, 값도 자기 것일 때만 읽는다 (검수 1회차 B-1).
  for (const [property, oldValue] of Object.entries(before)) {
    const newValue = Object.hasOwn(after, property) ? after[property] : undefined;
    if (newValue === undefined) out.push({ kind: 'SET_STYLE', path, property, before: oldValue, after: null });
    else if (newValue !== oldValue) out.push({ kind: 'SET_STYLE', path, property, before: oldValue, after: newValue });
  }
  for (const [property, newValue] of Object.entries(after)) {
    if (!Object.hasOwn(before, property)) out.push({ kind: 'SET_STYLE', path, property, before: null, after: newValue });
  }
}

// [AI Note]: 이벤트 props (Phase 2, 알고리즘 결정 8 B). 이름이 `on` + 대문자이고 값이 함수면 이벤트 (`onClick` → `click`).
// 속성(SET_ATTR)이 아니라 SET_EVENT로 따로 비교한다. 같은 함수 참조면 줄이 없어 무변경 렌더(T-04)에 작업이 생기지 않고,
// 다르면 전 · 후 함수 한 줄 — patch가 DOM 리스너를 다시 달지 않고 요소에 저장된 핸들러만 바꾼다.
// 요소 종류가 달라 REPLACE · INSERT되는 새 요소는 통째로 새로 그려지므로(renderVNode) 여기서 비교하지 않는다.
function readEvents(node: VNode): Map<string, EventHandler> {
  const events = new Map<string, EventHandler>();
  for (const [name, value] of Object.entries(node.props)) {
    if (/^on[A-Z]/.test(name) && typeof value === 'function') events.set(name.slice(2).toLowerCase(), value as EventHandler);
  }
  return events;
}

function diffEvents(oldNode: VNode, newNode: VNode, path: Path, out: Patch[]): void {
  const before = readEvents(oldNode);
  const after = readEvents(newNode);
  for (const [event, oldHandler] of before) {
    const newHandler = after.get(event);
    if (newHandler === undefined) out.push({ kind: 'SET_EVENT', path, event, before: oldHandler, after: null });
    else if (newHandler !== oldHandler) out.push({ kind: 'SET_EVENT', path, event, before: oldHandler, after: newHandler });
  }
  for (const [event, newHandler] of after) {
    if (!before.has(event)) out.push({ kind: 'SET_EVENT', path, event, before: null, after: newHandler });
  }
}

// [AI Note]: DOM 프로퍼티 (Phase 2, 정책 「§4.3 DOM 프로퍼티」). `value` · `checked`는 속성(SET_ATTR)이 아니라 SET_PROP 한 줄로 비교한다.
// 입력창은 사용자가 타이핑하면 속성이 아니라 프로퍼티가 바뀌므로, patch가 프로퍼티로 넣는다 (실제 값과 다를 때만 — 커서 유지, Dev-5 · 6).
// 정규화: value = 문자열 · 숫자(→ 문자열), checked = true · "" → true / false → false, 나머지는 props에 없는 것. null = props에 없음.
function isDomPropName(name: string): name is DomPropName {
  return name === 'value' || name === 'checked';
}

function readDomProps(node: VNode): Map<DomPropName, DomPropValue> {
  const props = new Map<DomPropName, DomPropValue>();
  const { value, checked } = node.props as { value?: unknown; checked?: unknown };
  if (typeof value === 'string') props.set('value', value);
  else if (typeof value === 'number') props.set('value', String(value));
  if (checked === true || checked === '') props.set('checked', true);
  else if (checked === false) props.set('checked', false);
  return props;
}

function diffProps(oldNode: VNode, newNode: VNode, path: Path, out: Patch[]): void {
  const before = readDomProps(oldNode);
  const after = readDomProps(newNode);
  for (const name of ['value', 'checked'] as const) {
    const oldValue = before.get(name) ?? null;
    const newValue = after.get(name) ?? null;
    if (oldValue !== newValue) out.push({ kind: 'SET_PROP', path, name, before: oldValue, after: newValue });
  }
}
