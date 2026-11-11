// [AI Note]: Undo 기록 순수 함수. DOM · Hook · 엔진 import 없음. 기록하는 것은 Doc(main · instances)뿐이다 —
// 선택(selectedId)과 nextId는 기록 밖이다 (고르기는 Undo 대상이 아님 MF-30, 번호는 Undo로 안 되돌아감 Q17-3).
// 모든 함수는 입력 상태 · Doc을 고치지 않고 새 객체를 돌려준다. 바뀐 것이 없으면 같은 객체를 그대로 돌려준다.

import type { Doc, Field } from './model';

/**
 * Undo 한도: "처음 상태(지금 모습)를 포함한 기록 개수". Phase 1 `HISTORY_LIMIT`(= 0번 초기 기록 포함 50)과 같은 뜻이다.
 * 이 앱은 `past`에 "지금 모습을 뺀 이전 모습"만 쌓으므로 `past`는 최대 `UNDO_LIMIT - 1` = 49칸 = Undo 49번.
 * [AI Note]: `@mini-react/shared`의 `HISTORY_LIMIT`은 일부러 import하지 않고 따로 둔다 (공통 주의 14 — 세는 방식이 달라 헷갈림 방지).
 */
export const UNDO_LIMIT = 50;
const MAX_PAST = UNDO_LIMIT - 1;

/** 한 단계로 묶는 기준: 같은 대상('main' 또는 인스턴스 id) + 같은 칸 */
export interface UndoGroup {
  /** 'main'(메인 컴포넌트) 또는 인스턴스 id(예: 'b2'). 타입은 string이지만 'main'이 특별한 값이라는 뜻을 남겨 둔 표기 */
  readonly target: 'main' | string;
  readonly field: Field;
}

export interface UndoState {
  /** 되돌아갈 Doc들 (오래된 것이 앞). 마지막 칸 = Undo 한 번에 돌아갈 곳 */
  readonly past: readonly Doc[];
  /** Undo로 밀려난 Doc들 (마지막 칸 = Redo 한 번에 돌아갈 곳) */
  readonly future: readonly Doc[];
  /** 지금 이어지고 있는 묶음. null이면 다음 수정은 무조건 새 단계 */
  readonly group: UndoGroup | null;
}

export interface UndoResult {
  readonly state: UndoState;
  readonly doc: Doc;
}

export const EMPTY_UNDO: UndoState = { past: [], future: [], group: null };

const sameGroup = (a: UndoGroup | null, b: UndoGroup | null): boolean =>
  a !== null && b !== null && a.target === b.target && a.field === b.field;

/** past 뒤에 한 칸 붙이고, 한도를 넘으면 가장 오래된 것부터 뺀다 */
const pushPast = (past: readonly Doc[], doc: Doc): readonly Doc[] => {
  const next = [...past, doc];
  return next.length > MAX_PAST ? next.slice(next.length - MAX_PAST) : next;
};

/**
 * 수정 하나를 기록한다. current = 수정 전 Doc, next = 수정 후 Doc.
 * - next === current(바뀐 것 없음)면 같은 상태 (기록 · 묶음 그대로).
 * - group이 지금 묶음과 같으면(같은 대상 + 같은 칸 연달아) past를 늘리지 않는다 → 되돌릴 곳은 묶음 시작 직전 그대로. 시간 기준 없음.
 * - 그 밖(다른 칸 · 다른 대상 · group = null)이면 current를 past에 쌓는 새 단계. group이 null이면 묶음도 끝난다.
 * - 새 수정이면 future(Redo)는 버린다.
 * [AI Note]: 묶음에 합쳐진 수정이 past를 안 늘리므로 "글자 한 글자 = 한 단계"가 되지 않는다 (MF-31).
 */
export function recordEdit(state: UndoState, current: Doc, next: Doc, group: UndoGroup | null): UndoState {
  if (next === current) return state;
  if (sameGroup(state.group, group)) {
    return { past: state.past, future: [], group };
  }
  return { past: pushPast(state.past, current), future: [], group };
}

/** 한 단계 되돌린다. past가 비면 무시(같은 상태 · 같은 Doc). 현재 Doc은 future로, 묶음은 끝난다 */
export function undo(state: UndoState, current: Doc): UndoResult {
  if (state.past.length === 0) return { state, doc: current };
  const doc = state.past[state.past.length - 1];
  return {
    state: { past: state.past.slice(0, -1), future: [...state.future, current], group: null },
    doc,
  };
}

/** 한 단계 다시 한다. future가 비면 무시. 현재 Doc은 past로, 묶음은 끝난다 */
export function redo(state: UndoState, current: Doc): UndoResult {
  if (state.future.length === 0) return { state, doc: current };
  const doc = state.future[state.future.length - 1];
  return {
    state: { past: pushPast(state.past, current), future: state.future.slice(0, -1), group: null },
    doc,
  };
}
