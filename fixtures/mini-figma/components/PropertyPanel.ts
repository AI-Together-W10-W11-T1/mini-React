import { h } from '@mini-react/react';
import type { Props, VNode } from '@mini-react/shared';
import { instanceName, isOverridden, mergeProps } from '../model';
import type { Color, Field, IconKind, Instance, MainProps, Size } from '../model';

interface PropertyPanelProps {
  main: MainProps;
  instances: readonly Instance[];
  selectedId: string | null;
  /** 한 칸의 값이 바뀌었다고 루트에 알린다 (루트가 고른 대상에 맞게 메인 · 인스턴스를 고친다) */
  onEdit: (field: Field, value: MainProps[Field]) => void;
  /** 인스턴스의 그 칸 override를 지운다 (↻). 메인에는 ↻가 없다 */
  onReset: (field: Field) => void;
}

const SIZE_OPTIONS: readonly (readonly [Size, string])[] = [['S', 'S'], ['M', 'M'], ['L', 'L']];
const ICON_OPTIONS: readonly (readonly [IconKind, string])[] = [['star', '★'], ['heart', '♥']];
const COLOR_OPTIONS: readonly (readonly [Color, string])[] = [['blue', '파랑'], ['red', '빨강'], ['green', '초록']];

/** 인스턴스를 골랐을 때만 쓰는 정보: 어느 칸이 override인가 + ↻ 누르기 */
interface OverrideInfo {
  readonly instance: Instance;
  readonly onReset: (field: Field) => void;
}

/**
 * 칸 하나: 이름 + 입력 부품 (+ 인스턴스면 ↻ 또는 「메인 따름」). 칸마다 data-field로 어느 칸인지 적는다.
 * [AI Note]: override인 칸 = 클래스 `override`(색 구분) + ↻ 버튼, 아닌 칸 = 「메인 따름」 글자 (MF-21). 판단은 model.isOverridden(키가 있는가)이다.
 * ↻ 버튼과 「메인 따름」은 같은 자리(3번째 자식)에 다른 태그로 와서 override가 생기고 사라질 때 그 자리만 교체되고 입력 부품은 그대로 남는다.
 */
function propRow(field: Field, name: string, control: VNode, override: OverrideInfo | null): VNode {
  const overridden = override !== null && isOverridden(override.instance, field);
  const tail =
    override === null
      ? null
      : overridden
        ? h('button', { type: 'button', class: 'prop-reset', 'aria-label': `${name} 되돌리기`, 'data-testid': 'prop-reset', onClick: () => override.onReset(field) }, '↻')
        : h('span', { class: 'prop-follow', 'data-testid': 'prop-follow' }, '메인 따름');
  return h(
    'div',
    { class: overridden ? 'prop-row override' : 'prop-row', 'data-field': field, 'data-testid': 'prop-row' },
    h('span', { class: 'prop-name' }, name),
    control,
    tail,
  );
}

// [AI Note]: 선택 상자 · 체크박스 · 글자 칸은 모두 `onInput`으로만 받는다 — 엔진 이벤트는 click · input뿐이고, 선택 상자를 onClick으로 받으면
// 열 때마다 불린다 (Chromium은 select · checkbox도 input 이벤트를 낸다, dev_todo 공통 주의 4). 값은 `value` / `checked` 프로퍼티로 그려서
// 입력칸을 다시 만들지 않고 그 자리에서 고친다 → 한 글자마다 바로 반영돼도 포커스 · 커서가 유지된다 (MF-15).
function propRows(values: MainProps, onEdit: PropertyPanelProps['onEdit'], override: OverrideInfo | null): VNode[] {
  const select = <T extends string>(field: Field, testId: string, label: string, current: T, options: readonly (readonly [T, string])[]): VNode =>
    propRow(
      field,
      label,
      h(
        'select',
        { 'aria-label': label, 'data-testid': testId, value: current, onInput: (event: Event) => onEdit(field, (event.target as HTMLSelectElement).value as MainProps[Field]) },
        options.map(([value, text]) => h('option', { value }, text)),
      ),
      override,
    );
  return [
    propRow(
      'label',
      '라벨',
      h('input', {
        type: 'text',
        'aria-label': '라벨',
        'data-testid': 'prop-label',
        value: values.label,
        onInput: (event: Event) => onEdit('label', (event.target as HTMLInputElement).value),
      }),
      override,
    ),
    select('size', 'prop-size', '크기', values.size, SIZE_OPTIONS),
    propRow(
      'hasIcon',
      '아이콘 보이기',
      h('input', {
        type: 'checkbox',
        'aria-label': '아이콘 보이기',
        'data-testid': 'prop-hasicon',
        checked: values.hasIcon,
        onInput: (event: Event) => onEdit('hasIcon', (event.target as HTMLInputElement).checked),
      }),
      override,
    ),
    select('icon', 'prop-icon', '아이콘 종류', values.icon, ICON_OPTIONS),
    select('color', 'prop-color', '색', values.color, COLOR_OPTIONS),
  ];
}

// [AI Note]: 속성 패널 — props만 받는 순수 함수. 아무것도 안 골랐으면 빈 상태 <p>, 골랐으면 머리 <h2> (「메인 Button」 / 「인스턴스 · 이름」) + 5칸.
// 같은 자리(패널의 0번 자식)에서 <p> ↔ <h2>로 태그가 달라서 고르기 · 삭제 때 엔진이 노드를 통째로 바꾼다 (D-05 REPLACE).
// 인스턴스 이름은 그 인스턴스의 지금 글자이고 빈 글자면 id (④-3). 인스턴스를 골랐을 때 칸에 보이는 값은 mergeProps(메인 값 위에 인스턴스 값) 결과다.
// 메인 · 인스턴스가 같은 5칸 부품을 쓰고, 인스턴스일 때만 칸마다 override 표시 + ↻가 붙는다.
export function PropertyPanel(props: Props): VNode {
  const { main, instances, selectedId, onEdit, onReset } = props as unknown as PropertyPanelProps;
  const target = selectedId === 'main' ? null : instances.find((it) => it.id === selectedId);
  const title = selectedId === 'main' ? '메인 Button' : target === undefined || target === null ? null : `인스턴스 · ${instanceName(main, target)}`;
  return h(
    'section',
    { class: 'property-panel', 'data-testid': 'property-panel' },
    title === null
      ? h('p', { class: 'property-empty', 'data-testid': 'property-empty' }, '캔버스나 레이어에서 하나를 골라 보세요')
      : h('h2', { class: 'property-title', 'data-testid': 'property-title' }, title),
    selectedId === 'main'
      ? h('div', { class: 'prop-rows', 'data-testid': 'prop-rows' }, propRows(main, onEdit, null))
      : target === undefined || target === null
        ? null
        : h('div', { class: 'prop-rows', 'data-testid': 'prop-rows' }, propRows(mergeProps(main, target), onEdit, { instance: target, onReset })),
  );
}
