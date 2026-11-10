// [AI Note]: "미리보기에서 빼고 Patch 때 막는 목록"의 단 하나의 기준 (dev_todo 공통 약속).
// 미리보기(setAreaHtml)는 여기서 찾은 것을 빼고 그리고, Patch 때 검사(checkHtml)는 같은 목록을 문제로 알린다.
// 두 곳이 어긋나면 "미리보기에는 있는데 Patch는 통과" 같은 틈이 생기므로 기준을 이 파일 하나에 둔다.

/** 요소째 빼는 것: <script> · <iframe> · <object> · <embed> · <style> (+ <link rel="stylesheet">은 아래에서 따로 판정) */
const BLOCKED_ELEMENTS = new Set(['script', 'iframe', 'object', 'embed', 'style']);

/** 주소를 담는 속성 중 `javascript:`를 막을 것 */
const URL_ATTRIBUTES = new Set(['href', 'src', 'action', 'formaction']);

export type DangerousKind =
  /** 요소 자체가 막힌 종류 (`<script>` · `<iframe>` · `<object>` · `<embed>` · `<style>` · `<link rel="stylesheet">`) */
  | 'ELEMENT'
  /** `on…` 이벤트 핸들러 속성 */
  | 'EVENT_ATTRIBUTE'
  /** `javascript:` 주소 속성 */
  | 'JAVASCRIPT_URL';

export interface DangerousFinding {
  /** 찾은 요소 (요소째 막힌 경우 그 요소, 속성이면 그 속성을 가진 요소) */
  readonly node: Element;
  /** 소문자 태그 이름 */
  readonly element: string;
  /** 문제가 된 속성 이름. 요소째 막힌 경우 `null` */
  readonly attribute: string | null;
  readonly kind: DangerousKind;
}

/**
 * root 아래에서 위험한 것을 찾아 문서 순서대로 알려 준다. DOM은 고치지 않는다.
 * 막힌 요소 안쪽은 요소째 빠질 것이므로 따로 세지 않는다. `<template>` 안(비활성 내용)도 훑는다.
 * 깊은 트리에서도 스택이 넘치지 않게 반복문으로 훑는다 (B20).
 */
export function scanDangerous(root: ParentNode): DangerousFinding[] {
  const findings: DangerousFinding[] = [];
  // 문서 순서(앞 → 뒤)를 지키려고 스택에 뒤에서부터 넣는다
  const stack: ParentNode[] = [root];
  while (stack.length > 0) {
    const parent = stack.pop()!;
    const children = Array.from(parent.children);
    const next: ParentNode[] = [];
    for (const element of children) {
      const tag = element.localName;
      if (isBlockedElement(element)) {
        findings.push({ node: element, element: tag, attribute: null, kind: 'ELEMENT' });
        continue;
      }
      for (const name of element.getAttributeNames()) {
        if (/^on/i.test(name)) {
          findings.push({ node: element, element: tag, attribute: name, kind: 'EVENT_ATTRIBUTE' });
        } else if (URL_ATTRIBUTES.has(name) && isJavascriptUrl(element.getAttribute(name) ?? '')) {
          findings.push({ node: element, element: tag, attribute: name, kind: 'JAVASCRIPT_URL' });
        }
      }
      if (element instanceof HTMLTemplateElement) next.push(element.content);
      next.push(element);
    }
    // 스택은 뒤에서 꺼내므로 뒤집어 넣어야 앞 형제부터 처리된다
    for (let i = next.length - 1; i >= 0; i--) stack.push(next[i]);
  }
  return findings;
}

/** 찾은 것을 실제로 뺀다: 속성은 `removeAttribute`, 요소는 통째로 `remove`. 뺀 목록을 돌려준다 */
export function removeDangerous(root: ParentNode): DangerousFinding[] {
  const findings = scanDangerous(root);
  for (const finding of findings) {
    if (finding.attribute === null) finding.node.remove();
    else finding.node.removeAttribute(finding.attribute);
  }
  return findings;
}

function isBlockedElement(element: Element): boolean {
  const tag = element.localName;
  if (BLOCKED_ELEMENTS.has(tag)) return true;
  if (tag === 'link') {
    // rel 값을 공백으로 쪼갠 낱말 중 stylesheet가 있으면 해당 (대소문자 무시)
    return (element.getAttribute('rel') ?? '')
      .split(/\s+/)
      .some((word) => word.toLowerCase() === 'stylesheet');
  }
  return false;
}

// [AI Note]: 파서가 글을 읽은 뒤의 값으로 판정한다. 문자 참조(`jav&#x61;script:`)는 이미 풀려 있다.
// URL 규칙처럼 앞쪽의 공백 · 제어문자를 자르고 값 안의 탭 · 줄바꿈을 지운 뒤 소문자로 비교한다 (B12).
function isJavascriptUrl(value: string): boolean {
  const normalized = value
    .replace(/^[\u0000- ]+/, '')
    .replace(/[\t\n\r]/g, '')
    .toLowerCase();
  return normalized.startsWith('javascript:');
}
