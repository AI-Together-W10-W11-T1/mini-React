import { COMMENT_NODE, TEXT_NODE } from '@mini-react/shared';
import type { AreaChildren, ElementVNode, StyleMap, VNode } from '@mini-react/shared';
import { styleMapToText } from './style';

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

// 안의 글을 이스케이프 없이 그대로 읽는 요소 (HTML 파서의 원문 글 요소). 여기서 &lt; 로 쓰면 글자 그대로 `&lt;`가 된다
const RAW_TEXT_ELEMENTS = new Set(['style', 'script', 'xmp', 'iframe', 'noembed', 'noframes']);

// 여는 태그 바로 뒤의 첫 줄바꿈 하나를 파서가 버리는 요소
const SWALLOW_FIRST_NEWLINE = new Set(['pre', 'textarea', 'listing']);

// [AI Note]: 저장한 VNode → 편집창에 채울 HTML 글. 뒤로 · 앞으로 때 편집창이 그 기록의 모습을 보이게 한다 (P1-30).
// 공백 · 주석을 그대로 쓰고(결정 5 B), "HTML 글 → 파싱 → domToVNode"가 원래 VNode가 되도록 이스케이프 규칙을 맞춘다.
// DOM을 만지지 않는 순수 문자열 변환이다.
export function vnodesToHtml(children: AreaChildren): string {
  return children.map((node) => nodeToHtml(node, false)).join('');
}

function nodeToHtml(node: VNode, raw: boolean): string {
  if (node.type === TEXT_NODE) {
    const value = (node.props as { nodeValue: string }).nodeValue;
    return raw ? value : escapeText(value);
  }
  if (node.type === COMMENT_NODE) {
    return `<!--${(node.props as { nodeValue: string }).nodeValue}-->`;
  }
  if (typeof node.type === 'function') {
    throw new Error('vnodesToHtml은 컴포넌트 VNode를 쓸 수 없습니다. 컴포넌트를 호출해 요소 VNode로 바꾼 뒤 넘겨 주세요.');
  }
  return elementToHtml(node as ElementVNode);
}

function elementToHtml(node: ElementVNode): string {
  const tag = node.type;
  const open = `<${tag}${attributesToHtml(node)}>`;
  if (VOID_ELEMENTS.has(tag)) return open;

  const raw = RAW_TEXT_ELEMENTS.has(tag);
  let inner = node.children.map((child) => nodeToHtml(child, raw)).join('');
  // [AI Note]: <pre>·<textarea> 바로 뒤의 첫 줄바꿈은 파서가 버린다. 글자가 "\n"으로 시작하면 하나 더 써서 보존한다
  if (SWALLOW_FIRST_NEWLINE.has(tag) && inner.startsWith('\n')) inner = '\n' + inner;
  return `${open}${inner}</${tag}>`;
}

function attributesToHtml(node: ElementVNode): string {
  let out = '';
  for (const [name, value] of Object.entries(node.props)) {
    const text = attributeValue(name, value);
    if (text !== null) out += ` ${name}="${escapeAttribute(text)}"`;
  }
  return out;
}

// 속성 값 정규화 (diff · renderVNode와 같은 규칙): 문자열 · 숫자 → 문자열, true → "", false · null · undefined → 없음,
// style 객체는 속성 글로(빈 묶음이면 없음), 그 밖의 함수 · 객체는 속성으로 안 다룸
function attributeValue(name: string, value: unknown): string | null {
  if (name === 'style' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const text = styleMapToText(value as StyleMap);
    return text === '' ? null : text;
  }
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value === true) return '';
  return null;
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
