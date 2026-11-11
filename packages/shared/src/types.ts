// 코어 타입 (마스터만 수정, 변경은 types_changelog.md에 기록)
// 기준: PRD v2.1 §3.1 · §3.3 · §4.2 · §4.3 · §5, task_001 · task_002 명세 「알고리즘 결정」

/** 텍스트 VNode의 type 값 (알고리즘 결정 1 B: TEXT 객체) */
export const TEXT_NODE = '#text';

/** 주석 VNode의 type 값 (알고리즘 결정 5: 공백 · 주석 모두 유지) */
export const COMMENT_NODE = '#comment';

/** State History 보관 한도 (§3.3). 넘으면 가장 오래된 기록부터 뺀다 */
export const HISTORY_LIMIT = 50;

/** 무한 렌더 안전장치 (task_003 결정 9 B): effect → setter → 렌더가 연달아 이 횟수를 넘으면 오류 (task_002 즉시 동기 때는 "중첩 50번") */
export const NESTED_RENDER_LIMIT = 50;

/** 목록 비교용 key. h()가 props에서 꺼내 VNode에 둔다 (Key 확장: 데이터의 고유 id. Phase 1 검증 페이지는 쓰지 않음) */
export type Key = string | number;

/**
 * 요소 · 컴포넌트의 props.
 * 값은 unknown — 문자열 · 숫자 · boolean 외의 값(함수 · 객체)을 어떻게 다룰지는
 * 소비하는 쪽(renderVNode 등)이 정한다.
 * - 값 없는 속성(boolean 속성, 예: disabled)은 값 `""`로 담는다. 없어지면 props에서 빠진다.
 * - `style`은 항목별로 비교하므로 domToVNode는 {@link StyleMap}으로 담는다.
 */
export type Props = { readonly [name: string]: unknown };

/** style 항목 묶음: `style="color:red; font-size:12px"` → `{ color: 'red', 'font-size': '12px' }` (속성 이름은 CSS 표기 그대로) */
export type StyleMap = { readonly [property: string]: string };

/** 텍스트 VNode: `{ type: '#text', props: { nodeValue }, children: [] }`. 공백만 있는 글자도 그대로 담는다 */
export interface TextVNode {
  readonly type: typeof TEXT_NODE;
  readonly props: { readonly nodeValue: string };
  readonly children: readonly [];
}

/** 주석 VNode: `{ type: '#comment', props: { nodeValue }, children: [] }`. 실제 DOM childNodes의 번호를 맞추기 위해 남긴다 */
export interface CommentVNode {
  readonly type: typeof COMMENT_NODE;
  readonly props: { readonly nodeValue: string };
  readonly children: readonly [];
}

/** 요소 VNode: type은 태그 이름 ('div', 'section' …) */
export interface ElementVNode {
  readonly type: string;
  readonly props: Props;
  readonly children: readonly VNode[];
  readonly key?: Key;
}

/** 함수형 컴포넌트: props만 받아 VNode를 반환하는 함수 (Phase 2) */
export type Component = (props: Props) => VNode;

/**
 * 이벤트 핸들러 (알고리즘 결정 8 B). props 이름이 `on` + 대문자이고 값이 함수면 이벤트다
 * (`onClick` → `click`, `onInput` → `input`). 실제 리스너는 요소마다 이벤트 이름당 하나이고,
 * 핸들러는 요소 자신에 저장해 두고 바꿔 끼운다.
 */
export type EventHandler = (event: Event) => void;

/** 지원하는 DOM 프로퍼티 (task_002 정책): 속성(setAttribute)이 아니라 프로퍼티로 넣는다 */
export type DomPropName = 'value' | 'checked';

/** DOM 프로퍼티 값: `value`는 문자열, `checked`는 boolean */
export type DomPropValue = string | boolean;

/** 컴포넌트 VNode: type이 함수. 자식은 요소와 같은 방식으로 정규화해 children에 둔다 (Phase 2) */
export interface ComponentVNode {
  readonly type: Component;
  readonly props: Props;
  readonly children: readonly VNode[];
  readonly key?: Key;
}

export type VNode = TextVNode | CommentVNode | ElementVNode | ComponentVNode;

/** h()가 받는 자식 입력. 문자열 · 숫자는 TextVNode로, null · undefined · boolean은 무시, 배열은 평탄화 */
export type VNodeChild = VNode | string | number | boolean | null | undefined | readonly VNodeChild[];

/**
 * 영역 상자 안의 자식 목록 (§5 단일 · 복수 루트).
 * 영역 상자(실제 영역 · 테스트 영역)는 보이지 않는 감싸개라 상자 자체 속성은 비교하지 않는다.
 * 최상위가 여러 개 · 하나 · 0개(빈 화면)여도 같은 모양이다.
 */
export type AreaChildren = readonly VNode[];

/**
 * 경로 (알고리즘 결정 4 A): 영역 상자 안 자식부터 "몇 번째 자식"을 이어 적은 번호 배열.
 * 예: `[0, 2]` = 영역의 0번 자식 → 그 안의 2번 자식. 공백 · 주석도 번호를 차지한다 (VNode 번호 = DOM childNodes 번호).
 * 기준은 **그 patch를 실행하는 순간의 트리**다 (목록은 순서대로 하나씩 적용).
 */
export type Path = readonly number[];

/**
 * 고칠 일 한 줄 (알고리즘 결정 3 A). 모든 patch는 전(before) · 후(after)를 함께 들고 있어
 * 역패치 = 전후를 뒤집은 patch를 역순으로 적용한 것이다.
 */
