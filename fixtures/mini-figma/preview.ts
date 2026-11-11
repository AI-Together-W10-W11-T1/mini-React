import { createVDomRoot } from '@mini-react/react-dom';
import { readAreaChildren, renderAreaChildren } from '@mini-react/react-dom-bindings';
import type { PatchObserver } from '@mini-react/react-dom-bindings';
import { createOverlay } from '../phase1-vdom-playground/overlay';
import { toRealVNodes } from './previewVNode';

// [AI Note]: 실제 영역 연결 모듈 (Hook 없음). Phase 1 흐름 그대로 — 테스트 영역 DOM → VNode(readAreaChildren) → 정리 → 이전 VNode와 diff → 바뀐 곳만 실제 영역에 patch → 기록.
// 엔진(createVDomRoot)과 Phase 1 깜빡임(createOverlay)을 가져다 연결만 한다. 엔진 로직은 없다. App의 useEffect가 마운트 때 한 번 만든다 (렌더 중에는 DOM이 아직 없다).
// 예외(patch 도중)는 엔진이 실제 영역을 마지막 기록으로 복구한 뒤 그대로 위로 던진다 — 여기서 따로 잡지 않는다.
export interface PreviewOptions {
  /** 테스트 영역 상자 (`canvas`) — Patch 때마다 이 안 DOM을 읽는다 */
  testArea: Element;
  /** 실제 영역 상자 — 미니 React는 자식 없는 빈 요소로만 그리고, 안은 이 모듈(엔진)이 채운다 */
  realArea: HTMLElement;
  /** 깜빡임 층 — 실제 영역 밖 형제. 바뀐 노드 위치에 상자를 그린다 */
  overlayLayer: HTMLElement;
  /** 테스트가 patch 종류를 세는 관찰 자리 (앱은 안 넘김) */
  observe?: PatchObserver;
}

export interface Preview {
  /** 테스트 영역을 읽어 실제 영역에 반영. 기록이 쌓이면 true, 바뀐 게 없으면 false */
  patch(): boolean;
  /** 실제 영역 기록만 한 칸 뒤로. 처음이면 false */
  back(): boolean;
  /** 한 칸 앞으로. 끝이면 false */
  forward(): boolean;
}

export function createPreview({ testArea, realArea, overlayLayer, observe }: PreviewOptions): Preview {
  // 처음 모습: 테스트 영역 복사본으로 채운 뒤 createVDomRoot가 그것을 읽어 0번 기록으로 삼는다 (PP-03)
  renderAreaChildren(realArea, toRealVNodes(readAreaChildren(testArea)));
  // 깜빡임은 항상 켜 둔다 (이 앱에는 스위치가 없다)
  const overlay = createOverlay(overlayLayer, realArea, () => true);
  const root = createVDomRoot(realArea, {
    onPatch: (event) => {
      overlay.onPatch(event);
      observe?.(event);
    },
  });
  return {
    patch: () => overlay.run(() => root.update(toRealVNodes(readAreaChildren(testArea)))),
    back: () => overlay.run(() => root.back()) !== null,
    forward: () => overlay.run(() => root.forward()) !== null,
  };
}
