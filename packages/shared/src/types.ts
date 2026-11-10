// 코어 타입 (마스터만 수정, 변경은 types_changelog.md에 기록)
// 기준: PRD v2.1 §3.1 · §3.3 · §5, task_001 명세 「알고리즘 결정」

/** 텍스트 VNode의 type 값 (알고리즘 결정 1 B: TEXT 객체) */
export const TEXT_NODE = '#text';

/** 주석 VNode의 type 값 (알고리즘 결정 5: 공백 · 주석 모두 유지) */
export const COMMENT_NODE = '#comment';

/** State History 보관 한도 (§3.3). 넘으면 가장 오래된 기록부터 뺀다 */
export const HISTORY_LIMIT = 50;

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
  | { readonly kind: 'MOVE'; readonly parent: Path; readonly from: number; readonly to: number };

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
