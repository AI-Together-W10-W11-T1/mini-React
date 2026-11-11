import { describe, expect, it } from 'vitest';
import { INITIAL_DOC, isOverridden, mergeProps, resetInstanceField, setInstanceField, setMainField } from '../model';
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
  it('메인 Button은 라벨 버튼 · 크기 M · 아이콘 꺼짐(star) · 파랑이다', () => {
    expect(INITIAL_DOC.main).toEqual({ label: '버튼', size: 'M', hasIcon: false, icon: 'star', color: 'blue' });
  });

  it('인스턴스는 b1 · b2 · b3 순서이고 바꾼 값만 가진다', () => {
    expect(INITIAL_DOC.instances).toEqual([{ id: 'b1' }, { id: 'b2', label: '취소' }, { id: 'b3', label: '삭제', color: 'red' }]);
  });

  it('b1은 키가 id뿐이다 (override 없음)', () => {
    expect(Object.keys(instanceOf(INITIAL_DOC, 'b1'))).toEqual(['id']);
  });

  it('doc에는 main · instances 두 칸뿐이다 (nextId · 선택은 doc 밖)', () => {
    expect(Object.keys(INITIAL_DOC)).toEqual(['main', 'instances']);
  });
});

describe('mergeProps — 키가 있으면 override (MF-12)', () => {
  const main: MainProps = { label: '메인', size: 'M', hasIcon: false, icon: 'star', color: 'blue' };

  it('키 없는 칸은 메인 값, 키 있는 칸은 인스턴스 값을 쓴다', () => {
    const merged = mergeProps(main, { id: 'b2', label: '취소', color: 'red' });
    expect(merged).toMatchObject({ label: '취소', size: 'M', hasIcon: false, icon: 'star', color: 'red' });
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
    const it1: Instance = { id: 'b3', color: 'red' };
    const changedMain: MainProps = { ...main, size: 'L', color: 'green' };
    const merged = mergeProps(changedMain, it1);
    expect(merged.size).toBe('L');
    expect(merged.color).toBe('red');
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
    const it1: Instance = { id: 'b3', label: '삭제', color: 'red' };
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
    const next = setMainField(INITIAL_DOC, 'color', 'green');
    const colors = next.instances.map((it) => mergeProps(next.main, it).color);
    expect(colors).toEqual(['green', 'green', 'red']);
  });

  it('입력을 고치지 않는다 (freeze)', () => {
    const frozen = deepFreeze<Doc>({ main: { ...INITIAL_DOC.main }, instances: INITIAL_DOC.instances.map((it) => ({ ...it })) });
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
    const frozen = deepFreeze<Doc>({ main: { ...INITIAL_DOC.main }, instances: INITIAL_DOC.instances.map((it) => ({ ...it })) });
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
    const changed = setMainField(reset, 'color', 'green');
    expect(mergeProps(changed.main, instanceOf(changed, 'b3')).color).toBe('green');
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
    const frozen = deepFreeze<Doc>({ main: { ...INITIAL_DOC.main }, instances: INITIAL_DOC.instances.map((it) => ({ ...it })) });
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
