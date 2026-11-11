import type { Patch } from '@mini-react/shared';

// [AI Note]: 역패치 = 각 patch의 전(before) · 후(after)를 뒤집고, 목록 순서도 거꾸로 (알고리즘 결정 7 세부 — 역순).
// patch는 "그 순간의 트리" 기준 경로로 순서대로 적용되므로, 되돌릴 때는 나중에 한 일부터 거꾸로 해야 경로가 맞는다.
// 입력은 고치지 않고 새 객체를 만든다. HistoryEntry.inverse는 이 결과를 그대로(이미 역순) 순서대로 적용한다.
export function invertPatches(patches: readonly Patch[]): Patch[] {
  return patches.map(invertPatch).reverse();
}

function invertPatch(patch: Patch): Patch {
  switch (patch.kind) {
    case 'SET_TEXT':
      return { kind: 'SET_TEXT', path: patch.path, before: patch.after, after: patch.before };
    case 'SET_ATTR':
      return { kind: 'SET_ATTR', path: patch.path, name: patch.name, before: patch.after, after: patch.before };
    case 'SET_STYLE':
      return { kind: 'SET_STYLE', path: patch.path, property: patch.property, before: patch.after, after: patch.before };
    case 'INSERT':
      return { kind: 'REMOVE', path: patch.path, node: patch.node };
    case 'REMOVE':
      return { kind: 'INSERT', path: patch.path, node: patch.node };
    case 'REPLACE':
      return { kind: 'REPLACE', path: patch.path, before: patch.after, after: patch.before };
    case 'MOVE':
      return { kind: 'MOVE', parent: patch.parent, from: patch.to, to: patch.from };
    // [AI Note]: Phase 2 새 종류도 같은 규칙 — 전 · 후만 뒤집는다. 함수(핸들러)는 복사하지 않고 같은 참조를 그대로 둔다.
    case 'SET_EVENT':
      return { kind: 'SET_EVENT', path: patch.path, event: patch.event, before: patch.after, after: patch.before };
    case 'SET_PROP':
      return { kind: 'SET_PROP', path: patch.path, name: patch.name, before: patch.after, after: patch.before };
  }
}
