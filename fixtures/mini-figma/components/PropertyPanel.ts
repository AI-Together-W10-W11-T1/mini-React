import { h } from '@mini-react/react';
import type { Props, VNode } from '@mini-react/shared';
import { instanceName, isOverridden, mergeProps } from '../model';
import type { Field, IconKind, Instance, MainProps, Size } from '../model';
import { ColorPalette } from './ColorPalette';

interface PropertyPanelProps {
  main: MainProps;
  instances: readonly Instance[];
  selectedId: string | null;
  /** 한 칸의 값이 바뀌었다고 루트에 알린다 (루트가 고른 대상에 맞게 메인 · 인스턴스를 고친다) */
  onEdit: (field: Field, value: MainProps[Field]) => void;
  /** 인스턴스의 그 칸 override를 지운다 (↻). 메인에는 ↻가 없다 */
  onReset: (field: Field) => void;
  /** 고른 인스턴스를 지운다 ([삭제]). 인스턴스를 골랐을 때만 버튼이 있다 */
  onDelete: () => void;
  /** 끝에 새 인스턴스를 붙인다 ([인스턴스 생성], MF-22). 메인을 골랐을 때만 버튼이 있다 */
  onAdd: () => void;
}

const SIZE_OPTIONS: readonly (readonly [Size, string])[] = [['S', 'S'], ['M', 'M'], ['L', 'L']];
const ICON_OPTIONS: readonly (readonly [IconKind, string])[] = [['star', '★'], ['heart', '♥']];

/** 인스턴스를 골랐을 때만 쓰는 정보: 어느 칸이 override인가 + ↻ 누르기 */
interface OverrideInfo {
  readonly instance: Instance;
  readonly onReset: (field: Field) => void;
}

/** ↻ 자리: 'inside' = 입력칸 · 선택 상자 안 오른쪽에 겹침, 'beside' = 체크박스 바로 옆, 'row' = 칸 끝(색 팔레트) */
type ResetPlace = 'inside' | 'beside' | 'row';

/**
 * 칸 하나: 이름 + 입력 부품 (+ 인스턴스의 override 칸이면 ↻). 칸마다 data-field로 어느 칸인지 적는다.
 * [AI Note]: override인 칸 = 클래스 `override`(입력 부품에 파랑 표시) + ↻ 버튼, 아닌 칸은 표시 없음 = 메인 따름 (MF-21, 「메인 따름」 글자는 없앰).
 * 판단은 model.isOverridden(키가 있는가)이다. ↻는 언제나 입력 부품 뒤 자리에 붙고 떨어지므로(INSERT · REMOVE) 입력 부품 노드는 그대로 남아 포커스 · 커서가 유지된다.
 * 색 칸만 ↻가 칸 끝(행의 3번째 자식)에 있고, 나머지는 입력 부품과 ↻를 `.prop-field`로 감싸 그 안에 둔다.
 */
function propRow(field: Field, name: string, control: VNode, override: OverrideInfo | null, place: ResetPlace = 'inside'): VNode {
  const overridden = override !== null && isOverridden(override.instance, field);
  const reset = overridden
    ? h('button', { type: 'button', class: 'prop-reset', 'aria-label': `${name} 되돌리기`, 'data-testid': 'prop-reset', onClick: () => override.onReset(field) }, '↻')
    : null;
  return h(
    'div',
    { class: overridden ? 'prop-row override' : 'prop-row', 'data-field': field, 'data-testid': 'prop-row' },
    h('span', { class: 'prop-name' }, name),
    place === 'row' ? control : h('span', { class: place === 'beside' ? 'prop-field prop-field-beside' : 'prop-field' }, control, reset),
    place === 'row' ? reset : null,
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
      'beside',
    ),
    select('icon', 'prop-icon', '아이콘 종류', values.icon, ICON_OPTIONS),
    // [AI Note]: 색 칸 = 팔레트 판(칩 8개 + 직접 고르기). 고른 색 `#rrggbb`를 그대로 onEdit('color', hex)로 올린다 — 다른 칸과 같은 경로 (FD-21 · 22 · 25).
    propRow('color', '색', h(ColorPalette, { value: values.color, onPick: (hex: string) => onEdit('color', hex) }), override, 'row'),
  ];
}

// [AI Note]: 속성 패널 — props만 받는 순수 함수. 아무것도 안 골랐으면 빈 상태 <p>, 골랐으면 머리 <h2> (「메인 Button」 / 「인스턴스 · 이름」) + 5칸.
// 같은 자리(패널의 0번 자식)에서 <p> ↔ <h2>로 태그가 달라서 고르기 · 삭제 때 엔진이 노드를 통째로 바꾼다 (D-05 REPLACE).
// 인스턴스 이름은 그 인스턴스의 지금 글자이고 빈 글자면 id (④-3). 인스턴스를 골랐을 때 칸에 보이는 값은 mergeProps(메인 값 위에 인스턴스 값) 결과다.
// 메인 · 인스턴스가 같은 5칸 부품을 쓰고, 인스턴스의 override 칸에만 파랑 표시 + ↻가 붙는다.
export function PropertyPanel(props: Props): VNode {
  const { main, instances, selectedId, onEdit, onReset, onDelete, onAdd } = props as unknown as PropertyPanelProps;
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
    // [AI Note]: 패널 오른쪽 아래 버튼 자리 하나 — 메인을 고르면 [인스턴스 생성], 인스턴스를 고르면 [삭제](MF-24, 메인은 못 지움), 아무것도 안 골랐으면 없음.
    // 두 버튼은 같은 자리 · 같은 태그라 메인 ↔ 인스턴스로 고르기를 바꾸면 엔진이 노드를 다시 만들지 않고 속성 · 글자 · 핸들러만 고친다.
    title === null
      ? null
      : h(
          'div',
          { class: 'property-actions' },
          selectedId === 'main'
            ? h('button', { type: 'button', class: 'btn-primary add-instance', 'data-testid': 'add-instance', onClick: () => onAdd() }, '인스턴스 생성')
            : h('button', { type: 'button', class: 'delete-instance', 'data-testid': 'delete-instance', onClick: () => onDelete() }, '삭제'),
        ),
  );
}
