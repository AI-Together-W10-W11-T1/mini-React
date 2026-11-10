import { createVDomRoot } from '@mini-react/react-dom';
import type { AreaChildren } from '@mini-react/shared';
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
  try {
    root.update(readAreaChildren(testArea));
  } catch (error) {
    reportPatchError(error);
  }
});

// [AI Note]: Patch · 뒤로 · 앞으로 도중 예외(C2). react-dom이 이미 기록을 그대로 두고 실제 영역을 마지막 기록 모습으로 다시 그린 뒤
// 원래 예외를 던져 준다. 페이지는 그 예외를 잡아 alert로만 알린다 — 편집창 글 · 테스트 영역은 그대로 둬서 다시 해 볼 수 있다.
function reportPatchError(error: unknown, doing = 'Patch를 적용하는 중'): void {
  const detail = error instanceof Error ? error.message : String(error);
  alert(
    formatProblems([
      {
        kind: 'PATCH_ERROR',
        message: `${doing} 오류가 났습니다 (${detail}). 실제 영역을 마지막 기록 상태로 되돌렸습니다. 다시 작성해 주세요.`,
      },
    ]),
  );
}

// [AI Note]: 뒤로 · 앞으로 (P1-28 ~ P1-30). 실제 영역은 root가 역패치 · patch로 바꾸고, 돌려받은 스냅샷(VNode)으로
// 테스트 영역을 다시 그리고 편집창 글을 vnodesToHtml(스냅샷)로 채운다 — 이동하면 미저장 편집은 버려진다(§3.3).
// null이면 처음 · 끝이라 아무 일도 없다: 편집창에 쳐 둔 글도 그대로 남는다(경계 이동 무시).
function move(go: () => AreaChildren | null, doing: string): void {
  try {
    const snapshot = go();
    if (snapshot === null) return;
    renderAreaChildren(testArea, snapshot);
    editor.value = vnodesToHtml(snapshot);
  } catch (error) {
    reportPatchError(error, doing);
  }
}

byTestId<HTMLButtonElement>('btn-back').addEventListener('click', () => move(() => root.back(), '뒤로 이동하는 중'));
byTestId<HTMLButtonElement>('btn-forward').addEventListener('click', () => move(() => root.forward(), '앞으로 이동하는 중'));

// [AI Note]: 검증 페이지 보호(C4). 두 영역 안의 링크를 누르거나 폼을 제출하면 페이지가 이동해 기록이 모두 날아간다.
// 엔진이 아니라 이 페이지의 일이라 여기서 기본 동작만 막는다. 캡처 단계에서 막아야 영역 안 어느 요소의 리스너보다 먼저 적용된다.
for (const area of [realArea, testArea]) {
  area.addEventListener(
    'click',
    (event) => {
      if (event.target instanceof Element && event.target.closest('a[href]') !== null) event.preventDefault();
    },
    true,
  );
  area.addEventListener('submit', (event) => event.preventDefault(), true);
}
