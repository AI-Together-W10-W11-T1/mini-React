// 테스트 전용 검산기. 테스트가 아니므로 직접 테스트하지 않는다 (diff · invertPatches 결과를 눈으로 믿지 않고 적용해서 확인하는 용도).
// [AI Note]: VNode 목록에 patch를 "순서대로 하나씩" 적용해 새 목록을 만든다. 경로는 그 patch를 실행하는 순간의 트리 기준 (알고리즘 결정 4 A).
// DOM 없이 순수 VNode만 다룬다. 입력은 고치지 않고 새 객체를 만든다. MOVE 포함 7종.
import { COMMENT_NODE, TEXT_NODE } from '@mini-react/shared';
import type { AreaChildren, ElementVNode, Patch, Path, StyleMap, VNode } from '@mini-react/shared';

type Children = readonly VNode[];

function mapChildren(list: Children, parent: Path, fn: (children: Children) => Children): Children {
  if (parent.length === 0) return fn(list);
  const [head, ...rest] = parent;
  const target = list[head];
  if (target === undefined) throw new Error(`applyPatches: 경로에 노드가 없습니다 (${parent.join(',')})`);
  const next: VNode = { ...target, children: mapChildren(target.children, rest, fn) } as VNode;
  return [...list.slice(0, head), next, ...list.slice(head + 1)];
}

function mapNode(list: Children, path: Path, fn: (node: VNode) => VNode): Children {
  const parent = path.slice(0, -1);
  const index = path[path.length - 1];
  return mapChildren(list, parent, (children) => {
    const target = children[index];
    if (target === undefined) throw new Error(`applyPatches: 경로에 노드가 없습니다 (${path.join(',')})`);
    return [...children.slice(0, index), fn(target), ...children.slice(index + 1)];
  });
}

function withProps(node: VNode, props: { readonly [name: string]: unknown }): VNode {
  return { ...node, props } as VNode;
}

export function applyPatch(list: AreaChildren, patch: Patch): AreaChildren {
  switch (patch.kind) {
    case 'SET_TEXT':
      return mapNode(list, patch.path, (node) => {
        if (node.type !== TEXT_NODE && node.type !== COMMENT_NODE) throw new Error('applyPatches: SET_TEXT 대상이 글자 · 주석이 아닙니다');
        return withProps(node, { nodeValue: patch.after });
      });
    case 'SET_ATTR':
      return mapNode(list, patch.path, (node) => {
        // [AI Note]: `props[이름] = 값` 대신 Map을 거쳐 fromEntries로 만든다. 이름이 `__proto__`면 대입은 프로토타입 설정이라 속성이 사라진다 (검수 2회차 B-1).
        const attrs = new Map(Object.entries(node.props));
        if (patch.after === null) attrs.delete(patch.name);
        else attrs.set(patch.name, patch.after);
        return withProps(node, Object.fromEntries(attrs));
      });
    case 'SET_STYLE':
      return mapNode(list, patch.path, (node) => {
        // [AI Note]: Map으로 고친다. 보통 객체에 `style['__proto__'] = '값'`을 쓰면 항목이 아니라 프로토타입 설정이라 무시된다 (검수 1회차 B-1).
        const style = new Map(Object.entries((node.props as { style?: StyleMap }).style ?? {}));
        if (patch.after === null) style.delete(patch.property);
        else style.set(patch.property, patch.after);
        const props: { [name: string]: unknown } = { ...node.props };
        // 항목이 하나도 없으면 style props를 두지 않는다 (domToVNode와 같은 규칙)
        if (style.size === 0) delete props.style;
        else props.style = Object.fromEntries(style);
        return withProps(node, props);
      });
    case 'INSERT': {
      const index = patch.path[patch.path.length - 1];
      return mapChildren(list, patch.path.slice(0, -1), (children) => {
        if (index > children.length) throw new Error(`applyPatches: INSERT 자리가 목록 길이를 넘었습니다 (${patch.path.join(',')})`);
        return [...children.slice(0, index), patch.node, ...children.slice(index)];
      });
    }
    case 'REMOVE': {
      const index = patch.path[patch.path.length - 1];
      return mapChildren(list, patch.path.slice(0, -1), (children) => {
        if (children[index] === undefined) throw new Error(`applyPatches: REMOVE 대상이 없습니다 (${patch.path.join(',')})`);
        return [...children.slice(0, index), ...children.slice(index + 1)];
      });
    }
    case 'REPLACE':
      return mapNode(list, patch.path, () => patch.after);
    case 'MOVE':
      return mapChildren(list, patch.parent, (children) => {
        const moved = children[patch.from];
        if (moved === undefined) throw new Error(`applyPatches: MOVE 대상이 없습니다 (from ${patch.from})`);
        const rest = [...children.slice(0, patch.from), ...children.slice(patch.from + 1)];
        return [...rest.slice(0, patch.to), moved, ...rest.slice(patch.to)];
      });
    case 'SET_EVENT':
      // 이벤트 이름 `click` → props 이름 `onClick` (on + 첫 글자 대문자). `null`이면 뺀다
      return mapNode(list, patch.path, (node) => {
        const name = `on${patch.event.charAt(0).toUpperCase()}${patch.event.slice(1)}`;
        const props = new Map(Object.entries(node.props));
        if (patch.after === null) props.delete(name);
        else props.set(name, patch.after);
        return withProps(node, Object.fromEntries(props));
      });
    case 'SET_PROP':
      // `value` · `checked`: `name` prop을 after로 두고 `null`이면 뺀다
      return mapNode(list, patch.path, (node) => {
        const props = new Map(Object.entries(node.props));
        if (patch.after === null) props.delete(patch.name);
        else props.set(patch.name, patch.after);
        return withProps(node, Object.fromEntries(props));
      });
  }
}

export function applyPatches(list: AreaChildren, patches: readonly Patch[]): AreaChildren {
  return patches.reduce<AreaChildren>((current, patch) => applyPatch(current, patch), list);
}

/** 비교용: 속성 값을 diff와 같은 규칙으로 정규화한 VNode 목록 (true → "", 숫자 → 문자열, false · null · undefined 제거) */
export function normalizeTree(list: AreaChildren): AreaChildren {
  return list.map((node) => {
    if (node.type === TEXT_NODE || node.type === COMMENT_NODE) return node;
    // [AI Note]: 쌍을 모아 fromEntries로 만든다 — `__proto__` 속성 이름도 보통 항목으로 남긴다 (검수 2회차 B-1).
    const entries: Array<[string, unknown]> = [];
    for (const [name, value] of Object.entries(node.props)) {
      if (name === 'style' && typeof value === 'object' && value !== null) entries.push([name, value]);
      else if (typeof value === 'string') entries.push([name, value]);
      else if (typeof value === 'number') entries.push([name, String(value)]);
      else if (value === true) entries.push([name, '']);
    }
    const props = Object.fromEntries(entries);
    return { ...(node as ElementVNode), props, children: normalizeTree(node.children) } as VNode;
  });
}
