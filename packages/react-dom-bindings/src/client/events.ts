import type { EventHandler } from '@mini-react/shared';

// [AI Note]: 이벤트 (알고리즘 결정 8 B — 리스너 하나 + 핸들러 교체). 요소마다 이벤트 이름당 리스너를 "처음 한 번만" 등록하고,
// 실제 핸들러는 요소 자신에 (WeakMap) 저장해 두었다가 리스너가 꺼내 부른다. 다시 렌더할 때는 저장된 핸들러만 바꾸므로
// add/removeEventListener가 매 렌더 생기지 않고(T-04), 핸들러를 여러 번 바꿔도 한 번 누르면 마지막 핸들러 하나만 불린다.
// props에서 `on…`이 빠지면(null) 핸들러만 비우고 리스너는 남긴다 — 눌러도 아무 일 없음.
// WeakMap이라 요소가 화면에서 빠져 버려지면 핸들러도 함께 사라진다 (엔진이 따로 치우지 않음).

/** 지원하는 이벤트 (task_002 정책): click · input */
const SUPPORTED_EVENTS: ReadonlySet<string> = new Set(['click', 'input']);

/** 요소 → (이벤트 이름 → 지금 핸들러). 항목이 있으면 그 이벤트의 리스너가 이미 등록된 것 (값이 null이어도) */
const handlerStore = new WeakMap<Element, Map<string, EventHandler | null>>();

export function setEventHandler(element: Element, event: string, handler: EventHandler | null): void {
  if (!SUPPORTED_EVENTS.has(event)) {
    // 지원 밖 이벤트: 비우는 호출(null)은 할 일이 없으므로 조용히, 붙이려는 호출만 경고하고 무시 (호출마다 경고 — 다시 렌더돼 같은 prop이 오면 또 경고. 상태를 두지 않아 단순하다)
    if (handler !== null) console.warn(`"${event}" 이벤트는 지원하지 않습니다 (click · input만). 핸들러를 무시합니다.`);
    return;
  }
  let handlers = handlerStore.get(element);
  if (handlers === undefined) {
    // 처음 붙이는데 비우려는 호출이면 리스너를 만들 이유가 없다
    if (handler === null) return;
    handlers = new Map();
    handlerStore.set(element, handlers);
  }
  const registered = handlers.has(event);
  // 리스너가 없는 이벤트에 null을 "기록"하면 안 된다 (항목 있음 = 리스너 있음). 이미 등록된 뒤의 null만 값으로 남긴다
  if (!registered && handler === null) return;
  handlers.set(event, handler);
  if (registered) return;
  // 이 요소 · 이벤트의 리스너는 평생 이것 하나. 부를 때마다 "지금 저장된" 핸들러를 꺼낸다 (예외는 삼키지 않고 그대로 위로)
  const store = handlers;
  element.addEventListener(event, (e) => {
    store.get(event)?.(e);
  });
}
