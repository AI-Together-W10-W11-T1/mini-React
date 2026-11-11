import { h } from '@mini-react/react';
import type { Props, VNode } from '@mini-react/shared';

// [AI Note]: 아이콘 컴포넌트 둘 (Instance swap의 "갈아 끼우는 부품"). 둘은 태그 · 속성이 완전히 같고 글자(★ / ♥)만 다르다.
// 엔진은 컴포넌트를 diff 전에 풀어 요소로 만들기 때문에, ★ → ♥ 교체가 diff에서는 같은 <span>의 글자 바뀜(SET_TEXT)으로 보인다.
// 속성이 하나라도 다르면 SET_ATTR이 섞이므로 일부러 같게 둔다 (dev_todo 공통 주의 10).
function iconSpan(glyph: string): VNode {
  return h('span', { class: 'btn-icon', 'data-testid': 'btn-icon', 'aria-hidden': 'true' }, glyph);
}

export function StarIcon(_props: Props): VNode {
  return iconSpan('★');
}

export function HeartIcon(_props: Props): VNode {
  return iconSpan('♥');
}
