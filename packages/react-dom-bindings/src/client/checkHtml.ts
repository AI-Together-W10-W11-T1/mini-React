import { scanDangerous } from './sanitize';
import type { DangerousFinding } from './sanitize';
import { scanHtml } from './htmlScan';
import type { ScanNode } from './htmlScan';

/**
 * Patch 때 알려 줄 문제 종류 (알림 말머리 5종과 1:1).
 * - `PATCH_ERROR`는 `checkHtml`이 아니라 Patch 도중 예외(C2)를 페이지가 알릴 때 쓴다 (Dev-17)
 */
export type HtmlProblemKind = 'DANGEROUS' | 'UNPAIRED' | 'STRUCTURE' | 'SVG' | 'PATCH_ERROR';

export interface HtmlProblem {
  readonly kind: HtmlProblemKind;
  /** 말머리를 뺀 한 줄 설명 */
  readonly message: string;
}

/** 알림 말머리 (dev_todo 「Patch 때 검사 알림 문구」 — e2e가 이 말마디로 확인한다) */
export const PROBLEM_LABELS: Readonly<Record<HtmlProblemKind, string>> = {
  DANGEROUS: '[위험한 코드]',
  UNPAIRED: '[태그 짝]',
  STRUCTURE: '[구조 불일치]',
  SVG: '[SVG 미지원]',
  PATCH_ERROR: '[Patch 오류]',
};

const RETRY_LINE = '다시 작성해 주세요.';

// [AI Note]: Patch 버튼을 눌렀을 때 편집창 글을 검사한다. 문제가 하나라도 있으면 페이지가 alert로 알리고 Patch를 막는다.
// 위험 코드의 기준은 sanitize.ts의 scanDangerous 하나뿐이다 (미리보기에서 빼는 것과 같은 목록).
// 글을 살아 있는 문서에 넣지 않고 <template> 안에서 읽는다. 검사 순서(알림 줄 순서) = 위험한 코드 → SVG → 태그 짝 → 구조.
// 태그 짝 · 구조는 htmlScan(엔진이 글을 직접 훑은 결과)과 브라우저가 읽은 나무를 비교해 찾는다.
// 브라우저는 빠진 닫는 태그 · 잘못 놓인 태그를 몰래 고쳐 읽으므로, 고치기 전의 "쓴 모습"과 비교해야 알아챌 수 있다.
export function checkHtml(html: string): HtmlProblem[] {
  const template = document.createElement('template');
  template.innerHTML = html;
  const fragment = template.content;

  const problems: HtmlProblem[] = [];
  for (const finding of scanDangerous(fragment)) {
    problems.push({ kind: 'DANGEROUS', message: describeDangerous(finding) });
  }
  // 몇 개가 있든(중첩 포함) 한 줄로 알린다. 파서가 `<SVG>`도 소문자 svg로 읽어 주므로 대소문자는 신경 쓰지 않는다
  if (fragment.querySelector('svg') !== null) {
    problems.push({ kind: 'SVG', message: '<svg> 요소는 지원하지 않습니다.' });
  }

  const scan = scanHtml(html);
  for (const message of scan.issues.slice(0, MAX_PAIR_LINES)) {
    problems.push({ kind: 'UNPAIRED', message });
  }
  if (scan.issues.length > MAX_PAIR_LINES) {
    problems.push({ kind: 'UNPAIRED', message: `그 밖에 ${scan.issues.length - MAX_PAIR_LINES}건의 짝 문제가 더 있습니다.` });
  }

  const mismatch = findStructureMismatch(scan.tree, readBrowserTree(fragment), null);
  if (mismatch !== null) {
    const parent = mismatch.parent === null ? '최상위에서' : `<${mismatch.parent}> 안에서`;
    problems.push({
      kind: 'STRUCTURE',
      message: `${parent} 입력한 구조(${outline(mismatch.written)})와 브라우저가 읽은 구조(${outline(mismatch.parsed)})가 다릅니다.`,
    });
  }
  return problems;
}

// 짝 문제 줄이 너무 많으면 알림이 화면을 넘치므로 앞의 몇 줄만 적는다
const MAX_PAIR_LINES = 5;

/** 알림 글: 문제 한 줄 = `[말머리] 설명`, 마지막 줄 "다시 작성해 주세요." (Patch 오류만 있으면 자체 안내가 있어 붙이지 않음) */
export function formatProblems(problems: readonly HtmlProblem[]): string {
  const lines = problems.map((p) => `${PROBLEM_LABELS[p.kind]} ${p.message}`);
  if (problems.some((p) => p.kind !== 'PATCH_ERROR')) lines.push(RETRY_LINE);
  return lines.join('\n');
}

