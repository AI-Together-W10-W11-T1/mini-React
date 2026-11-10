// 코어 타입 (마스터만 수정, 변경은 types_changelog.md에 기록)
// 기준: PRD 4.2 Virtual DOM 자료구조, VN-01 · VN-02

/** 텍스트 VNode의 type 값 (결정 1: TEXT 객체) */
export const TEXT_NODE = '#text';

/** 목록 비교용 key. h()가 props에서 꺼내 VNode에 둔다 (비교 방식은 diff task에서 정함) */
export type Key = string | number;

/**
 * 요소 · 컴포넌트의 props.
 * 값은 unknown — 문자열 · 숫자 · boolean 외의 값(함수 · 객체)을 어떻게 다룰지는
 * 소비하는 쪽(renderVNode 등)이 정한다.
 */
export type Props = { readonly [name: string]: unknown };

/** 텍스트 VNode: `{ type: '#text', props: { nodeValue }, children: [] }` */
export interface TextVNode {
  readonly type: typeof TEXT_NODE;
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

/** 함수형 컴포넌트: props만 받아 VNode를 반환하는 함수 */
export type Component = (props: Props) => VNode;

/** 컴포넌트 VNode: type이 함수. 자식은 요소와 같은 방식으로 정규화해 children에 둔다 */
export interface ComponentVNode {
  readonly type: Component;
  readonly props: Props;
  readonly children: readonly VNode[];
  readonly key?: Key;
}

export type VNode = TextVNode | ElementVNode | ComponentVNode;

/** h()가 받는 자식 입력. 문자열 · 숫자는 TextVNode로, null · undefined · boolean은 무시, 배열은 평탄화 */
export type VNodeChild = VNode | string | number | boolean | null | undefined | readonly VNodeChild[];
