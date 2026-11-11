export * from './types';

/**
 * `value` · `checked`를 속성이 아니라 DOM 프로퍼티(SET_PROP)로 다루는 요소 (task_002 정책 「§4.3 DOM 프로퍼티」, 검수 NB-4).
 * 이 밖의 요소(`div` · `li` · `option` …)의 `value` · `checked`는 Phase 1처럼 보통 속성이다.
 */
export const DOM_PROP_ELEMENTS: ReadonlySet<string> = new Set(['input', 'textarea', 'select']);
