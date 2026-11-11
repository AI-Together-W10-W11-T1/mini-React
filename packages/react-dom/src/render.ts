import { FunctionComponent } from '@mini-react/react-reconciler';
import type { FunctionComponentHost } from '@mini-react/react-reconciler';
import { patch, renderAreaChildren } from '@mini-react/react-dom-bindings';
import type { PatchObserver } from '@mini-react/react-dom-bindings';
import type { Component } from '@mini-react/shared';

// [AI Note]: render = Phase 2 진입점. 엔진(react-reconciler)은 DOM을 모르므로 "화면에 일을 시키는 통로"(host)를 여기서 꽂아 준다.
// 처음 그리기 = renderAreaChildren(영역 상자 안을 한 번 통째로), 고치기 = Phase 1 patch(바뀐 곳만). 이 파일에는 document · window가 없다 —
// DOM 접근은 전부 react-dom-bindings를 거친다. container는 영역 상자(보이지 않는 감싸개)라 상자 자신은 건드리지 않는다.
export interface RenderOptions {
  /**
   * patch 관찰 콜백 (확장 1 성능 대시보드). `update()`가 실제 영역에 patch를 하나 적용할 때마다 `{ patch, node, stage }`로 불린다
   * (REMOVE는 지우기 직전 `before`, 나머지는 적용 직후 `after`). 처음 그리기(`mount`) · 무변경 update(patch 0건) · update 도중 예외 뒤 복구 그리기는 알리지 않는다.
   * 읽기 전용 알림이라 실제 DOM에 아무것도 덧붙이지 않고, 없으면 동작이 이전과 똑같다.
   */
  onPatch?: PatchObserver;
}

/**
 * `component`(루트)를 `container` 안에 그리고 `mount()`한다. 돌려주는 인스턴스로 `unmount()` · `lastPatches`를 쓸 수 있다.
 * 이후 상태가 바뀌면(setter) 별도 호출 없이 자동으로 diff → patch가 돈다 (P2-15).
 */
export function render(component: Component, container: Element, options: RenderOptions = {}): FunctionComponent {
  const { onPatch } = options;
  const host: FunctionComponentHost = {
    mount: (children) => renderAreaChildren(container, children),
    // [AI Note]: onPatch는 Phase 1 patch의 관찰 콜백을 그대로 넘기기만 한다 (DOM 작업 집계 · Diff 시각화가 같은 통로를 쓴다).
    apply: (patches) => patch(container, patches, onPatch),
  };
  const instance = new FunctionComponent(component, {}, host);
  instance.mount();
  return instance;
}
