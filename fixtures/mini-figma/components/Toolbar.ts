import { h } from '@mini-react/react';
import type { Props, VNode } from '@mini-react/shared';

interface ToolbarProps {
  /** [+ 인스턴스]: 끝에 새 인스턴스를 붙인다 (동작은 MF-22 그대로, 레이어 창에 있던 버튼이 이쪽으로 옮겨 옴 — FD-11) */
  onAdd: () => void;
  /** 되돌릴 기록이 있는가 — 없으면 [↶] 버튼이 꺼진다 (FD-12) */
  canUndo: boolean;
  /** 다시 할 기록이 있는가 — 없으면 [↷] 버튼이 꺼진다 */
  canRedo: boolean;
  /** [↶ 되돌리기] · [↷ 다시 하기]: 키(Ctrl+Z · Ctrl+Shift+Z)와 같은 동작 — 루트가 같은 함수를 내려 준다 */
  onUndo: () => void;
  onRedo: () => void;
  /** [Patch]: 테스트 영역을 실제 영역에 반영 (PP-07 변경: 실제 영역 머리글에서 도구 막대 [↷] 바로 오른쪽으로 옮겨 옴). 동작은 루트가 내려 준 콜백 */
  onPatch: () => void;
}

// [AI Note]: 도구 막대 — props + 콜백 props만 받는 순수 함수 (Hook 없음, P2-09). `div.app`의 첫 자식이라 경로 접두가 [0,0]이고
// 레이어 · 캔버스 · 속성 패널의 접두는 하나씩 밀린다 ([0,1] · [0,2] · [0,3], FD-10). 안 자식 순서 = 앱 이름 · [+ 인스턴스] · [↶ 되돌리기] · [↷ 다시 하기] · [Patch].
// [AI Note]: [↶] [↷]의 켜짐 여부는 루트가 렌더 중 history에서 계산해 내려 준다(canUndo · canRedo, 새 Hook 아님).
// 꺼진 버튼은 `disabled` 속성만 바뀌므로 기록이 처음 쌓이는 첫 수정에서 도구 막대 patch는 SET_ATTR 1줄뿐이고, 라벨 입력칸 같은 다른 노드는 다시 만들어지지 않는다.
// 꺼진 `<button>`은 눌러도 click이 오지 않으므로(브라우저) 핸들러에 「꺼진 상태 검사」를 따로 두지 않는다 — 이미 undo()가 빈 기록이면 같은 state를 돌려준다.
// 앱 이름은 「mini-figma」 — 디자인 문서의 회사 이름 · 로고는 쓰지 않는다 (FD-07).
export function Toolbar(props: Props): VNode {
  const { onAdd, canUndo, canRedo, onUndo, onRedo, onPatch } = props as unknown as ToolbarProps;
  return h(
    'header',
    { class: 'toolbar', 'data-testid': 'toolbar' },
    h('span', { class: 'app-name', 'data-testid': 'app-name' }, 'mini-figma'),
    h('button', { type: 'button', class: 'btn-primary', 'data-testid': 'add-instance', onClick: () => onAdd() }, '+ 인스턴스'),
    // [AI Note]: `disabled`는 보통 속성이다 — true면 속성 값 "", false면 속성 없음 (diff는 SET_ATTR null ↔ "" 한 줄)
    h('button', { type: 'button', class: 'btn-secondary', 'data-testid': 'undo-button', 'aria-label': '되돌리기', disabled: !canUndo, onClick: () => onUndo() }, '↶ 되돌리기'),
    h('button', { type: 'button', class: 'btn-secondary', 'data-testid': 'redo-button', 'aria-label': '다시 하기', disabled: !canRedo, onClick: () => onRedo() }, '↷ 다시 하기'),
    // [AI Note]: [Patch]는 파랑 알약(.btn-primary) — 화면의 파랑은 [+ 인스턴스] · [Patch] 두 곳. 눌러도 이 컴포넌트는 상태를 안 갖고 루트의 onPatch만 부른다 (Hook은 App에만)
    h('button', { type: 'button', class: 'btn-primary', 'data-testid': 'patch-button', onClick: () => onPatch() }, 'Patch'),
  );
}
