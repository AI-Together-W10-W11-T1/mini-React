import { createVDomRoot } from '@mini-react/react-dom';
import { checkHtml, formatProblems, readAreaChildren, renderAreaChildren, setAreaHtml, vnodesToHtml } from '@mini-react/react-dom-bindings';

// [AI Note]: 엔진 로직 없음. 패키지 공개 API만 이어 붙이는 연결 코드다.
// 로드 때 실제 영역의 샘플 HTML을 읽어 0번 기록으로 삼고(createVDomRoot, P1-20),
// 그 VNode로 테스트 영역(미리보기)을 그리고(P1-21) 편집창 글을 채운다.
function byTestId<T extends HTMLElement>(id: string): T {
  const el = document.querySelector<T>(`[data-testid="${id}"]`);
  if (el === null) throw new Error(`data-testid="${id}" 요소가 없습니다`);
  return el;
}

const realArea = byTestId<HTMLElement>('real-area');
const testArea = byTestId<HTMLElement>('test-area');
const editor = byTestId<HTMLTextAreaElement>('html-editor');

const root = createVDomRoot(realArea);
const initial = root.snapshot();
renderAreaChildren(testArea, initial);
editor.value = vnodesToHtml(initial);

// [AI Note]: 입력 때마다 즉시 미리보기를 다시 그린다. 타이머 · debounce를 쓰지 않는다 —
// 쓰면 칠 때마다 늦게 따라와 Patch가 옛 글을 읽을 수 있다(B6).
// setAreaHtml이 on… · script · javascript: 등 위험한 것을 빼고 그린다 (미리보기가 코드를 실행하지 않게).
editor.addEventListener('input', () => setAreaHtml(testArea, editor.value));

// [AI Note]: Patch 흐름 (P1-23 · P1-24). 편집창 글로 미리보기를 한 번 더 그린 뒤 테스트 영역 DOM을 읽는다.
// 입력 처리가 늦어도 옛 글로 Patch되지 않게 하려는 것이다(B6). 읽은 VNode를 root.update에 넘기면
// 이전 기록 VNode와 diff → 실제 영역 patch → 기록까지 react-dom이 한다. 바뀐 게 없으면 update가 false를 돌려주고 아무 일도 없다.
// Patch 성공 뒤에도 편집창 글은 친 그대로 둔다(B7) — 스냅샷 글로 다시 채우는 것은 뒤로 · 앞으로 때뿐이다.
byTestId<HTMLButtonElement>('btn-patch').addEventListener('click', () => {
  // [AI Note]: Patch 맨 앞에서 편집창 글을 검사한다 (위험 코드 · 태그 짝 · 구조 · SVG). 문제가 하나라도 있으면
  // 한 번의 alert로 모두 알리고 끝낸다 — 실제 영역 · 기록은 그대로, 편집창 글도 그대로 둬서 고쳐 쓸 수 있게 한다.
  const problems = checkHtml(editor.value);
  if (problems.length > 0) {
    alert(formatProblems(problems));
    return;
  }
  setAreaHtml(testArea, editor.value);
  root.update(readAreaChildren(testArea));
});
