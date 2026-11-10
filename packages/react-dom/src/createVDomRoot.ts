import { diff, invertPatches } from '@mini-react/react-reconciler';
import { patch, readAreaChildren, renderAreaChildren } from '@mini-react/react-dom-bindings';
import type { AreaChildren, Patch } from '@mini-react/shared';
import { History } from './history';

export interface VDomRoot {
  /** 지금(current) 기록의 VNode. 테스트 영역 · 편집창 · 다음 Patch의 기준 */
  snapshot(): AreaChildren;
  /**
   * Patch 흐름: 지금 기록의 VNode와 next를 diff → 실제 영역에 patch → 새 기록으로 저장.
   * 바뀐 게 없으면 아무것도 하지 않고 `false` (무변경 Patch는 기록하지 않는다, §3.3).
   * patch 도중 예외가 나면 기록은 그대로 두고 실제 영역을 지금 기록으로 복구한 뒤 원래 예외를 다시 던진다 (C2).
   */
  update(next: AreaChildren): boolean;
  /**
   * 한 칸 뒤로: 실제 영역에 저장해 둔 역패치(이미 역순)를 적용하고 이동한 기록의 snapshot을 돌려준다.
   * 처음(0번)이면 아무 일 없이 `null` (경계 무시). 호출한 쪽이 돌려받은 snapshot으로 테스트 영역 · 편집창을 채운다.
   * 이동 도중 예외가 나면 C2와 같은 복구 후 원래 예외를 다시 던지고 current는 움직이지 않는다.
   */
  back(): AreaChildren | null;
  /** 한 칸 앞으로: 저장해 둔 patches를 순서대로 적용. 끝이면 `null`. 나머지는 `back`과 같다 */
  forward(): AreaChildren | null;
}

// [AI Note]: react-dom은 DOM을 직접 만지지 않는다. DOM 접근은 전부 react-dom-bindings(readAreaChildren · patch · renderAreaChildren)를 거친다.
// 만들 때 실제 영역을 딱 한 번 읽어 0번 기록으로 삼고(P1-20), 그 뒤 diff 기준은 항상 History에 저장한 VNode다.
// 실제 영역 DOM을 다시 읽어 비교하면 P1-33("두 VNode를 비교")을 어기고, 바깥에서 고친 DOM에 기준이 흔들린다.
export function createVDomRoot(realArea: Element): VDomRoot {
  const history = new History({ snapshot: readAreaChildren(realArea), patches: [], inverse: [] });

  // [AI Note]: C2 복구 경로 한 개. 영역을 통째로 다시 그리는 것은 정상 갱신에서는 금지(P1-24 · P1-34)이고,
  // patch 도중 예외로 DOM이 반쯤 적용된 상태가 되었을 때 "지금 기록 모습"으로 되돌리는 이 한 곳에서만 쓴다.
  // 복구 뒤 원래 예외를 그대로 다시 던져 페이지(fixture)가 알릴 수 있게 한다.
  // update · back · forward가 모두 이 함수를 지나므로, 기록(current)은 patch가 성공한 뒤에만 움직이고 실패하면 건드리지 않는다.
  function applyOrRecover(patches: readonly Patch[]): void {
    try {
      patch(realArea, patches);
    } catch (error) {
      renderAreaChildren(realArea, history.current.entry.snapshot);
      throw error;
    }
  }

  return {
    snapshot: () => history.current.entry.snapshot,

    update(next) {
      const patches = diff(history.current.entry.snapshot, next);
      if (patches.length === 0) return false;
      applyOrRecover(patches);
      history.push({ snapshot: next, patches, inverse: invertPatches(patches) });
      return true;
    },

    back() {
      const here = history.current;
      if (here.prev === null) return null;
      // inverse는 이미 역순으로 뒤집어 둔 목록이라 그대로 순서대로 적용한다 (결정 7 · 되돌리는 순서 = 역순)
      applyOrRecover(here.entry.inverse);
      return history.back()!.snapshot;
    },

    forward() {
      const target = history.current.next;
      if (target === null) return null;
      applyOrRecover(target.entry.patches);
      return history.forward()!.snapshot;
    },
  };
}
