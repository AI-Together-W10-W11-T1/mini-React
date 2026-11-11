// [AI Note]: mini-figma의 "값" 쪽 순수 함수들. DOM · Hook · 엔진 import가 없다 (rootOnlyHooks.test.ts가 검사).
// 입력을 고치지 않고 새 객체를 돌려준다. 바뀐 것이 없으면 "같은 Doc 객체"를 그대로 돌려줘서,
// 루트의 setter가 같은 값(Object.is)으로 보고 다시 그리지 않고 Undo 기록에도 안 남게 한다 (phase2-app/todoOps.ts 방식).

export type Size = 'S' | 'M' | 'L';
/** 색 값 `#rrggbb` (소문자, FD-20). 이름('blue')이 아니라 값을 저장한다 — 칩 8개 밖의 색도 색 입력칸으로 고를 수 있어서 */
export type Color = string;
/** 아이콘 종류는 문자열로만 들고 있다. 문자열 → 컴포넌트(StarIcon · HeartIcon) 변환은 Canvas가 한다 (④-12) */
export type IconKind = 'star' | 'heart';

/** 메인 Button의 속성 5칸 (Text · Variant · Boolean · Instance swap + 색) */
export interface MainProps {
  readonly label: string;
  readonly size: Size;
  readonly hasIcon: boolean;
  readonly icon: IconKind;
  readonly color: Color;
}

export type Field = keyof MainProps;

/** 인스턴스 = id + "바꾼 칸만" 가진 객체. 키가 있으면 override, 없으면 메인을 따른다 */
export type Instance = { readonly id: string } & Partial<MainProps>;

/** Undo가 기록하는 것: main · instances만. 선택(selectedId) · nextId는 doc 밖이라 기록에 없다 */
export interface Doc {
  readonly main: MainProps;
  readonly instances: readonly Instance[];
}

/** MF-16: 시작 데이터. b1은 override 없음, b2는 라벨만, b3는 라벨 + 색 (FD-20: 메인 #0052ff, b3 #cf202f) */
export const INITIAL_DOC: Doc = {
  main: { label: '버튼', size: 'M', hasIcon: false, icon: 'star', color: '#0052ff' },
  instances: [{ id: 'b1' }, { id: 'b2', label: '취소' }, { id: 'b3', label: '삭제', color: '#cf202f' }],
};

/**
 * 화면에 보이는 값 = 메인 값 위에 인스턴스의 키를 덮어씌운 것.
 * [AI Note]: "키가 있으면 override"라서 빈 글자 ''도, 메인과 같은 값도 override다 (메인이 바뀌어도 그대로).
 * 결과에 id가 함께 들어 있으니, 호출한 쪽(Button)은 쓸 props를 하나씩 꺼내 써야 한다 (id가 DOM 속성이 되지 않게).
 */
export function mergeProps(main: MainProps, instance: Instance): MainProps & { readonly id: string } {
  return { ...main, ...instance };
}

/** 그 칸이 override인가 = 키가 있는가 (값이 '' · false여도 키가 있으면 true) */
export function isOverridden(instance: Instance, field: Field): boolean {
  return Object.hasOwn(instance, field);
}

/** 메인 한 칸을 바꾼다. 같은 값이면 같은 Doc, 다르면 새 Doc (instances 배열은 같은 참조) */
export function setMainField<F extends Field>(doc: Doc, field: F, value: MainProps[F]): Doc {
  if (Object.is(doc.main[field], value)) return doc;
  return { main: { ...doc.main, [field]: value }, instances: doc.instances };
}

/**
 * 그 인스턴스 한 칸에 값을 쓴다 (키가 없던 칸이면 키가 생겨 override가 된다 — 값이 메인과 같아도).
 * 이미 override인 칸에 같은 값이면, 없는 id면 같은 Doc. 다른 인스턴스 · 메인은 같은 객체.
 */
