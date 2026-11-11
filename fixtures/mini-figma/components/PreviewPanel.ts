import { h } from '@mini-react/react';
import type { Props, VNode } from '@mini-react/shared';

interface PreviewPanelProps {
  /** 뒤로 · 앞으로 갈 수 있나 — 없으면 버튼이 꺼진다 (루트가 렌더 중 계산해 내려 줌) */
  canBack: boolean;
  canForward: boolean;
  onPatch: () => void;
  onBack: () => void;
  onForward: () => void;
}

// [AI Note]: 실제 영역 구역 — props만 받는 순수 함수 (Hook 없음, PP-09). 머리글(제목 + [Patch] [뒤로] [앞으로]) + 영역 상자 + 깜빡임 층.
// 영역 상자(real-area)와 깜빡임 층(real-overlay)은 **자식 없는 빈 요소**로만 그린다: 안은 엔진(createVDomRoot · createOverlay)이 DOM에 직접 채우므로
// 미니 React diff는 이전 · 다음 VNode가 모두 자식 0이라 몇 번 다시 그려도 안을 건드리지 않는다 (Phase 2 기록판 「빈 칸에 effect가 직접 쓰기」와 같은 방식).
// `inert` = 실제 영역은 보기 전용 (이벤트 핸들러가 DOM에서 안 읽혀 복사본에는 핸들러가 없다 — 눌러도 키를 받아도 반응 없음, PP-10).
// 뒤로 · 앞으로의 `disabled`는 Toolbar의 [↶] [↷]와 같은 방식(보통 속성, 꺼진 버튼은 click이 안 옴).
export function PreviewPanel(props: Props): VNode {
  const { canBack, canForward, onPatch, onBack, onForward } = props as unknown as PreviewPanelProps;
  return h(
    'section',
    { class: 'real-section', 'data-testid': 'real-section' },
    h(
      'header',
      { class: 'real-header' },
      h('h2', { class: 'panel-title', 'data-testid': 'real-title' }, '실제 영역'),
      h(
        'div',
        { class: 'real-actions' },
        h('button', { type: 'button', class: 'btn-primary', 'data-testid': 'patch-button', onClick: () => onPatch() }, 'Patch'),
        h('button', { type: 'button', class: 'btn-secondary', 'data-testid': 'back-button', disabled: !canBack, onClick: () => onBack() }, '뒤로'),
        h('button', { type: 'button', class: 'btn-secondary', 'data-testid': 'forward-button', disabled: !canForward, onClick: () => onForward() }, '앞으로'),
      ),
    ),
    h(
      'div',
      { class: 'real-frame' },
      h('div', { class: 'real-area', 'data-testid': 'real-area', inert: true }),
      h('div', { class: 'real-overlay', 'data-testid': 'real-overlay' }),
    ),
  );
}
