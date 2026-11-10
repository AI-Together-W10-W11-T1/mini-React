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
    case 'MOVE':
      // [AI Note]: MOVE는 Key 확장(Dev-22)에서 구현한다. 필수 diff(위치 기반)는 MOVE를 만들지 않는다.
      throw new Error('patch: MOVE는 Key 확장(Dev-22)에서 구현합니다. 아직 지원하지 않습니다.');
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
