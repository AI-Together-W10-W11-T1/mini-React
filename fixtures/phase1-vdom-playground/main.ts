import { createVDomRoot } from '@mini-react/react-dom';
import { renderAreaChildren, setAreaHtml, vnodesToHtml } from '@mini-react/react-dom-bindings';

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
