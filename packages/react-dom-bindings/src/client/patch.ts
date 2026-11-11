import type { Patch, Path } from '@mini-react/shared';
import { applyDomProp } from './domProps';
import { setEventHandler } from './events';
import { renderVNode } from './renderVNode';
import { parseStyleText, styleMapToText } from './style';

// [AI Note]: 고칠 일 목록을 실제 DOM에 "순서대로 하나씩" 적용한다 (알고리즘 결정 4 A).
// 경로는 그 patch를 실행하는 순간의 DOM 기준이고, 영역 상자(area) 안 자식부터 센다 (공백 · 주석도 번호를 차지).
// 노드를 새로 만드는 것은 INSERT · REPLACE뿐이고, 나머지는 있는 노드를 그 자리에서 고친다 (P1-17 · P1-18 참조 유지).

/**
 * Diff 시각화(확장)용 관찰 콜백. patch 하나를 적용할 때마다 "바뀐 노드"를 바깥(페이지)에 알려 준다.
 * - `stage: 'before'`: REMOVE만. 지우기 직전, 아직 붙어 있는 노드 (위치를 잴 수 있게)
 * - `stage: 'after'`: 나머지 모두. 적용 직후의 노드 (INSERT · REPLACE는 새로 만든 노드, MOVE는 옮겨진 노드)
 */
export type PatchObserver = (event: { patch: Patch; node: Node; stage: 'before' | 'after' }) => void;

// [AI Note]: 관찰 콜백은 읽기 전용 알림이다. DOM에 표시용 class · 속성을 붙이지 않고, 콜백이 없으면 동작이 이전과 똑같다.
// 오버레이를 그리는 일은 페이지(fixture) 몫이고, 이 패키지는 어떤 노드가 바뀌었는지만 넘긴다.
export function patch(area: Element, patches: readonly Patch[], observer?: PatchObserver): void {
  for (const p of patches) applyPatch(area, p, observer);
}

