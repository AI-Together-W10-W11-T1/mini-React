import { describe, expect, it } from 'vitest';
import {
  INITIAL_DOC,
  addInstance,
  instanceName,
  isOverridden,
  mergeProps,
  moveInstance,
  reconcileSelection,
  removeInstance,
  resetInstanceField,
  setInstanceField,
  setMainField,
  setVariableValue,
} from '../model';
import type { Doc, Field, Instance, MainProps } from '../model';

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as object).forEach(deepFreeze);
  }
  return value;
}

const instanceOf = (doc: Doc, id: string): Instance => {
  const found = doc.instances.find((it) => it.id === id);
  if (!found) throw new Error(`없는 인스턴스: ${id}`);
  return found;
};

describe('INITIAL_DOC — 시작 데이터 (MF-16)', () => {
  it('메인 Button은 라벨 버튼 · 크기 M · 아이콘 꺼짐(star) · 파랑 #0052ff이다 (색은 이름이 아니라 값, FD-20)', () => {
    expect(INITIAL_DOC.main).toEqual({ label: '버튼', size: 'M', hasIcon: false, icon: 'star', color: '#0052ff' });
  });

  it('색 칸 값은 전부 #rrggbb 글이고 이름 값(blue · red · green)이 남아 있지 않다', () => {
    const colors = [INITIAL_DOC.main.color, ...INITIAL_DOC.instances.flatMap((it) => (it.color === undefined ? [] : [it.color]))];
    for (const color of colors) expect(color).toMatch(/^#[0-9a-f]{6}$/);
    expect(JSON.stringify(INITIAL_DOC)).not.toMatch(/blue|red|green/);
  });

  it('인스턴스는 b1 · b2 · b3 순서이고 바꾼 값만 가진다', () => {
    expect(INITIAL_DOC.instances).toEqual([{ id: 'b1' }, { id: 'b2', label: '취소' }, { id: 'b3', label: '삭제', color: '#cf202f' }]);
  });

  it('b1은 키가 id뿐이다 (override 없음)', () => {
    expect(Object.keys(instanceOf(INITIAL_DOC, 'b1'))).toEqual(['id']);
  });

  it('doc에는 main · instances 두 칸뿐이다 (nextId · 선택은 doc 밖)', () => {
    expect(Object.keys(INITIAL_DOC)).toEqual(['main', 'instances', 'variables']);
  });
});

describe('mergeProps — 키가 있으면 override (MF-12)', () => {
  const main: MainProps = { label: '메인', size: 'M', hasIcon: false, icon: 'star', color: '#0052ff' };

  it('키 없는 칸은 메인 값, 키 있는 칸은 인스턴스 값을 쓴다', () => {
    const merged = mergeProps(main, { id: 'b2', label: '취소', color: '#cf202f' });
    expect(merged).toMatchObject({ label: '취소', size: 'M', hasIcon: false, icon: 'star', color: '#cf202f' });
  });

  it('override가 하나도 없으면 메인 값 전부이고 id가 함께 나온다', () => {
    expect(mergeProps(main, { id: 'b1' })).toEqual({ ...main, id: 'b1' });
  });

  it('빈 글자 ""도 override다 (메인 값으로 돌아가지 않는다)', () => {
    expect(mergeProps(main, { id: 'b1', label: '' }).label).toBe('');
  });

  it('메인과 같은 값도 override다 (메인이 바뀌어도 인스턴스 값 그대로)', () => {
    const it1: Instance = { id: 'b1', label: '메인' };
    const changedMain: MainProps = { ...main, label: '바뀜' };
    expect(mergeProps(changedMain, it1).label).toBe('메인');
  });

  it('메인을 바꾸면 override 없는 칸만 따라 바뀐다', () => {
    const it1: Instance = { id: 'b3', color: '#cf202f' };
    const changedMain: MainProps = { ...main, size: 'L', color: '#05b169' };
    const merged = mergeProps(changedMain, it1);
    expect(merged.size).toBe('L');
    expect(merged.color).toBe('#cf202f');
  });

  it('입력을 고치지 않는다', () => {
    const m = deepFreeze({ ...main });
    const i = deepFreeze<Instance>({ id: 'b1', label: 'x' });
    expect(() => mergeProps(m, i)).not.toThrow();
    expect(mergeProps(m, i)).not.toBe(m);
  });
});

describe('isOverridden — 키가 있는지만 본다', () => {
  it('키가 있으면 true, 없으면 false', () => {
    const it1: Instance = { id: 'b3', label: '삭제', color: '#cf202f' };
    expect(isOverridden(it1, 'label')).toBe(true);
    expect(isOverridden(it1, 'color')).toBe(true);
    expect(isOverridden(it1, 'size')).toBe(false);
    expect(isOverridden(it1, 'hasIcon')).toBe(false);
    expect(isOverridden(it1, 'icon')).toBe(false);
  });

  it('값이 빈 글자 · false여도 키가 있으면 override다', () => {
    expect(isOverridden({ id: 'b1', label: '' }, 'label')).toBe(true);
    expect(isOverridden({ id: 'b1', hasIcon: false }, 'hasIcon')).toBe(true);
  });

  it('"id"는 override가 아니다 (Field에 없음) — 객체 prototype 키도 override가 아니다', () => {
    expect(isOverridden({ id: 'b1' }, 'toString' as Field)).toBe(false);
  });
});

describe('setMainField — 메인 칸 바꾸기', () => {
  it('같은 값이면 같은 Doc 객체를 돌려준다 (기록 · 렌더 없음)', () => {
    expect(setMainField(INITIAL_DOC, 'label', '버튼')).toBe(INITIAL_DOC);
    expect(setMainField(INITIAL_DOC, 'hasIcon', false)).toBe(INITIAL_DOC);
  });

  it('다르면 새 Doc이고 instances 배열은 같은 참조다', () => {
    const next = setMainField(INITIAL_DOC, 'size', 'L');
    expect(next).not.toBe(INITIAL_DOC);
    expect(next.main.size).toBe('L');
    expect(next.main.label).toBe('버튼');
    expect(next.instances).toBe(INITIAL_DOC.instances);
  });

  it('메인을 바꾸면 override 없는 인스턴스만 보이는 값이 따라간다', () => {
    const next = setMainField(INITIAL_DOC, 'color', '#05b169');
    const colors = next.instances.map((it) => mergeProps(next.main, it).color);
    expect(colors).toEqual(['#05b169', '#05b169', '#cf202f']);
  });

  it('입력을 고치지 않는다 (freeze)', () => {
    const frozen = deepFreeze<Doc>({ main: { ...INITIAL_DOC.main }, instances: INITIAL_DOC.instances.map((it) => ({ ...it })), variables: INITIAL_DOC.variables.map((v) => ({ ...v })) });
    expect(() => setMainField(frozen, 'label', '새')).not.toThrow();
    expect(frozen.main.label).toBe('버튼');
  });
});

describe('setInstanceField — 인스턴스 칸 바꾸기 (override 만들기)', () => {
  it('키 없던 칸에 쓰면 키가 생긴다 (값이 메인과 같아도)', () => {
    const next = setInstanceField(INITIAL_DOC, 'b1', 'label', '버튼');
    expect(next).not.toBe(INITIAL_DOC);
    expect(isOverridden(instanceOf(next, 'b1'), 'label')).toBe(true);
    expect(instanceOf(next, 'b1').label).toBe('버튼');
  });

  it('키 없던 칸에 다른 값을 쓰면 그 인스턴스만 바뀐다', () => {
    const next = setInstanceField(INITIAL_DOC, 'b1', 'size', 'S');
    expect(mergeProps(next.main, instanceOf(next, 'b1')).size).toBe('S');
    expect(mergeProps(next.main, instanceOf(next, 'b2')).size).toBe('M');
  });

  it('이미 override인 칸에 같은 값이면 같은 Doc 객체다 (기록 안 남음)', () => {
    expect(setInstanceField(INITIAL_DOC, 'b2', 'label', '취소')).toBe(INITIAL_DOC);
  });

  it('이미 override인 칸에 다른 값이면 새 Doc이다', () => {
    const next = setInstanceField(INITIAL_DOC, 'b2', 'label', '확인');
    expect(next).not.toBe(INITIAL_DOC);
    expect(instanceOf(next, 'b2').label).toBe('확인');
  });

  it('다른 인스턴스와 메인은 같은 객체 (참조 유지)', () => {
    const next = setInstanceField(INITIAL_DOC, 'b2', 'label', '확인');
    expect(next.main).toBe(INITIAL_DOC.main);
    expect(instanceOf(next, 'b1')).toBe(instanceOf(INITIAL_DOC, 'b1'));
    expect(instanceOf(next, 'b3')).toBe(instanceOf(INITIAL_DOC, 'b3'));
    expect(next.instances.map((it) => it.id)).toEqual(['b1', 'b2', 'b3']);
  });

  it('없는 id면 같은 Doc 객체다', () => {
    expect(setInstanceField(INITIAL_DOC, 'b99', 'label', 'x')).toBe(INITIAL_DOC);
  });

  it('빈 글자 ""를 쓰면 override가 된다 (빈 글자 노드로 남음)', () => {
    const next = setInstanceField(INITIAL_DOC, 'b1', 'label', '');
    expect(instanceOf(next, 'b1').label).toBe('');
    expect(mergeProps(next.main, instanceOf(next, 'b1')).label).toBe('');
  });

  it('메인을 바꿔도 override한 칸은 그대로다 (메인과 같은 값으로 override한 칸 포함)', () => {
    const same = setInstanceField(INITIAL_DOC, 'b1', 'label', '버튼');
    const changed = setMainField(same, 'label', '저장');
    expect(mergeProps(changed.main, instanceOf(changed, 'b1')).label).toBe('버튼');
  });

  it('입력을 고치지 않는다 (freeze)', () => {
    const frozen = deepFreeze<Doc>({ main: { ...INITIAL_DOC.main }, instances: INITIAL_DOC.instances.map((it) => ({ ...it })), variables: INITIAL_DOC.variables.map((v) => ({ ...v })) });
    expect(() => setInstanceField(frozen, 'b1', 'size', 'L')).not.toThrow();
    expect(Object.keys(frozen.instances[0])).toEqual(['id']);
  });
});

describe('resetInstanceField — ↻ = 키 지우기 (MF-13)', () => {
  it('키가 사라진다 (undefined 값이 남지 않는다)', () => {
    const next = resetInstanceField(INITIAL_DOC, 'b2', 'label');
    const b2 = instanceOf(next, 'b2');
    expect('label' in b2).toBe(false);
    expect(Object.keys(b2)).toEqual(['id']);
    expect(Object.values(b2)).not.toContain(undefined);
  });

  it('되돌린 뒤 mergeProps가 메인 값을 따른다', () => {
    const next = resetInstanceField(INITIAL_DOC, 'b2', 'label');
    expect(mergeProps(next.main, instanceOf(next, 'b2')).label).toBe('버튼');
  });

  it('이후 메인을 바꾸면 다시 따라간다', () => {
    const reset = resetInstanceField(INITIAL_DOC, 'b3', 'color');
    const changed = setMainField(reset, 'color', '#05b169');
    expect(mergeProps(changed.main, instanceOf(changed, 'b3')).color).toBe('#05b169');
    // 라벨은 아직 override
    expect(mergeProps(changed.main, instanceOf(changed, 'b3')).label).toBe('삭제');
  });

  it('다른 칸 · 다른 인스턴스 · 메인은 그대로다 (참조 유지)', () => {
    const next = resetInstanceField(INITIAL_DOC, 'b3', 'color');
    expect(instanceOf(next, 'b3')).toEqual({ id: 'b3', label: '삭제' });
    expect(instanceOf(next, 'b1')).toBe(instanceOf(INITIAL_DOC, 'b1'));
    expect(instanceOf(next, 'b2')).toBe(instanceOf(INITIAL_DOC, 'b2'));
    expect(next.main).toBe(INITIAL_DOC.main);
  });

  it('키가 없는 칸이면 같은 Doc 객체다', () => {
    expect(resetInstanceField(INITIAL_DOC, 'b1', 'label')).toBe(INITIAL_DOC);
    expect(resetInstanceField(INITIAL_DOC, 'b2', 'size')).toBe(INITIAL_DOC);
  });

  it('없는 id면 같은 Doc 객체다', () => {
    expect(resetInstanceField(INITIAL_DOC, 'b99', 'label')).toBe(INITIAL_DOC);
  });

  it('입력을 고치지 않는다 (freeze)', () => {
    const frozen = deepFreeze<Doc>({ main: { ...INITIAL_DOC.main }, instances: INITIAL_DOC.instances.map((it) => ({ ...it })), variables: INITIAL_DOC.variables.map((v) => ({ ...v })) });
    expect(() => resetInstanceField(frozen, 'b2', 'label')).not.toThrow();
    expect(frozen.instances[1].label).toBe('취소');
  });
});

describe('아이콘 칸 hasIcon · icon도 같은 규칙 (MF-14, Boolean · Instance swap)', () => {
  it('인스턴스에서 hasIcon · icon을 쓰면 키가 생기고, 메인을 바꿔도 그 값 그대로다', () => {
    const on = setInstanceField(INITIAL_DOC, 'b2', 'hasIcon', true);
    const heart = setInstanceField(on, 'b2', 'icon', 'heart');
    expect(isOverridden(instanceOf(heart, 'b2'), 'hasIcon')).toBe(true);
    expect(isOverridden(instanceOf(heart, 'b2'), 'icon')).toBe(true);

    // 메인: 켜고 종류도 바꿈 → b2는 그대로 (hasIcon true · heart), 따르는 b1은 메인 값
    const mainOn = setMainField(setMainField(heart, 'hasIcon', true), 'icon', 'star');
    const mainOff = setMainField(mainOn, 'hasIcon', false);
    expect(mergeProps(mainOff.main, instanceOf(mainOff, 'b2'))).toMatchObject({ hasIcon: true, icon: 'heart' });
    expect(mergeProps(mainOff.main, instanceOf(mainOff, 'b1'))).toMatchObject({ hasIcon: false, icon: 'star' });
    expect(mergeProps(mainOn.main, instanceOf(mainOn, 'b1'))).toMatchObject({ hasIcon: true, icon: 'star' });
  });

  it('hasIcon을 false로 override해도 키가 남는다 (메인이 켜져도 꺼진 채)', () => {
    const off = setInstanceField(setMainField(INITIAL_DOC, 'hasIcon', true), 'b1', 'hasIcon', false);
    expect(isOverridden(instanceOf(off, 'b1'), 'hasIcon')).toBe(true);
    expect(mergeProps(off.main, instanceOf(off, 'b1')).hasIcon).toBe(false);
  });

  it('resetInstanceField로 각각 키를 지우면 다시 메인을 따른다', () => {
    const on = setInstanceField(setInstanceField(INITIAL_DOC, 'b2', 'hasIcon', true), 'b2', 'icon', 'heart');
    const noIcon = resetInstanceField(on, 'b2', 'hasIcon');
    expect(isOverridden(instanceOf(noIcon, 'b2'), 'hasIcon')).toBe(false);
    expect(isOverridden(instanceOf(noIcon, 'b2'), 'icon')).toBe(true);
    const bare = resetInstanceField(noIcon, 'b2', 'icon');
    expect(isOverridden(instanceOf(bare, 'b2'), 'icon')).toBe(false);
    expect(Object.keys(instanceOf(bare, 'b2')).sort()).toEqual(['id', 'label']);
    // 메인을 켜면 b2도 따라 ★이 된다 (♥ 아님)
    const mainOn = setMainField(bare, 'hasIcon', true);
    expect(mergeProps(mainOn.main, instanceOf(mainOn, 'b2'))).toMatchObject({ hasIcon: true, icon: 'star' });
  });
});

const ids = (doc: Doc): string[] => doc.instances.map((it) => it.id);

describe('addInstance — 추가 (MF-22, 정책: 새 인스턴스 = override 없음)', () => {
  it('끝에 붙고 id는 b + nextId다', () => {
    const next = addInstance(INITIAL_DOC, 4);
    expect(ids(next)).toEqual(['b1', 'b2', 'b3', 'b4']);
  });

  it('새 인스턴스는 override가 없다 (키가 id뿐)', () => {
    const next = addInstance(INITIAL_DOC, 4);
    expect(Object.keys(next.instances[3])).toEqual(['id']);
  });

  it('기존 인스턴스 객체와 메인은 같은 참조다', () => {
    const next = addInstance(INITIAL_DOC, 4);
    INITIAL_DOC.instances.forEach((it, i) => expect(next.instances[i]).toBe(it));
    expect(next.main).toBe(INITIAL_DOC.main);
    expect(next).not.toBe(INITIAL_DOC);
    expect(next.instances).not.toBe(INITIAL_DOC.instances);
  });

  it('번호를 다시 쓰지 않는다: b3를 지운 뒤에도 nextId 4면 b4다 (b3 아님)', () => {
    const removed = removeInstance(INITIAL_DOC, 'b3');
    expect(ids(addInstance(removed, 4))).toEqual(['b1', 'b2', 'b4']);
  });

  it('doc에는 nextId가 없다 (번호는 App이 세어 넘긴다)', () => {
    expect(Object.keys(addInstance(INITIAL_DOC, 4))).toEqual(['main', 'instances', 'variables']);
  });

  it('메인 값이 바뀐 상태에서 추가해도 새 인스턴스는 메인을 따른다', () => {
    const changed = setMainField(setMainField(INITIAL_DOC, 'label', '확인'), 'size', 'L');
    const next = addInstance(changed, 4);
    expect(mergeProps(next.main, instanceOf(next, 'b4'))).toMatchObject({ label: '확인', size: 'L' });
  });

  it('입력을 고치지 않는다 (freeze)', () => {
    const frozen = deepFreeze<Doc>({ main: { ...INITIAL_DOC.main }, instances: INITIAL_DOC.instances.map((it) => ({ ...it })), variables: INITIAL_DOC.variables.map((v) => ({ ...v })) });
    expect(() => addInstance(frozen, 4)).not.toThrow();
    expect(frozen.instances).toHaveLength(3);
  });
});

describe('removeInstance — 삭제 (MF-23 · MF-24)', () => {
  it('그 id만 빠지고 나머지 순서는 그대로다', () => {
    expect(ids(removeInstance(INITIAL_DOC, 'b2'))).toEqual(['b1', 'b3']);
    expect(ids(removeInstance(INITIAL_DOC, 'b1'))).toEqual(['b2', 'b3']);
  });

  it('남은 인스턴스 객체와 메인은 같은 참조다', () => {
    const next = removeInstance(INITIAL_DOC, 'b2');
    expect(next.instances[0]).toBe(instanceOf(INITIAL_DOC, 'b1'));
    expect(next.instances[1]).toBe(instanceOf(INITIAL_DOC, 'b3'));
    expect(next.main).toBe(INITIAL_DOC.main);
  });

  it('없는 id는 같은 Doc 객체다', () => {
    expect(removeInstance(INITIAL_DOC, 'b99')).toBe(INITIAL_DOC);
  });

  it('메인("main")은 지울 수 없다: 같은 Doc 객체다', () => {
    expect(removeInstance(INITIAL_DOC, 'main')).toBe(INITIAL_DOC);
  });

  it('입력을 고치지 않는다 (freeze)', () => {
    const frozen = deepFreeze<Doc>({ main: { ...INITIAL_DOC.main }, instances: INITIAL_DOC.instances.map((it) => ({ ...it })), variables: INITIAL_DOC.variables.map((v) => ({ ...v })) });
    expect(() => removeInstance(frozen, 'b1')).not.toThrow();
    expect(frozen.instances).toHaveLength(3);
  });
});

describe('moveInstance — 순서 바꾸기 (MF-25)', () => {
  it('-1은 앞과, +1은 뒤와 자리를 바꾼다', () => {
    expect(ids(moveInstance(INITIAL_DOC, 'b2', -1))).toEqual(['b2', 'b1', 'b3']);
    expect(ids(moveInstance(INITIAL_DOC, 'b2', 1))).toEqual(['b1', 'b3', 'b2']);
    expect(ids(moveInstance(INITIAL_DOC, 'b1', 1))).toEqual(['b2', 'b1', 'b3']);
  });

  it('항목 객체는 같은 참조고 순서만 바뀐다 (화면에서 MOVE가 되는 근거)', () => {
    const next = moveInstance(INITIAL_DOC, 'b1', 1);
    INITIAL_DOC.instances.forEach((it) => expect(next.instances).toContain(it));
    expect(next.main).toBe(INITIAL_DOC.main);
    expect(next.instances).not.toBe(INITIAL_DOC.instances);
  });

  it('경계(맨 위의 -1 · 맨 아래의 +1)는 같은 Doc 객체다', () => {
    expect(moveInstance(INITIAL_DOC, 'b1', -1)).toBe(INITIAL_DOC);
    expect(moveInstance(INITIAL_DOC, 'b3', 1)).toBe(INITIAL_DOC);
  });

  it('없는 id는 같은 Doc 객체다', () => {
    expect(moveInstance(INITIAL_DOC, 'b99', -1)).toBe(INITIAL_DOC);
    expect(moveInstance(INITIAL_DOC, 'b99', 1)).toBe(INITIAL_DOC);
  });

  it('입력을 고치지 않는다 (freeze)', () => {
    const frozen = deepFreeze<Doc>({ main: { ...INITIAL_DOC.main }, instances: INITIAL_DOC.instances.map((it) => ({ ...it })), variables: INITIAL_DOC.variables.map((v) => ({ ...v })) });
    expect(() => moveInstance(frozen, 'b1', 1)).not.toThrow();
    expect(ids(frozen)).toEqual(['b1', 'b2', 'b3']);
  });
});

describe('reconcileSelection — 사라진 선택 정리 (MF-26 · MF-32)', () => {
  it('null은 null이다', () => {
    expect(reconcileSelection(null, INITIAL_DOC)).toBeNull();
  });

  it("'main'은 항상 유효하다 (인스턴스가 하나도 없어도)", () => {
    expect(reconcileSelection('main', INITIAL_DOC)).toBe('main');
    expect(reconcileSelection('main', { ...INITIAL_DOC, instances: [] })).toBe('main');
  });

  it('있는 id는 그대로다', () => {
    expect(reconcileSelection('b2', INITIAL_DOC)).toBe('b2');
  });

  it('없는 id는 null이다 (삭제 · Undo · Redo로 사라진 경우 모두)', () => {
    expect(reconcileSelection('b2', removeInstance(INITIAL_DOC, 'b2'))).toBeNull();
    expect(reconcileSelection('b4', INITIAL_DOC)).toBeNull();
  });
});

describe('instanceName — 레이어 행 · 패널 머리의 이름 (④-3)', () => {
  const main = INITIAL_DOC.main;

  it('override 글자가 있으면 그 글자다', () => {
    expect(instanceName(main, instanceOf(INITIAL_DOC, 'b2'))).toBe('취소');
  });

  it('메인을 따르면 메인 글자다', () => {
    expect(instanceName(main, instanceOf(INITIAL_DOC, 'b1'))).toBe('버튼');
  });

  it("지금 글자가 ''이면 id다 (override 빈 글자)", () => {
    expect(instanceName(main, { id: 'b1', label: '' })).toBe('b1');
  });

  it("메인이 ''이고 따르면 id다", () => {
    expect(instanceName({ ...main, label: '' }, { id: 'b3' })).toBe('b3');
  });

  it("메인이 ''여도 override 글자가 있으면 그 글자다", () => {
    expect(instanceName({ ...main, label: '' }, { id: 'b3', label: '삭제' })).toBe('삭제');
  });
});

// [AI Note]: task_007 변수 (VR-01 · 02). V-1 ~ V-5 + A56(형식 밖 값 · 없는 id).
describe('변수 (V-1 ~ V-5, A56)', () => {
  const cloneDoc = (): Doc =>
    deepFreeze<Doc>({ main: { ...INITIAL_DOC.main }, instances: INITIAL_DOC.instances.map((it) => ({ ...it })), variables: INITIAL_DOC.variables.map((v) => ({ ...v })) });

  it('V-1 처음 변수 3개: 순서 · 이름 · 값 (팔레트 색)', () => {
    expect(INITIAL_DOC.variables).toEqual([
      { id: 'primary', name: 'Primary', value: '#0052ff' },
      { id: 'danger', name: 'Danger', value: '#cf202f' },
      { id: 'success', name: 'Success', value: '#05b169' },
    ]);
  });

  it('V-2 기존 doc 함수 6개는 variables를 같은 참조로 이어받는다', () => {
    const doc = cloneDoc();
    const results: Doc[] = [
      setMainField(doc, 'label', '새 글자'),
      setInstanceField(doc, 'b1', 'label', 'x'),
      resetInstanceField(doc, 'b3', 'color'),
      addInstance(doc, 4),
      removeInstance(doc, 'b1'),
      moveInstance(doc, 'b1', 1),
    ];
    for (const next of results) {
      expect(next).not.toBe(doc);
      expect(next.variables).toBe(doc.variables);
    }
  });

  it('V-3 setVariableValue: 다른 값이면 새 Doc, 그 변수만 새 객체, 나머지는 같은 참조', () => {
    const doc = cloneDoc();
    const next = setVariableValue(doc, 'primary', '#f4b000');
    expect(next).not.toBe(doc);
    expect(next.variables[0]).toEqual({ id: 'primary', name: 'Primary', value: '#f4b000' });
    expect(next.variables[0]).not.toBe(doc.variables[0]);
    expect(next.variables[1]).toBe(doc.variables[1]);
    expect(next.variables[2]).toBe(doc.variables[2]);
    expect(next.main).toBe(doc.main);
    expect(next.instances).toBe(doc.instances);
  });

  it('V-4 같은 값 · 없는 id · 형식 밖 값은 같은 Doc (A56)', () => {
    const doc = cloneDoc();
    expect(setVariableValue(doc, 'primary', '#0052ff')).toBe(doc);
    expect(setVariableValue(doc, 'ghost', '#f4b000')).toBe(doc);
    expect(setVariableValue(doc, '', '#f4b000')).toBe(doc);
    for (const bad of ['blue', '#fff', '', 'var:primary', '#GGGGGG']) expect(setVariableValue(doc, 'primary', bad), bad).toBe(doc);
  });

  it('V-5 입력은 안 바뀐다 (깊게 동결해도 안 깨짐)', () => {
    const doc = cloneDoc();
    expect(() => setVariableValue(doc, 'danger', '#112233')).not.toThrow();
    expect(doc.variables[1].value).toBe('#cf202f');
  });
});
