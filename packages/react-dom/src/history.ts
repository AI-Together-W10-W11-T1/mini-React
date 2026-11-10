import { HISTORY_LIMIT } from '@mini-react/shared';
import type { HistoryEntry, HistoryNode } from '@mini-react/shared';

// [AI Note]: State History = 양방향 연결 리스트 (알고리즘 결정 7 B + VNode). head(가장 오래된) · current(지금) · size(개수).
// 순수 데이터라 DOM을 모른다. 실제 DOM에 적용하는 일(역패치 · patch)은 createVDomRoot가 한다.
// 연결 리스트를 고른 이유: 한도 50을 넘으면 맨 앞(head)을 빼야 하는데, 배열이면 번호를 전부 당겨야 한다.
// 저장한 HistoryEntry는 절대 고치지 않는다 (P1-27). 노드의 prev · next만 바뀐다.
export class History {
  #head: HistoryNode;
  #current: HistoryNode;
  #size = 1;

  /** 초기 모습이 0번 기록 = 뒤로가기의 바닥 (§3.3) */
  constructor(initial: HistoryEntry) {
    this.#head = this.#current = { entry: initial, prev: null, next: null };
  }

  get head(): HistoryNode {
    return this.#head;
  }

  get current(): HistoryNode {
    return this.#current;
  }

  /** 지금 들고 있는 기록 수 (0번 포함) */
  get size(): number {
    return this.#size;
  }

  /**
   * current 뒤에 새 기록을 붙이고 current를 옮긴다.
   * - 뒤로 간 상태였다면 앞쪽(redo) 기록은 끊는다 (갈림길 정책). 끊은 만큼 size도 뺀다.
   * - 50개를 넘으면 head를 다음으로 옮긴다 (새 맨 앞이 새 바닥).
   */
  push(entry: HistoryEntry): void {
    // [AI Note]: 끊은 기록 수를 size에서 빼지 않으면 한도 근처에서 head를 너무 일찍 빼는 버그가 난다 (B17).
    let cut = this.#current.next;
    while (cut !== null) {
      const after = cut.next;
      cut.prev = null;
      cut.next = null;
      this.#size--;
      cut = after;
    }
    const node: HistoryNode = { entry, prev: this.#current, next: null };
    this.#current.next = node;
    this.#current = node;
    this.#size++;
    if (this.#size > HISTORY_LIMIT) this.#dropHead();
  }

  /** 한 칸 뒤로. 이동한 기록을 돌려주고, 처음(0번이 바닥)이면 아무 일 없이 `null` (경계 무시) */
  back(): HistoryEntry | null {
    const prev = this.#current.prev;
    if (prev === null) return null;
    this.#current = prev;
    return prev.entry;
  }

  /** 한 칸 앞으로. 이동한 기록을 돌려주고, 끝이면 아무 일 없이 `null` (경계 무시) */
  forward(): HistoryEntry | null {
    const next = this.#current.next;
    if (next === null) return null;
    this.#current = next;
    return next.entry;
  }

  #dropHead(): void {
    const old = this.#head;
    const second = old.next!;
    second.prev = null;
    old.next = null;
    this.#head = second;
    this.#size--;
  }
}
