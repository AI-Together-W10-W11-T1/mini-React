import { scanDangerous } from './sanitize';
import type { DangerousFinding } from './sanitize';

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
// 글을 살아 있는 문서에 넣지 않고 <template> 안에서 읽는다. 검사 순서(알림 줄 순서) = 위험한 코드 → SVG → (Dev-10) 태그 짝 → 구조.
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
  return problems;
}

/** 알림 글: 문제 한 줄 = `[말머리] 설명`, 마지막 줄 "다시 작성해 주세요." (Patch 오류만 있으면 자체 안내가 있어 붙이지 않음) */
export function formatProblems(problems: readonly HtmlProblem[]): string {
  const lines = problems.map((p) => `${PROBLEM_LABELS[p.kind]} ${p.message}`);
  if (problems.some((p) => p.kind !== 'PATCH_ERROR')) lines.push(RETRY_LINE);
  return lines.join('\n');
}

function describeDangerous(finding: DangerousFinding): string {
  switch (finding.kind) {
    case 'ELEMENT':
      // <link>는 rel="stylesheet"일 때만 막히므로 그 모습 그대로 적는다
      return finding.element === 'link' ? '<link rel="stylesheet"> 요소' : `<${finding.element}> 요소`;
    case 'EVENT_ATTRIBUTE':
      return `<${finding.element}> 요소의 ${finding.attribute} 속성`;
    case 'JAVASCRIPT_URL':
      return `<${finding.element}> 요소의 ${finding.attribute} 속성 (javascript: 주소)`;
  }
}
