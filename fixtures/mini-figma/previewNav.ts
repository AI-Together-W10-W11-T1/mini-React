import { HISTORY_LIMIT } from '@mini-react/shared';

// [AI Note]: 실제 영역의 「뒤로 · 앞으로 갈 수 있나」를 세는 순수 모델 (PP-06). 엔진 VDomRoot에는 가능 여부를 묻는 메서드가 없고
// 엔진은 고치지 않으므로, 앱이 엔진 History와 같은 규칙으로 따로 센다: 처음 모습 = 0번 · 뒤로 간 뒤 새 Patch면 앞쪽을 버림 · 경계 이동 무시 · 한도 HISTORY_LIMIT(50)이 넘으면 맨 앞을 뺌.
// index = 지금 기록이 맨 앞에서 몇 칸째(0부터), size = 들고 있는 기록 수.
export interface PreviewNav {
  readonly index: number;
  readonly size: number;
}

export const INITIAL_NAV: PreviewNav = { index: 0, size: 1 };

/** Patch로 새 기록이 하나 쌓임: 앞쪽(index 뒤)을 버리고 하나 붙이고, 한도를 넘으면 맨 앞을 뺀다 */
export function navPush(nav: PreviewNav): PreviewNav {
  const size = nav.index + 2;
  if (size > HISTORY_LIMIT) return { index: HISTORY_LIMIT - 1, size: HISTORY_LIMIT };
  return { index: nav.index + 1, size };
}

/** 경계(처음)에서는 같은 객체를 돌려줘 setter가 렌더를 안 일으키게 한다 */
export function navBack(nav: PreviewNav): PreviewNav {
  return nav.index === 0 ? nav : { index: nav.index - 1, size: nav.size };
}

/** 경계(끝)에서는 같은 객체 */
export function navForward(nav: PreviewNav): PreviewNav {
  return nav.index === nav.size - 1 ? nav : { index: nav.index + 1, size: nav.size };
}

export const canBack = (nav: PreviewNav): boolean => nav.index > 0;
export const canForward = (nav: PreviewNav): boolean => nav.index < nav.size - 1;