export type Patch =
  /** 글자 바꾸기: TEXT · 주석 노드의 nodeValue (D-01) */
  | { readonly kind: 'SET_TEXT'; readonly path: Path; readonly before: string; readonly after: string }
  /** 속성 추가 · 수정 · 삭제 (D-02). `null` = 속성이 없음 (before null = 추가, after null = 삭제). boolean 속성은 값 `""` */
  | { readonly kind: 'SET_ATTR'; readonly path: Path; readonly name: string; readonly before: string | null; readonly after: string | null }
  /** style 항목 추가 · 수정 · 삭제. `null` = 그 항목이 없음 */
  | { readonly kind: 'SET_STYLE'; readonly path: Path; readonly property: string; readonly before: string | null; readonly after: string | null }
  /** 노드 추가 (D-03): path의 마지막 번호 자리에 node를 끼워 넣는다 */
  | { readonly kind: 'INSERT'; readonly path: Path; readonly node: VNode }
  /** 노드 삭제 (D-04): path의 노드를 뺀다. node = 지운 노드의 원본 VNode 통째 (역패치 재료) */
  | { readonly kind: 'REMOVE'; readonly path: Path; readonly node: VNode }
  /** 노드 교체 (D-05): path의 노드를 after로 바꾼다. before = 원본 VNode 통째 */
  | { readonly kind: 'REPLACE'; readonly path: Path; readonly before: VNode; readonly after: VNode }
  /** 노드 이동 (Key 확장): parent의 자식 중 from번을 빼서, 뺀 뒤의 목록에서 to번 자리에 넣는다. 역패치 = from · to 뒤집기 */
  | { readonly kind: 'MOVE'; readonly parent: Path; readonly from: number; readonly to: number }
  /**
   * 이벤트 핸들러 교체 (Phase 2, 알고리즘 결정 8 B). event = DOM 이벤트 이름(`click`). `null` = 핸들러 없음
   * (before null = 처음 붙음 → 리스너 등록, after null = 빠짐 → 핸들러만 비우고 리스너는 남김)
   */
  | { readonly kind: 'SET_EVENT'; readonly path: Path; readonly event: string; readonly before: EventHandler | null; readonly after: EventHandler | null }
  /** DOM 프로퍼티 (Phase 2): `input.value` · `input.checked`. 적용할 때 실제 값과 같으면 넣지 않는다(커서 유지). `null` = props에 없음 */
  | { readonly kind: 'SET_PROP'; readonly path: Path; readonly name: DomPropName; readonly before: DomPropValue | null; readonly after: DomPropValue | null };

/**
 * State History 기록 하나 (알고리즘 결정 7: B + VNode도 저장).
 * - snapshot: 이 기록 시점의 영역 자식 목록. 테스트 영역 · 편집창 · 다음 Patch의 기준으로 쓴다. 저장 뒤 고치지 않는다 (P1-27)
 * - patches: 바로 앞 기록 → 이 기록으로 가는 고칠 일 목록 (적용 순서대로). 0번(초기) 기록은 빈 목록
 * - inverse: 이 기록 → 바로 앞 기록으로 되돌리는 목록. **이미 역순으로 뒤집어 둔 상태**라 그대로 순서대로 적용한다
 */
export interface HistoryEntry {
  readonly snapshot: AreaChildren;
  readonly patches: readonly Patch[];
  readonly inverse: readonly Patch[];
}

/**
 * State History 노드 (양방향 연결 리스트). prev · next는 갈림길 끊기 · 한도 제거 때 History가 바꾼다.
 * 뒤로 = prev, 앞으로 = next, 없으면 무시 (§3.3 경계).
 */
export interface HistoryNode {
  readonly entry: HistoryEntry;
  prev: HistoryNode | null;
  next: HistoryNode | null;
}

/* ───────────── Phase 2: Hook 슬롯 (task_002 정책, PRD §4.2) ───────────── */

/** 의존성 배열. `null` = 생략(매 렌더). 비교는 항목마다 `Object.is`, 길이가 다르면 바뀐 것 */
export type Deps = readonly unknown[] | null;

/** effect가 돌려주는 뒷정리 함수 */
export type EffectCleanup = () => void;

/** effect 본문: 아무것도 안 돌려주거나 뒷정리 함수를 돌려준다 */
export type EffectCallback = () => void | EffectCleanup;

/** useState 슬롯: 지금 값. setter는 렌더 사이에 같은 함수를 돌려준다 */
export interface StateHook {
  readonly kind: 'state';
  value: unknown;
  readonly setter: (next: unknown) => void;
}

/** useEffect 슬롯: 지난 렌더의 의존성과 지난 실행이 돌려준 뒷정리 */
export interface EffectHook {
  readonly kind: 'effect';
  deps: Deps;
  cleanup: EffectCleanup | null;
}

/** useMemo 슬롯: 저장한 계산값과 그때의 의존성 */
export interface MemoHook {
  readonly kind: 'memo';
  value: unknown;
  deps: Deps;
}

/**
 * `FunctionComponent.hooks` 배열의 한 칸 (P2-04). 부른 순서대로 쌓이고 렌더마다 0번부터 다시 센다.
 * 같은 번호의 종류(kind)가 바뀌거나 개수가 달라지면 오류다 (`if` · `for` 안 Hook 금지).
 */
export type HookSlot = StateHook | EffectHook | MemoHook;
