import type { StyleMap } from '@mini-react/shared';

// [AI Note]: style 속성 글 ↔ StyleMap. 브라우저 CSSOM(`el.style`)으로 읽지 않고 글을 직접 쪼갠다.
// CSSOM은 축약형(`background`)을 낱개 여러 개로 풀고 모르는 항목을 버려서 VNode와 실제 DOM이 어긋난다 (jsdom에서 확인).
// 쪼갤 때 괄호 · 따옴표 · /* … */ 주석 안의 `;` `:`는 구분자로 보지 않는다.
export function parseStyleText(text: string): StyleMap {
  const entries = new Map<string, string>();
  let depth = 0;
  let quote: string | null = null;
  let inComment = false;
  let start = 0;
  let colon = -1;

  const flush = (end: number): void => {
    if (colon < 0) return;
    // 이름 쪽 주석은 걷어 낸다. 값 쪽 주석 · !important는 값의 일부로 그대로 둔다
    const rawName = text.slice(start, colon).replace(/\/\*[\s\S]*?\*\//g, '').trim();
    const value = text.slice(colon + 1, end).trim();
    if (rawName === '' || value === '') return;
    const name = rawName.startsWith('--') ? rawName : rawName.toLowerCase();
    entries.set(name, value);
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inComment) {
      if (c === '*' && text[i + 1] === '/') {
        inComment = false;
        i++;
      }
      continue;
    }
    if (quote !== null) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      inComment = true;
      i++;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === '(') {
      depth++;
    } else if (c === ')') {
      if (depth > 0) depth--;
    } else if (c === ':') {
      if (depth === 0 && colon < 0) colon = i;
    } else if (c === ';' && depth === 0) {
      flush(i);
      start = i + 1;
      colon = -1;
    }
  }
  flush(text.length);
  // Object.fromEntries는 `__proto__`도 보통 항목으로 담는다
  return Object.fromEntries(entries);
}

export function styleMapToText(map: StyleMap): string {
  return Object.entries(map)
    .map(([name, value]) => `${name}: ${value}`)
    .join('; ');
}
