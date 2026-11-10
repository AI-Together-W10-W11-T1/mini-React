// [AI Note]: HTML 글을 "엔진이 직접" 훑는 작은 분석기. checkHtml이 두 가지에 쓴다.
//  ① 태그 짝 검사: 여는 · 닫는 태그가 짝이 맞는지 (빈 태그 제외, 빠뜨린 닫는 태그를 브라우저가 몰래 고치기 전에 알아낸다)
//  ② 구조 비교: 여기서 만든 태그 나무 ↔ 브라우저가 읽은 나무 (브라우저의 자동 보정을 찾아낸다)
// 브라우저 파서를 흉내 내지 않는다 — 입력한 글 그대로의 "쓴 모습"만 본다. 그래야 둘의 차이가 보정의 증거가 된다.
// DOM을 만지지 않는 순수 문자열 처리다. 깊은 중첩에서도 스택이 넘치지 않게 반복문 + 명시적 스택으로 만든다.

export interface ScanNode {
  /** 소문자 태그 이름 */
  readonly tag: string;
  readonly children: ScanNode[];
}

export interface HtmlScanResult {
  /** 엔진이 훑은 요소 나무 (글자 · 주석은 담지 않음) */
  readonly tree: ScanNode[];
  /** 짝 문제 한 줄 설명들 (문서 순서) */
  readonly issues: string[];
}

/** 닫는 태그가 없는 요소 (HTML 빈 태그) */
export const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

// 안의 글을 태그로 읽지 않고 닫는 태그가 나올 때까지 그대로 읽는 요소 (원문 글 · RCDATA)
const RAW_TEXT_TAGS = new Set(['style', 'script', 'textarea', 'title', 'xmp', 'iframe', 'noembed', 'noframes']);

// 안에서는 `/>`가 진짜 자기 닫는 태그인 요소 (외부 이름공간). SVG 안의 <circle/>이 짝 오탐을 내지 않게 한다
const FOREIGN_TAGS = new Set(['svg', 'math']);

const isLetter = (c: string | undefined): boolean => c !== undefined && /[A-Za-z]/.test(c);
const isSpace = (c: string): boolean => c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f';

