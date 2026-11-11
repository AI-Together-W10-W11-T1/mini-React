import { h } from '@mini-react/react';
import type { Props, VNode } from '@mini-react/shared';
import { PALETTE } from '../color';

interface ColorPaletteProps {
  /** 지금 색 `#rrggbb` */
  value: string;
  /** 칩을 누르거나 색 입력칸 값이 바뀌면 그 색으로 알린다 */
  onPick: (hex: string) => void;
}

// [AI Note]: 팔레트 판 — props만 받는 순수 함수 (Hook 없음, P2-09). 칩 8개(PALETTE 순서) + 직접 고르기 <input type="color"> + 현재 색 값 글자.
// 속성 패널이 `h(ColorPalette, …)`로 부르고, 자식 컴포넌트 안의 자식 컴포넌트도 엔진이 끝까지 풀어 준다 (공통 주의 5).
// - 칩의 `aria-pressed`는 문자열 'true' / 'false'다: 불린 false를 넘기면 속성이 통째로 빠져 「누르지 않음」이 안 그려진다 (공통 주의 3).
// - 색 입력칸의 `value`는 DOM 프로퍼티라 엔진이 실제 값과 다를 때만 대입한다 (입력칸은 다시 만들지 않음). 브라우저가 값을 `#rrggbb` 소문자로 정리한다 (공통 주의 4).
// - 입력칸은 `onInput`만 쓴다: 엔진 이벤트는 click · input뿐이고, Chromium은 고르는 동안 input을 연달아 낸다 → 입력 이벤트마다 같은 onPick을 불러 한 칸(`color`)의 값만 바꾼다 (MF-31).
// 칩과 입력칸 모두 같은 onPick을 부르므로 한 색 칸(`color`)으로 합쳐진다 (④-5).
export function ColorPalette(props: Props): VNode {
  const { value, onPick } = props as unknown as ColorPaletteProps;
  return h(
    'div',
    { class: 'palette', 'data-testid': 'color-palette' },
    h(
      'div',
      { class: 'chips' },
      PALETTE.map((hex) =>
        h('button', {
          type: 'button',
          class: 'chip',
          'data-testid': 'color-chip',
          'data-color': hex,
          'aria-pressed': value === hex ? 'true' : 'false',
          'aria-label': `색 ${hex}`,
          style: { 'background-color': hex },
          onClick: () => onPick(hex),
        }),
      ),
    ),
    h(
      'div',
      { class: 'palette-custom' },
      h('input', {
        type: 'color',
        class: 'color-input',
        'aria-label': '색 직접 고르기',
        'data-testid': 'prop-color',
        value,
        onInput: (event: Event) => onPick((event.target as HTMLInputElement).value),
      }),
      h('span', { class: 'color-hex', 'data-testid': 'color-hex' }, value),
    ),
  );
}
