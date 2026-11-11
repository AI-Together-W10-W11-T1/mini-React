import { h, useState } from '@mini-react/react';
import type { VNode } from '@mini-react/shared';
import { Canvas } from './components/Canvas';
import { LayerPanel } from './components/LayerPanel';
import { PropertyPanel } from './components/PropertyPanel';
import { INITIAL_DOC } from './model';
import type { Doc } from './model';
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
  // Dev-5 시점에는 selectedId · nextId · applyEdit가 아직 쓰이지 않는다. 고르기는 Dev-6, 편집은 Dev-7 ~ 8, 추가는 Dev-9에서 연결한다.

  // [AI Note]: 모든 편집은 이 함수 하나를 거친다 — doc과 history를 같이 바꾼다 (한 동작의 setter 두 번 = 모아서 렌더 한 번, 결정 9 B).
  // next가 지금 doc과 같은 객체면(바뀐 것 없음) 어느 setter도 새 값을 못 받아 렌더 · 기록이 모두 안 일어난다.
  // group = 같은 대상 + 같은 칸 연달아 수정이면 한 단계로 묶는 기준, 추가 · 삭제 · 순서 · ↻는 null (Dev-7부터 쓴다).
  const applyEdit = (next: Doc, group: UndoGroup | null): void => {
    if (next === doc) return;
    setHistory(recordEdit(history, doc, next, group));
    setDoc(next);
  };

  return h(
    'div',
    { class: 'app' },
    h(LayerPanel, { main: doc.main, instances: doc.instances }),
    h(Canvas, { main: doc.main, instances: doc.instances }),
    h(PropertyPanel, {}),
  );
}
