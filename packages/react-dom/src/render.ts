import { FunctionComponent } from '@mini-react/react-reconciler';
import type { FunctionComponentHost } from '@mini-react/react-reconciler';
import { patch, renderAreaChildren } from '@mini-react/react-dom-bindings';
import type { Component } from '@mini-react/shared';

// [AI Note]: render = Phase 2 진입점. 엔진(react-reconciler)은 DOM을 모르므로 "화면에 일을 시키는 통로"(host)를 여기서 꽂아 준다.
// 처음 그리기 = renderAreaChildren(영역 상자 안을 한 번 통째로), 고치기 = Phase 1 patch(바뀐 곳만). 이 파일에는 document · window가 없다 —
// DOM 접근은 전부 react-dom-bindings를 거친다. container는 영역 상자(보이지 않는 감싸개)라 상자 자신은 건드리지 않는다.
/**
 * `component`(루트)를 `container` 안에 그리고 `mount()`한다. 돌려주는 인스턴스로 `unmount()` · `lastPatches`를 쓸 수 있다.
 * 이후 상태가 바뀌면(setter) 별도 호출 없이 자동으로 diff → patch가 돈다 (P2-15).
 */
export function render(component: Component, container: Element): FunctionComponent {
  const host: FunctionComponentHost = {
    mount: (children) => renderAreaChildren(container, children),
    apply: (patches) => patch(container, patches),
  };
  const instance = new FunctionComponent(component, {}, host);
  instance.mount();
  return instance;
}