function applyPatch(area: Element, p: Patch, observer?: PatchObserver): void {
  switch (p.kind) {
    case 'SET_TEXT': {
      const node = nodeAt(area, p.path);
      if (node.nodeType !== Node.TEXT_NODE && node.nodeType !== Node.COMMENT_NODE) {
        throw new Error(`patch: SET_TEXT 대상이 글자 · 주석 노드가 아닙니다 (경로 ${p.path.join(',')})`);
      }
      node.nodeValue = p.after;
      observer?.({ patch: p, node, stage: 'after' });
      return;
    }
    case 'SET_ATTR': {
      const element = elementAt(area, p.path, 'SET_ATTR');
      if (p.after === null) element.removeAttribute(p.name);
      else element.setAttribute(p.name, p.after);
      observer?.({ patch: p, node: element, stage: 'after' });
      return;
    }
    case 'SET_STYLE': {
      const element = elementAt(area, p.path, 'SET_STYLE');
      // [AI Note]: style 속성 글을 직접 쪼개 항목 하나만 고치고 다시 쓴다. CSSOM(el.style)을 쓰면 축약형이 풀리고 모르는 항목이 사라진다.
      // Map으로 고치는 이유: 보통 객체에 `map['__proto__'] = 값`을 쓰면 항목이 아니라 프로토타입이 바뀐다 (검수 1회차 B-1).
      const map = new Map(Object.entries(parseStyleText(element.getAttribute('style') ?? '')));
      if (p.after === null) map.delete(p.property);
      else map.set(p.property, p.after);
      if (map.size === 0) element.removeAttribute('style');
      else element.setAttribute('style', styleMapToText(Object.fromEntries(map)));
      observer?.({ patch: p, node: element, stage: 'after' });
      return;
    }
    case 'INSERT': {
      const parent = parentAt(area, p.path);
      const index = p.path[p.path.length - 1];
      if (index > parent.childNodes.length) throw missing(p.path);
      const inserted = renderVNode(p.node);
      parent.insertBefore(inserted, parent.childNodes[index] ?? null);
      observer?.({ patch: p, node: inserted, stage: 'after' });
      return;
    }
    case 'REMOVE': {
      const node = nodeAt(area, p.path);
      observer?.({ patch: p, node, stage: 'before' });
      node.parentNode!.removeChild(node);
      return;
    }
    case 'REPLACE': {
      const node = nodeAt(area, p.path);
      const replaced = renderVNode(p.after);
      node.parentNode!.replaceChild(replaced, node);
      observer?.({ patch: p, node: replaced, stage: 'after' });
      return;
    }
    case 'MOVE': {
      // [AI Note]: Key 확장 — 같은 DOM 노드를 새로 만들지 않고 옮긴다 (참조 유지). parent의 자식 from번을 빼서
      // "뺀 뒤 목록"의 to번 자리에 넣는다. insertBefore는 이미 붙어 있는 노드를 그대로 옮기므로 제거 + 삽입이 한 번에 된다.
      const parent = p.parent.length === 0 ? area : nodeAt(area, p.parent);
      const count = parent.childNodes.length;
      if (!Number.isInteger(p.from) || p.from < 0 || p.from >= count) {
        throw new Error(`patch: MOVE 대상이 없습니다 (부모 경로 [${p.parent.join(',')}], from ${p.from})`);
      }
      if (!Number.isInteger(p.to) || p.to < 0 || p.to >= count) {
        throw new Error(`patch: MOVE 자리가 목록 밖입니다 (부모 경로 [${p.parent.join(',')}], to ${p.to})`);
      }
      const moved = parent.childNodes[p.from];
      if (p.from === p.to) {
        observer?.({ patch: p, node: moved, stage: 'after' });
        return;
      }
      // 뺀 뒤 목록의 to번 노드 = 원래 목록에서 to < from이면 to번, to > from이면 to + 1번 (from번 하나가 빠져서 한 칸 당겨짐)
      const before = parent.childNodes[p.to < p.from ? p.to : p.to + 1] ?? null;
      parent.insertBefore(moved, before);
      observer?.({ patch: p, node: moved, stage: 'after' });
      return;
    }
    case 'SET_EVENT': {
      // [AI Note]: Phase 2 (결정 8 B). 리스너를 달고 떼지 않고, 요소에 저장된 핸들러만 바꾼다 (null이면 핸들러만 비움). DOM 변경은 없다.
      const element = elementAt(area, p.path, 'SET_EVENT');
      setEventHandler(element, p.event, p.after);
      observer?.({ patch: p, node: element, stage: 'after' });
      return;
    }
    case 'SET_PROP': {
      // [AI Note]: value · checked는 속성이 아니라 프로퍼티. 실제 값과 같으면 대입하지 않는다 (applyDomProp — 타이핑 중 커서 유지).
      const element = elementAt(area, p.path, 'SET_PROP');
      applyDomProp(element, p.name, p.after);
      observer?.({ patch: p, node: element, stage: 'after' });
      return;
    }
  }
}

function missing(path: Path): Error {
  return new Error(`patch: 경로 [${path.join(',')}]에 해당하는 노드가 DOM에 없습니다.`);
}

function walk(area: Element, path: Path): Node {
  let node: Node = area;
  for (const index of path) {
    const child: Node | undefined = node.childNodes[index];
    if (child === undefined) throw missing(path);
    node = child;
  }
  return node;
}

function nodeAt(area: Element, path: Path): Node {
  if (path.length === 0) throw new Error('patch: 경로가 비어 있습니다. 영역 상자 자신은 고칠 수 없습니다.');
  return walk(area, path);
}

function parentAt(area: Element, path: Path): Node {
  if (path.length === 0) throw new Error('patch: 경로가 비어 있습니다. 영역 상자 자신은 고칠 수 없습니다.');
  return walk(area, path.slice(0, -1));
}

function elementAt(area: Element, path: Path, kind: string): Element {
  const node = nodeAt(area, path);
  if (node.nodeType !== Node.ELEMENT_NODE) {
    throw new Error(`patch: ${kind} 대상이 요소가 아닙니다 (경로 ${path.join(',')})`);
  }
  return node as Element;
}
