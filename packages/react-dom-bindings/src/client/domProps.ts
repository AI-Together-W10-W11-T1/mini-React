import type { DomPropName, DomPropValue } from '@mini-react/shared';

// [AI Note]: DOM 프로퍼티 (task_002 정책 「§4.3 DOM 프로퍼티」). `value` · `checked`는 속성(setAttribute)이 아니라 프로퍼티로 넣는다.
// 사용자가 입력창에 타이핑하면 바뀌는 건 프로퍼티라서, 속성만 고치면 화면 값이 안 바뀐다.
// 실제 값과 "다를 때만" 대입한다: 같은 값을 다시 대입하면 커서가 끝으로 튀어 타이핑이 끊긴다 (포커스 · 커서 유지, §4.3).
// null = props에서 빠짐 → value는 '', checked는 false로 둔다.
export function applyDomProp(element: Element, name: DomPropName, value: DomPropValue | null): void {
  const target = element as Element & { value: string; checked: boolean };
  if (name === 'value') {
    const next = value === null ? '' : String(value);
    if (target.value !== next) target.value = next;
  } else {
    const next = value === null ? false : value === true;
    if (target.checked !== next) target.checked = next;
  }
}
