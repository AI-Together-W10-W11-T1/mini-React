import type { PatchObserver } from '@mini-react/react-dom-bindings';

// [AI Note]: Diff 시각화(확장)의 오버레이. 엔진이 알려 준 "바뀐 노드"의 위치를 재서, 실제 영역 **밖**에 겹쳐 둔
// 투명 판(pointer-events: none) 위에 상자를 깜빡이게 그린다. 실제 DOM에는 class · 속성을 붙이지 않는다
// (측정 오염 · 연속 Patch 때 엉킴 방지). 엔진 로직은 없고 위치 재기 · 그리기만 한다.

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Overlay {
  /** `createVDomRoot(…, { onPatch })`에 넘기는 콜백 */
  onPatch: PatchObserver;
  /**
   * 한 번의 동작(`update` · `back` · `forward`)을 감싼다. 동작 안에서 불린 patch를 모아 두었다가 끝나면
   * 이번 동작의 patch 개수를 `data-last-patch-count`에 남기고, 스위치가 켜져 있으면 상자를 그린다.
   * patch가 하나도 없는 동작(무변경 Patch · 경계 이동)은 지난 숫자를 그대로 둔다.
   */
  run<T>(action: () => T): T;
}

const FLASH_MS = 700;

export function createOverlay(layer: HTMLElement, realArea: HTMLElement, isEnabled: () => boolean): Overlay {
  let patchCount = 0;
  let measured: Rect[] = [];

  /** 바뀐 노드가 차지하는 영역. 글자 노드는 `Range`, 0 크기 · 주석은 부모 요소로 대신한다 */
  function measure(node: Node): DOMRect {
    if (node.nodeType === Node.TEXT_NODE) {
      const range = document.createRange();
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      if (rect.width > 0 || rect.height > 0) return rect;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const rect = (node as Element).getBoundingClientRect();
      if (rect.width > 0 || rect.height > 0) return rect;
    }
    // 주석 · 0 크기(공백 글자, 빈 요소, display:none)는 가장 가까운 크기 있는 조상 요소로
    let parent: Element | null = node.parentElement;
    while (parent !== null && parent !== realArea) {
      const rect = parent.getBoundingClientRect();
      if (rect.width > 0 || rect.height > 0) return rect;
      parent = parent.parentElement;
    }
    return realArea.getBoundingClientRect();
  }

  const onPatch: PatchObserver = ({ node }) => {
    patchCount += 1;
    if (!isEnabled()) return; // 꺼져 있으면 아무것도 재지 않는다 (개수만 센다)
    // [AI Note]: REMOVE는 엔진이 지우기 직전(before)에 알려 주므로 그 순간에 재서 저장해야 한다 — 지운 뒤에는 위치를 알 수 없다.
    // 오버레이 좌표계(layer 왼쪽 위 기준)로 바꿔 저장한다.
    const rect = measure(node);
    const origin = layer.getBoundingClientRect();
    measured.push({ left: rect.left - origin.left, top: rect.top - origin.top, width: rect.width, height: rect.height });
  };

  function flush(): void {
    if (patchCount === 0) {
      measured = [];
      return;
    }
    layer.dataset.lastPatchCount = String(patchCount);
    // 지난 동작의 상자가 아직 남아 있으면 치운다 (이번 동작의 상자만 센다)
    layer.replaceChildren();
    for (const rect of measured) layer.appendChild(flashBox(rect));
    layer.dataset.lastFlashCount = String(measured.length);
    patchCount = 0;
    measured = [];
  }

  function flashBox(rect: Rect): HTMLElement {
    const box = document.createElement('div');
    box.className = 'viz-box';
    box.style.left = `${rect.left}px`;
    box.style.top = `${rect.top}px`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
    // 애니메이션이 끝나면 지운다. 애니메이션이 안 도는 환경(모션 줄이기 등)을 위해 타이머도 둔다
    const remove = (): void => box.remove();
    box.addEventListener('animationend', remove, { once: true });
    setTimeout(remove, FLASH_MS + 300);
    return box;
  }

  return {
    onPatch,
    run(action) {
      patchCount = 0;
      measured = [];
      try {
        const result = action();
        flush();
        return result;
      } catch (error) {
        // 도중 예외(C2): 엔진이 실제 영역을 마지막 기록으로 다시 그린 뒤라 깜빡일 변경이 아니다. 모아 둔 것을 버린다
        patchCount = 0;
        measured = [];
        throw error;
      }
    },
  };
}
