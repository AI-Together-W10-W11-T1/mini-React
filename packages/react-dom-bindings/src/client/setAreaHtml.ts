import { removeDangerous } from './sanitize';

// [AI Note]: 편집창 글 → 미리보기(테스트 영역). 칠 때마다 불린다.
// 살아 있는 요소에 innerHTML로 바로 넣지 않는다: `<img src=x onerror=…>`는 파싱 · 삽입 순간 실행될 수 있다.
// 비활성 문서인 <template> 안에서 읽고 위험한 것(`on…` · script · iframe · object · embed · style · stylesheet link ·
// `javascript:`)을 뺀 뒤에야 영역으로 옮긴다. 영역 상자 자신은 건드리지 않고 안의 자식만 바꾼다 (§5).
export function setAreaHtml(area: Element, html: string): void {
  const template = document.createElement('template');
  template.innerHTML = html;
  removeDangerous(template.content);
  area.replaceChildren(template.content);
}
