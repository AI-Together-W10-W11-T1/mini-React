import { h } from '@mini-react/react';
import type { Props, VNode } from '@mini-react/shared';

interface ToolbarProps {
  /** 실제 영역 기록에서 실행 취소 · 다시 실행 할 수 있나 — 없으면 [실행 취소] · [다시 실행]이 꺼진다 (루트가 렌더 중 nav에서 계산해 내려 줌) */
  canBack: boolean;
  canForward: boolean;
  /** [실행 취소] · [다시 실행] · [Patch]: 실제 영역 기록만 움직이는 State History 버튼 (PP-06 · PP-07 변경: [↶] [↷] 자리로 옮겨 옴). 동작은 루트가 내려 준 콜백 */
  onBack: () => void;
  onForward: () => void;
  onPatch: () => void;
}

// [AI Note]: 도구 막대 — props + 콜백 props만 받는 순수 함수 (Hook 없음, P2-09). `div.app`의 첫 자식이라 경로 접두가 [0,0]이고
// 레이어 · 캔버스 · 속성 패널의 접두는 하나씩 밀린다 ([0,1] · [0,2] · [0,3], FD-10). 안 자식 순서 = 앱 이름 · [실행 취소] · [다시 실행] · [Patch].
// [+ 인스턴스]는 속성 패널 오른쪽 아래로 옮겼다 — 메인을 골랐을 때 [삭제]와 같은 자리에 뜬다 (PropertyPanel).
// [AI Note]: 앱 편집 Undo/Redo 버튼([↶] [↷], FD-12)과 앱 Undo 기능은 task_006(PP-12)에서 없앴다. 되돌리기는 State History가 맡는다.
// [실행 취소] [다시 실행]는 실제 영역 기록용 State History 버튼이고, Ctrl/Cmd+Z · Ctrl/Cmd+Shift+Z 단축키(App의 keydown effect)가 같은 기록을 움직인다. 켜짐 여부는 루트가 nav에서 계산해 내려 준다(canBack · canForward, 새 Hook 아님).
// 꺼진 버튼은 `disabled` 속성만 바뀌므로 Patch로 기록이 처음 쌓이는 때 도구 막대 patch는 SET_ATTR 1줄뿐이다.
// 꺼진 `<button>`은 눌러도 click이 오지 않으므로(브라우저) 핸들러에 「꺼진 상태 검사」를 따로 두지 않는다 — 경계 이동은 엔진이 무시하고 nav는 같은 객체를 돌려준다.
// 앱 이름은 「Mini-Figma」 — 디자인 문서의 회사 이름 · 로고는 쓰지 않는다 (FD-07).
export function Toolbar(props: Props): VNode {
  const { canBack, canForward, onBack, onForward, onPatch } = props as unknown as ToolbarProps;
  return h(
    'header',
    { class: 'toolbar', 'data-testid': 'toolbar' },
    h('span', { class: 'app-name', 'data-testid': 'app-name' }, 'Mini-Figma'),
    // [AI Note]: `disabled`는 보통 속성이다 — true면 속성 값 "", false면 속성 없음 (diff는 SET_ATTR null ↔ "" 한 줄)
    h('button', { type: 'button', class: 'btn-secondary', 'data-testid': 'back-button', disabled: !canBack, onClick: () => onBack() }, '실행 취소'),
    h('button', { type: 'button', class: 'btn-secondary', 'data-testid': 'forward-button', disabled: !canForward, onClick: () => onForward() }, '다시 실행'),
    // [AI Note]: [Patch]는 파랑 알약(.btn-primary). 이 컴포넌트는 상태를 안 갖고 루트의 onPatch만 부른다 (Hook은 App에만)
    h('button', { type: 'button', class: 'btn-primary', 'data-testid': 'patch-button', onClick: () => onPatch() }, 'Patch'),
  );
}
