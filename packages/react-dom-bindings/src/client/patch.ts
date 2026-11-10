import type { Patch, Path } from '@mini-react/shared';
import { renderVNode } from './renderVNode';
import { parseStyleText, styleMapToText } from './style';

// [AI Note]: 고칠 일 목록을 실제 DOM에 "순서대로 하나씩" 적용한다 (알고리즘 결정 4 A).
// 경로는 그 patch를 실행하는 순간의 DOM 기준이고, 영역 상자(area) 안 자식부터 센다 (공백 · 주석도 번호를 차지).
// 노드를 새로 만드는 것은 INSERT · REPLACE뿐이고, 나머지는 있는 노드를 그 자리에서 고친다 (P1-17 · P1-18 참조 유지).
export function patch(area: Element, patches: readonly Patch[]): void {
  for (const p of patches) applyPatch(area, p);
}

function applyPatch(area: Element, p: Patch): void {
  switch (p.kind) {
    case 'SET_TEXT': {
      const node = nodeAt(area, p.path);
      if (node.nodeType !== Node.TEXT_NODE && node.nodeType !== Node.COMMENT_NODE) {
        throw new Error(`patch: SET_TEXT 대상이 글자 · 주석 노드가 아닙니다 (경로 ${p.path.join(',')})`);
      }
      node.nodeValue = p.after;
      return;
    }
    case 'SET_ATTR': {
      const element = elementAt(area, p.path, 'SET_ATTR');
      if (p.after === null) element.removeAttribute(p.name);
      else element.setAttribute(p.name, p.after);
      return;
    }
    case 'SET_STYLE': {
      const element = elementAt(area, p.path, 'SET_STYLE');
      // [AI Note]: style 속성 글을 직접 쪼개 항목 하나만 고치고 다시 쓴다. CSSOM(el.style)을 쓰면 축약형이 풀리고 모르는 항목이 사라진다.
      const map: { [property: string]: string } = { ...parseStyleText(element.getAttribute('style') ?? '') };
      if (p.after === null) delete map[p.property];
      else map[p.property] = p.after;
      if (Object.keys(map).length === 0) element.removeAttribute('style');
      else element.setAttribute('style', styleMapToText(map));
      return;
    }
    case 'INSERT': {
      const parent = parentAt(area, p.path);
      const index = p.path[p.path.length - 1];
      if (index > parent.childNodes.length) throw missing(p.path);
      parent.insertBefore(renderVNode(p.node), parent.childNodes[index] ?? null);
      return;
    }
    case 'REMOVE': {
      const node = nodeAt(area, p.path);
      node.parentNode!.removeChild(node);
      return;
    }
    case 'REPLACE': {
      const node = nodeAt(area, p.path);
      node.parentNode!.replaceChild(renderVNode(p.after), node);
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
      if (p.from === p.to) return;
      const moved = parent.childNodes[p.from];
      // 뺀 뒤 목록의 to번 노드 = 원래 목록에서 to < from이면 to번, to > from이면 to + 1번 (from번 하나가 빠져서 한 칸 당겨짐)
      const before = parent.childNodes[p.to < p.from ? p.to : p.to + 1] ?? null;
      parent.insertBefore(moved, before);
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
