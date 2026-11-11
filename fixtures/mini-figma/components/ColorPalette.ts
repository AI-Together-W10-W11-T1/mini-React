import { h } from '@mini-react/react';
import type { Props, VNode } from '@mini-react/shared';
import { PALETTE, varRef } from '../color';
import type { Variable } from '../model';

interface ColorPaletteProps {
  /** 지금 보이는 색 `#rrggbb` (연결 중이면 푼 색) */
  value: string;
  /** 연결 중인 변수 id (연결 안 됨 · 없는 id면 null) */
  link: string | null;
  variables: readonly Variable[];
  /** 칩 · 색 입력칸 · 변수 상자: hex(연결 풀림) 또는 `var:<id>`(연결)로 알린다 */
  onPick: (color: string) => void;
}

// [AI Note]: 팔레트 판 — props만 받는 순수 함수 (Hook 없음, P2-09). 칩 8개(PALETTE 순서) + 직접 고르기 <input type="color"> + 현재 색 값 글자.
// 속성 패널이 `h(ColorPalette, …)`로 부르고, 자식 컴포넌트 안의 자식 컴포넌트도 엔진이 끝까지 풀어 준다 (공통 주의 5).
// - 칩의 `aria-pressed`는 문자열 'true' / 'false'다: 불린 false를 넘기면 속성이 통째로 빠져 「누르지 않음」이 안 그려진다 (공통 주의 3).
// - 색 입력칸의 `value`는 DOM 프로퍼티라 엔진이 실제 값과 다를 때만 대입한다 (입력칸은 다시 만들지 않음). 브라우저가 값을 `#rrggbb` 소문자로 정리한다 (공통 주의 4).
// - 입력칸은 `onInput`만 쓴다: 엔진 이벤트는 click · input뿐이고, Chromium은 고르는 동안 input을 연달아 낸다 → 입력 이벤트마다 같은 onPick을 불러 한 칸(`color`)의 값만 바꾼다 (MF-31).
// 칩과 입력칸 모두 같은 onPick을 부르므로 한 색 칸(`color`)으로 합쳐진다 (④-5).
// [AI Note]: 변수 상자(task_007 VR-05) = 같은 onPick으로 `var:<id>`(연결)를 올린다. 「없음」은 지금 푼 hex(value)를 올려 겉모습은 두고 연결만 푼다.
// 연결 중이면 칩은 전부 눌림 표시 없음 · 값 글자는 변수 이름 · 색 입력칸 value는 푼 hex. 칩 · 입력칸을 고르면 hex가 올라가 연결이 풀린다 (같은 색이어도 문자열이 달라 doc은 바뀐다).
export function ColorPalette(props: Props): VNode {
  const { value, link, variables, onPick } = props as unknown as ColorPaletteProps;
  const linked = link === null ? undefined : variables.find((v) => v.id === link);
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
          'aria-pressed': link === null && value === hex ? 'true' : 'false',
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
      h('span', { class: 'color-hex', 'data-testid': 'color-hex' }, linked === undefined ? value : linked.name),
    ),
    h(
      'select',
      {
        class: 'variable-select',
        'aria-label': '변수',
        'data-testid': 'prop-variable',
        value: link ?? '',
        onInput: (event: Event) => {
          const id = (event.target as HTMLSelectElement).value;
          onPick(id === '' ? value : varRef(id));
        },
      },
      h('option', { value: '' }, '없음'),
      variables.map((v) => h('option', { value: v.id }, v.name)),
    ),
  );
}
