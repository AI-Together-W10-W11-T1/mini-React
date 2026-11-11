import { h, useState } from '@mini-react/react';
import type { VNode } from '@mini-react/shared';
import { Canvas } from './components/Canvas';
import { LayerPanel } from './components/LayerPanel';
import { PropertyPanel } from './components/PropertyPanel';
import { INITIAL_DOC, addInstance, moveInstance, reconcileSelection, removeInstance, resetInstanceField, setInstanceField, setMainField } from './model';
import type { Doc, Field, MainProps } from './model';
import { EMPTY_UNDO, recordEdit } from './undo';
import type { UndoGroup, UndoState } from './undo';

// [AI Note]: 루트 컴포넌트. 모든 useState(와 Dev-11의 useEffect)는 이 파일에서만 부른다 (MF-04 · P2-07 · P2-08).
// 자식(LayerPanel · Canvas · PropertyPanel)은 props만 받는 순수 함수이고, 바꾸고 싶은 것은 루트가 내려 주는 콜백 props로 알린다 (Lifting State Up).
// 상태 칸은 4개고 렌더마다 같은 순서로 부른다 (Hook 개수가 달라지면 엔진이 오류, dev_todo 공통 주의 9):
//   doc        = { main, instances } 한 칸 — Undo가 기록하는 것은 이것뿐
//   selectedId = 'main' | 인스턴스 id | null — 고르기는 Undo 기록 밖 (처음은 null, ④-2)
//   history    = Undo 기록 (undo.ts)
//   nextId     = 새 인스턴스 번호 — doc 밖에 둬서 Undo가 되돌리지 않는다 (b4 추가 → Undo → 다시 추가 = b5, Q17-3)
export function App(): VNode {
  const [doc, setDoc] = useState<Doc>(INITIAL_DOC);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<UndoState>(EMPTY_UNDO);
  const [nextId, setNextId] = useState(4);

  // [AI Note]: 모든 편집은 이 함수 하나를 거친다 — doc과 history를 같이 바꾼다 (한 동작의 setter 두 번 = 모아서 렌더 한 번, 결정 9 B).
  // next가 지금 doc과 같은 객체면(바뀐 것 없음) 어느 setter도 새 값을 못 받아 렌더 · 기록이 모두 안 일어난다.
  // group = 같은 대상 + 같은 칸 연달아 수정이면 한 단계로 묶는 기준, 추가 · 삭제 · 순서 · ↻는 null.
  const applyEdit = (next: Doc, group: UndoGroup | null): void => {
    if (next === doc) return;
    setHistory(recordEdit(history, doc, next, group));
    setDoc(next);
  };

  // [AI Note]: 고르기는 selectedId만 바꾼다 — applyEdit를 거치지 않으므로 doc · history가 그대로라 Undo 기록에 안 남는다 (MF-30 · ④-7).
  // 같은 것을 다시 고르면 같은 값(Object.is)이라 다시 그리지 않는다.
  const onSelect = (id: string): void => setSelectedId(id);

  // [AI Note]: 속성 패널 한 칸이 바뀌면 불린다. 고른 대상이 메인이면 setMainField, 인스턴스면 setInstanceField(그 칸에 키가 생겨 override) → applyEdit.
  // 묶음 기준 = 고른 대상('main' 또는 인스턴스 id) + 그 칸이라 같은 대상의 같은 칸이 연달아 바뀌면 한 단계가 된다. 같은 값이면 같은 Doc이라 렌더 · 기록이 없다.
  const onEdit = (field: Field, value: MainProps[Field]): void => {
    if (selectedId === null) return;
    const next = selectedId === 'main' ? setMainField(doc, field, value) : setInstanceField(doc, selectedId, field, value);
    applyEdit(next, { target: selectedId, field });
  };

  // [AI Note]: ↻ = 그 인스턴스의 그 칸 키를 지운다 (undefined를 넣지 않음) → 메인 값을 다시 따라간다. 추가 · 삭제 · 순서와 같이 묶음을 끝내는 한 단계(group = null).
  const onReset = (field: Field): void => {
    if (selectedId === null || selectedId === 'main') return;
    applyEdit(resetInstanceField(doc, selectedId, field), null);
  };

  // [AI Note]: [+ 인스턴스] = 번호 nextId로 끝에 붙이고(addInstance) nextId를 하나 올린다. 번호 칸은 doc 밖이라 Undo가 되돌리지 않는다 (Q17-3).
  // 한 동작의 setter 값은 모두 이 렌더의 doc · nextId에서 계산한다 (묶음 2 검수 NON-BLOCKING 4) → 렌더는 한 번.
  const onAdd = (): void => {
    applyEdit(addInstance(doc, nextId), null);
    setNextId(nextId + 1);
  };

  // [AI Note]: [↑] [↓] = 배열에서 그 인스턴스의 자리만 바꾼다(moveInstance). 선택은 id라서 순서가 바뀌어도 그대로다 (MF-26).
  // 경계(맨 위의 [↑] · 맨 아래의 [↓])는 같은 Doc → applyEdit가 렌더 · 기록 없이 돌려보낸다 (④-13). 새 단계 하나(묶음 끝).
  const onMove = (id: string, delta: -1 | 1): void => applyEdit(moveInstance(doc, id, delta), null);

  // [AI Note]: 고른 인스턴스 삭제 = 문서 · 선택 · 기록을 이 렌더의 doc 하나에서 계산해 한 번에 바꾼다 (setter 3개 → 렌더 1번, 결정 9 B).
  // 메인 · 선택 없음 · 이미 없는 id는 아무것도 안 함 (removeInstance가 같은 Doc을 돌려줌 → 렌더 · 기록 없음, MF-24).
  // 지운 것이 고른 것이므로 reconcileSelection이 null로 정리한다 (MF-23).
  const deleteSelected = (): void => {
    if (selectedId === null || selectedId === 'main') return;
    const next = removeInstance(doc, selectedId);
    if (next === doc) return;
    applyEdit(next, null);
    setSelectedId(reconcileSelection(selectedId, next));
  };

  return h(
    'div',
    { class: 'app' },
    h(LayerPanel, { main: doc.main, instances: doc.instances, selectedId, onSelect, onAdd, onMove }),
    h(Canvas, { main: doc.main, instances: doc.instances, selectedId, onSelect }),
    h(PropertyPanel, { main: doc.main, instances: doc.instances, selectedId, onEdit, onReset, onDelete: deleteSelected }),
  );
}