function describeDangerous(finding: DangerousFinding): string {
  switch (finding.kind) {
    case 'ELEMENT':
      // <link> · <meta>는 일부 모습만 막히므로 그 모습 그대로 적는다
      if (finding.element === 'link') return '<link rel="stylesheet"> 요소';
      if (finding.element === 'meta') return '<meta http-equiv="refresh"> 요소';
      return `<${finding.element}> 요소`;
    case 'EVENT_ATTRIBUTE':
      return `<${finding.element}> 요소의 ${finding.attribute} 속성`;
    case 'JAVASCRIPT_URL':
      return `<${finding.element}> 요소의 ${finding.attribute} 속성 (javascript: 주소)`;
  }
}

// 브라우저가 읽은 요소 나무 (글자 · 주석은 뺀다). <template>은 안쪽(content)을 자식으로 본다. 반복문으로 훑어 깊은 트리에서도 안전하다
function readBrowserTree(fragment: DocumentFragment): ScanNode[] {
  const root: ScanNode = { tag: '#root', children: [] };
  const work: Array<{ source: ParentNode; into: ScanNode }> = [{ source: fragment, into: root }];
  while (work.length > 0) {
    const { source, into } = work.pop()!;
    for (const child of Array.from(source.children)) {
      const node: ScanNode = { tag: child.localName.toLowerCase(), children: [] };
      into.children.push(node);
      work.push({ source: child instanceof HTMLTemplateElement ? child.content : child, into: node });
    }
  }
  return root.children;
}

interface Mismatch {
  readonly parent: string | null;
  readonly written: readonly ScanNode[];
  readonly parsed: readonly ScanNode[];
}

// 두 나무를 위에서부터 비교해 처음 다른 형제 목록을 돌려준다 (같으면 null). 태그 이름 · 중첩만 비교한다
function findStructureMismatch(written: readonly ScanNode[], parsed: readonly ScanNode[], parent: string | null): Mismatch | null {
  const pending: Array<{ written: readonly ScanNode[]; parsed: readonly ScanNode[]; parent: string | null }> = [
    { written, parsed, parent },
  ];
  // 문서 순서대로 "처음 다른 곳"을 찾으려고 스택에 뒤에서부터 넣는다
  while (pending.length > 0) {
    const level = pending.pop()!;
    // [AI Note]: C1 예외 — 브라우저가 <table> 안에 몰래 끼운 <tbody>만 같은 것으로 본다(그 자식을 <table> 자식으로 펼쳐 비교).
    // 입력에도 그 자리에 <tbody>가 있었다면 직접 쓴 것이라 펼치지 않는다. <tr>까지 자동으로 추가되는 `<table><td>`는 그대로 불일치.
    const parsedChildren = level.parent === 'table' ? flattenAutoTbody(level.written, level.parsed) : level.parsed;
    if (level.written.length !== parsedChildren.length || level.written.some((w, k) => w.tag !== parsedChildren[k].tag)) {
      return { parent: level.parent, written: level.written, parsed: parsedChildren };
    }
    for (let k = level.written.length - 1; k >= 0; k--) {
      pending.push({ written: level.written[k].children, parsed: parsedChildren[k].children, parent: level.written[k].tag });
    }
  }
  return null;
}

function flattenAutoTbody(written: readonly ScanNode[], parsed: readonly ScanNode[]): ScanNode[] {
  const out: ScanNode[] = [];
  for (const node of parsed) {
    if (node.tag === 'tbody' && written[out.length]?.tag !== 'tbody') out.push(...node.children);
    else out.push(node);
  }
  return out;
}

// 알림 글에 넣을 짧은 구조 요약: `<p><div></div></p>`, 길면 자른다
function outline(nodes: readonly ScanNode[]): string {
  const parts: string[] = [];
  const work: Array<ScanNode | string> = [];
  for (let k = nodes.length - 1; k >= 0; k--) work.push(nodes[k]);
  let length = 0;
  while (work.length > 0 && length < OUTLINE_LIMIT) {
    const item = work.pop()!;
    if (typeof item === 'string') {
      parts.push(item);
      length += item.length;
      continue;
    }
    const open = `<${item.tag}>`;
    parts.push(open);
    length += open.length;
    work.push(`</${item.tag}>`);
    for (let k = item.children.length - 1; k >= 0; k--) work.push(item.children[k]);
  }
  const text = parts.join('');
  return work.length > 0 ? `${text.slice(0, OUTLINE_LIMIT)}…` : text;
}

const OUTLINE_LIMIT = 60;