export function scanHtml(html: string): HtmlScanResult {
  const root: ScanNode = { tag: '#root', children: [] };
  const stack: ScanNode[] = [root];
  const issues: string[] = [];
  let foreignDepth = 0;
  let i = 0;
  const n = html.length;

  const closeTop = (): void => {
    const popped = stack.pop()!;
    if (FOREIGN_TAGS.has(popped.tag)) foreignDepth--;
  };

  while (i < n) {
    const lt = html.indexOf('<', i);
    if (lt < 0) break;
    const next = html[lt + 1];

    // 주석 <!-- … -->
    if (html.startsWith('<!--', lt)) {
      if (html.startsWith('<!-->', lt)) i = lt + 5;
      else if (html.startsWith('<!--->', lt)) i = lt + 6;
      else {
        const end = html.indexOf('-->', lt + 4);
        i = end < 0 ? n : end + 3;
      }
      continue;
    }

    // <!DOCTYPE …> · <![CDATA[ · <? … > · </ 다음이 글자가 아닌 것: 브라우저는 모두 "가짜 주석"으로 읽고 첫 `>`에서 끝낸다
    if (next === '!' || next === '?' || (next === '/' && !isLetter(html[lt + 2]))) {
      if (next === '/' && html[lt + 2] === '>') {
        i = lt + 3; // `</>`는 그냥 버려진다
        continue;
      }
      const end = html.indexOf('>', lt + 2);
      i = end < 0 ? n : end + 1;
      continue;
    }

    // 닫는 태그 </name …>
    if (next === '/') {
      let j = lt + 2;
      while (j < n && !isSpace(html[j]) && html[j] !== '/' && html[j] !== '>') j++;
      const name = html.slice(lt + 2, j).toLowerCase();
      const end = html.indexOf('>', j);
      if (end < 0) {
        issues.push(`</${name} 로 시작한 닫는 태그가 > 로 닫히지 않았습니다.`);
        i = n;
        continue;
      }
      i = end + 1;
      handleClose(name);
      continue;
    }

    // 여는 태그 <name attr…>
    if (isLetter(next)) {
      let j = lt + 1;
      while (j < n && !isSpace(html[j]) && html[j] !== '/' && html[j] !== '>') j++;
      const name = html.slice(lt + 1, j).toLowerCase();
      const parsed = readAttributes(html, j);
      if (parsed === null) {
        // `>`를 못 찾고 글이 끝남: 브라우저는 이 태그를 통째로 버린다 (글이 조용히 사라지므로 알린다)
        issues.push(`<${name} 로 시작한 태그가 > 로 닫히지 않았습니다.`);
        i = n;
        continue;
      }
      i = parsed.end;
      const node: ScanNode = { tag: name, children: [] };
      stack[stack.length - 1].children.push(node);
      const selfClosing = parsed.selfClosing && foreignDepth > 0;
      if (VOID_TAGS.has(name) || selfClosing) {
        // 빈 태그 · 외부 이름공간의 `/>`: 열지 않는다. (HTML 요소의 `<div/>`는 `/`가 무시돼 열린 채로 남는다)
        continue;
      }
      stack.push(node);
      if (FOREIGN_TAGS.has(name)) foreignDepth++;
      if (RAW_TEXT_TAGS.has(name)) i = skipRawText(html, i, name);
      continue;
    }

    // `<` 뒤가 글자가 아니면(`1 < 2`, `x <= y`, `<>`) 태그가 아니라 글자다
    i = lt + 1;
  }

  // 글이 끝났는데 열려 있는 것들
  while (stack.length > 1) {
    issues.push(`<${stack[stack.length - 1].tag}> 태그가 닫히지 않았습니다.`);
    closeTop();
  }
  return { tree: root.children, issues };

  function handleClose(name: string): void {
    const top = stack[stack.length - 1];
    if (stack.length > 1 && top.tag === name) {
      closeTop();
      return;
    }
    let depth = -1;
    for (let k = stack.length - 1; k >= 1; k--) {
      if (stack[k].tag === name) {
        depth = k;
        break;
      }
    }
    if (depth < 0) {
      issues.push(`</${name}> 닫는 태그에 짝이 되는 여는 태그가 없습니다.`);
      return;
    }
    // 안쪽에 닫히지 않은 것이 있다: 그것들을 닫히지 않은 것으로 알리고, 이 닫는 태그까지 한꺼번에 닫는다
    while (stack.length - 1 > depth) {
      issues.push(`<${stack[stack.length - 1].tag}> 태그가 닫히지 않았습니다 (</${name}>를 먼저 만났습니다).`);
      closeTop();
    }
    closeTop();
  }
}

// 이름 뒤부터 `>`까지를 속성 읽기 규칙대로 건너뛴다. 따옴표 안의 `>`는 끝이 아니다. `>`를 못 찾으면 null
function readAttributes(html: string, from: number): { end: number; selfClosing: boolean } | null {
  const n = html.length;
  let j = from;
  let selfClosing = false;
  while (j < n) {
    const c = html[j];
    if (c === '>') return { end: j + 1, selfClosing };
    if (isSpace(c)) {
      j++;
      continue;
    }
    if (c === '/') {
      selfClosing = html[j + 1] === '>';
      j++;
      continue;
    }
    selfClosing = false;
    // 속성 이름 (첫 글자가 `=`여도 이름의 일부로 본다)
    j++;
    while (j < n && !isSpace(html[j]) && html[j] !== '/' && html[j] !== '>' && html[j] !== '=') j++;
    while (j < n && isSpace(html[j])) j++;
    if (html[j] !== '=') continue;
    j++;
    while (j < n && isSpace(html[j])) j++;
    const quote = html[j];
    if (quote === '"' || quote === "'") {
      const close = html.indexOf(quote, j + 1);
      if (close < 0) return null;
      j = close + 1;
    } else {
      while (j < n && !isSpace(html[j]) && html[j] !== '>') j++;
    }
  }
  return null;
}

// 원문 글 요소 안을 건너뛰고, 닫는 태그(`</name` 다음이 공백 · `/` · `>`) 바로 앞 위치를 돌려준다. 못 찾으면 글 끝
function skipRawText(html: string, from: number, name: string): number {
  const lower = html.toLowerCase();
  const needle = `</${name}`;
  let at = from;
  for (;;) {
    const found = lower.indexOf(needle, at);
    if (found < 0) return html.length;
    const after = html[found + needle.length];
    if (after === undefined || isSpace(after) || after === '/' || after === '>') return found;
    at = found + needle.length;
  }
}