export function setInstanceField<F extends Field>(doc: Doc, id: string, field: F, value: MainProps[F]): Doc {
  const target = doc.instances.find((it) => it.id === id);
  if (!target) return doc;
  if (isOverridden(target, field) && Object.is(target[field], value)) return doc;
  return {
    main: doc.main,
    instances: doc.instances.map((it) => (it.id === id ? { ...it, [field]: value } : it)),
  };
}

/**
 * ↻: 그 인스턴스의 그 칸 키를 지운다 → 다시 메인을 따른다.
 * [AI Note]: `undefined`를 넣지 않고 키 자체를 뺀다. `{ label: undefined }`를 두면 mergeProps가 메인 값을
 * 덮어써 버려서 글자가 사라지고 `hasOwn`도 여전히 true다. 키가 없는 칸 · 없는 id면 같은 Doc.
 */
export function resetInstanceField(doc: Doc, id: string, field: Field): Doc {
  const target = doc.instances.find((it) => it.id === id);
  if (!target || !isOverridden(target, field)) return doc;
  const { [field]: _removed, ...rest } = target;
  return {
    main: doc.main,
    instances: doc.instances.map((it) => (it.id === id ? (rest as Instance) : it)),
  };
}

/**
 * 끝에 새 인스턴스를 붙인다. 번호 `nextId`는 doc 밖(App의 칸)에서 받는다.
 * [AI Note]: 번호가 doc 안에 있으면 Undo가 번호까지 되돌려서 추가 → Undo → 추가가 같은 id(b4)를 다시 만든다.
 * 번호를 App이 따로 세고 Undo가 건드리지 않으므로 지운 번호를 다시 쓰지 않는다 (key가 겹치지 않음, Q17-3).
 * 새 인스턴스는 override 없이 `{ id }`만 가진다 → 메인을 따른다.
 */
export function addInstance(doc: Doc, nextId: number): Doc {
  return { main: doc.main, instances: [...doc.instances, { id: `b${nextId}` }] };
}

/** 그 인스턴스를 뺀다. 없는 id · 메인('main')은 같은 Doc (메인은 지울 수 없다, MF-24) */
export function removeInstance(doc: Doc, id: string): Doc {
  if (!doc.instances.some((it) => it.id === id)) return doc;
  return { main: doc.main, instances: doc.instances.filter((it) => it.id !== id) };
}

/**
 * 그 인스턴스를 한 칸 옮긴다. delta = -1([↑]) · +1([↓]).
 * 경계(맨 위의 -1 · 맨 아래의 +1)이거나 없는 id면 같은 Doc (같은 값 → 다시 그리지 않고 기록 안 남음, ④-13).
 * 항목 객체는 그대로 두고 순서만 바꾸므로 화면에서는 같은 key의 요소가 새로 만들어지지 않고 이동(MOVE)한다.
 */
export function moveInstance(doc: Doc, id: string, delta: -1 | 1): Doc {
  const from = doc.instances.findIndex((it) => it.id === id);
  const to = from + delta;
  if (from === -1 || to < 0 || to >= doc.instances.length) return doc;
  const instances = [...doc.instances];
  [instances[from], instances[to]] = [instances[to], instances[from]];
  return { main: doc.main, instances };
}

/**
 * 삭제 · Undo · Redo로 doc이 바뀐 뒤 선택을 정리한다. 'main'은 항상 유효, 없는 인스턴스 id는 null (MF-32).
 * [AI Note]: 선택은 인덱스가 아니라 id라서, 앞에 다른 인스턴스가 끼어들거나 빠져도 같은 인스턴스를 계속 가리킨다 (MF-26).
 */
export function reconcileSelection(selectedId: string | null, doc: Doc): string | null {
  if (selectedId === null || selectedId === 'main') return selectedId;
  return doc.instances.some((it) => it.id === selectedId) ? selectedId : null;
}

/** 레이어 행 · 속성 패널 머리에 쓸 인스턴스 이름 = 지금 보이는 글자. 글자가 ''이면 id로 대신한다 (④-3) */
export function instanceName(main: MainProps, instance: Instance): string {
  const { label } = mergeProps(main, instance);
  return label === '' ? instance.id : label;
}
