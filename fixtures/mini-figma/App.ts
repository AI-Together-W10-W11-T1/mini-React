import { h, useEffect, useMemo, useState } from '@mini-react/react';
import type { VNode } from '@mini-react/shared';
import { Canvas } from './components/Canvas';
import { LayerPanel } from './components/LayerPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { PropertyPanel } from './components/PropertyPanel';
import { Toolbar } from './components/Toolbar';
import { INITIAL_DOC, addInstance, moveInstance, reconcileSelection, removeInstance, resetInstanceField, setInstanceField, setMainField, setVariableValue } from './model';
import type { Doc, Field, MainProps } from './model';
import { keyAction } from './keys';
import { createPreview } from './preview';
import type { Preview } from './preview';
import { INITIAL_NAV, canBack, canForward } from './previewNav';
import type { PreviewNav } from './previewNav';
import { initialTrack, trackBack, trackDoc, trackForward, trackPush } from './previewDocs';
import type { DocTrack } from './previewDocs';

// [AI Note]: 루트 컴포넌트. 모든 useState · useEffect · useMemo는 이 파일에서만 부른다 (MF-04 · P2-07 · P2-08).
// 자식(Toolbar · LayerPanel · Canvas · PropertyPanel)은 props만 받는 순수 함수이고, 바꾸고 싶은 것은 루트가 내려 주는 콜백 props로 알린다 (Lifting State Up).
// 상태 칸은 3개(+ 실제 영역용 3칸 + keydown effect 1칸 + 레이어 펼침 1칸, 아래)고 렌더마다 같은 순서로 부른다 (Hook 개수가 달라지면 엔진이 오류, dev_todo 공통 주의 9):
//   doc        = { main, instances, variables } 한 칸
//   selectedId = 'main' | 인스턴스 id | null (처음은 null, ④-2)
//   nextId     = 새 인스턴스 번호 — 지운 번호를 다시 쓰지 않는다 (b4 추가 → 삭제 → 다시 추가 = b5, Q17-3)
// patch-preview(task_006)에서 앱 편집 Undo/Redo(history 칸 · undo.ts)를 없앴다: Ctrl/Cmd+Z · Shift+Z는 이제 실제 영역 State History의 [실행 취소] · [다시 실행]다.
// PP-06 변경: [실행 취소] · [다시 실행]은 실제 영역과 함께 테스트 영역(doc)도 그 칸 상태로 되돌린다 (PRD T-08, Phase 1과 같은 약속). 칸마다 그때의 doc 사본을 previewDocs의 DocTrack이 들고 있다.
export function App(): VNode {
  const [doc, setDoc] = useState<Doc>(INITIAL_DOC);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nextId, setNextId] = useState(4);

  // [AI Note]: 모든 편집은 이 함수 하나를 거친다 — doc을 바꾼다. next가 지금 doc과 같은 객체면(바뀐 것 없음) setter가 새 값을 못 받아 렌더가 안 일어난다.
  const applyEdit = (next: Doc): void => {
    if (next === doc) return;
    setDoc(next);
  };

  // [AI Note]: 고르기는 selectedId만 바꾼다 — applyEdit를 거치지 않으므로 doc이 그대로다 (MF-30 · ④-7).
  // 같은 것을 다시 고르면 같은 값(Object.is)이라 다시 그리지 않는다.
  const onSelect = (id: string): void => setSelectedId(id);

  // [AI Note]: 속성 패널 한 칸이 바뀌면 불린다. 고른 대상이 메인이면 setMainField, 인스턴스면 setInstanceField(그 칸에 키가 생겨 override) → applyEdit.
  // 같은 값이면 같은 Doc이라 applyEdit가 렌더 없이 돌려보낸다. (앱 편집 Undo의 묶음 규칙은 task_006에서 없앴다)
  const onEdit = (field: Field, value: MainProps[Field]): void => {
    if (selectedId === null) return;
    const next = selectedId === 'main' ? setMainField(doc, field, value) : setInstanceField(doc, selectedId, field, value);
    applyEdit(next);
  };

  // [AI Note]: 변수 값 바꾸기(task_007) = setVariableValue → applyEdit. 새 Hook 칸 없이 doc 안의 variables만 바뀐다. 같은 값 · 없는 id면 같은 Doc이라 렌더 없음. 한 동작 = setter 하나 = 렌더 1번.
  const onVariableChange = (id: string, value: string): void => applyEdit(setVariableValue(doc, id, value));

  // [AI Note]: ↻ = 그 인스턴스의 그 칸 키를 지운다 (undefined를 넣지 않음) → 메인 값을 다시 따라간다.
  const onReset = (field: Field): void => {
    if (selectedId === null || selectedId === 'main') return;
    applyEdit(resetInstanceField(doc, selectedId, field));
  };

  // [AI Note]: [+ 인스턴스] = 번호 nextId로 끝에 붙이고(addInstance) nextId를 하나 올린다. 번호 칸은 doc 밖이라 삭제해도 지운 번호를 다시 쓰지 않는다 (Q17-3).
  // 한 동작의 setter 값은 모두 이 렌더의 doc · nextId에서 계산한다 (묶음 2 검수 NON-BLOCKING 4) → 렌더는 한 번.
  const onAdd = (): void => {
    applyEdit(addInstance(doc, nextId));
    setNextId(nextId + 1);
  };

  // [AI Note]: [↑] [↓] = 배열에서 그 인스턴스의 자리만 바꾼다(moveInstance). 선택은 id라서 순서가 바뀌어도 그대로다 (MF-26).
  // 경계(맨 위의 [↑] · 맨 아래의 [↓])는 같은 Doc → applyEdit가 렌더 없이 돌려보낸다 (④-13).
  const onMove = (id: string, delta: -1 | 1): void => applyEdit(moveInstance(doc, id, delta));

  // [AI Note]: 고른 인스턴스 삭제 = 문서 · 선택을 이 렌더의 doc 하나에서 계산해 한 번에 바꾼다 (결정 9 B: 렌더 1번).
  // 메인 · 선택 없음 · 이미 없는 id는 아무것도 안 함 (removeInstance가 같은 Doc을 돌려줌 → 렌더 없음, MF-24).
  // 지운 것이 고른 것이므로 reconcileSelection이 null로 정리한다 (MF-23).
  const deleteSelected = (): void => {
    if (selectedId === null || selectedId === 'main') return;
    const next = removeInstance(doc, selectedId);
    if (next === doc) return;
    applyEdit(next);
    setSelectedId(reconcileSelection(selectedId, next));
  };

  // [AI Note]: 실제 영역(patch-preview, PP-09) — 칸 순서: [0] doc · [1] selectedId · [2] nextId 다음에 아래 세 칸, 그다음 [6] keydown effect, 맨 끝 [7] 레이어 펼침 (전체 8칸).
  //   [3] useMemo = 보관함: 한 번 만들어 계속 쓰는 같은 객체. 안에 createPreview 결과를 넣어 두는 자리이고 setter가 없어 바꿔도 렌더가 안 일어난다 (엔진에 useRef가 없어서 이렇게 한다)
  //   [4] useEffect([]) = 마운트 patch 직후 한 번: DOM에서 테스트 영역 · 실제 영역 상자 · 깜빡임 층을 찾아 createPreview를 만든다 (렌더 중에는 DOM이 아직 없다). cleanup = 보관함 비움
  //   [5] useState(nav) = 실행 취소 · 다시 실행 가능 여부 (App state, PP-09). 렌더 중 canBack · canForward로 계산해 Toolbar의 [실행 취소] [다시 실행]에 내려 준다
  //       보관함에는 `track`(기록 칸마다의 doc 사본)도 함께 둔다 — 새 Hook 칸 없이 7칸 그대로. state가 아니라 상자에 두는 이유: 같은 틱 연타에서 렌더 클로저 값이 낡아도 핸들러가 늘 동기로 최신 칸을 읽고 쓰게 하려고 (Dev-5 함수형 setter 연타와 같은 목적)
  const vault = useMemo<{ preview: Preview | null; track: DocTrack }>(() => ({ preview: null, track: initialTrack(INITIAL_DOC) }), []);
  useEffect(() => {
    const testArea = document.querySelector('[data-testid="canvas"]');
    const realArea = document.querySelector<HTMLElement>('[data-testid="real-area"]');
    const overlayLayer = document.querySelector<HTMLElement>('[data-testid="real-overlay"]');
    if (testArea === null || realArea === null || overlayLayer === null) return;
    vault.preview = createPreview({ testArea, realArea, overlayLayer });
    return () => {
      vault.preview = null;
    };
  }, []);
  const [nav, setNav] = useState<PreviewNav>(INITIAL_NAV);

  // [AI Note]: [Patch] = 실제 영역에 지금 테스트 영역 모습을 반영하고, **기록이 실제로 쌓였을 때만** 이 렌더의 doc(= Patch가 읽은 테스트 영역 DOM을 그린 바로 그 값)을 칸 사본으로 보관한다.
  // 무변경 Patch(false)는 기록도 사본도 안 쌓는다. nav(state)는 버튼 꺼짐 계산용으로 보관함 track의 nav와 맞춘다 — 같은 객체면 렌더 0번.
  const onPreviewPatch = (): void => {
    if (vault.preview?.patch()) {
      vault.track = trackPush(vault.track, doc);
      setNav(vault.track.nav);
    }
  };

  // [AI Note]: [실행 취소] · [다시 실행] = 실제 영역 기록을 움직이고(PP-06), 성공하면 **테스트 영역 doc도 그 칸 사본으로 되돌린다** (PP-06 변경, T-08).
  //   ① doc만 되돌림 (setDoc) — Patch 안 한 편집은 이 setDoc이 덮어써서 버려진다 (사용자 결정 ④)
  //   ② selectedId는 그대로 두되, 되돌린 doc에 없는 인스턴스면 reconcileSelection이 null로 푼다 (MF-23). 함수형 setter라 같은 틱에 고른 것도 안 놓친다
  //   ③ nextId는 setter 자체를 안 부른다 — 지운 번호를 다시 쓰지 않는다 (Q17-3)
  // 경계(처음 · 끝)에서는 track이 같은 객체라 아무것도 안 한다 (꺼진 버튼 · 단축키로는 편집을 못 버림, 명세 「처음 · 끝에서는 꺼짐」 우선). setter 여러 개는 결정 9 B 배칭으로 렌더 1번.
  const moveTo = (next: DocTrack): void => {
    vault.track = next;
    const target = trackDoc(next);
    setDoc(target);
    setSelectedId((prev) => reconcileSelection(prev, target));
    setNav(next.nav);
  };
  const onPreviewBack = (): void => {
    const next = trackBack(vault.track);
    if (next === vault.track || !vault.preview?.back()) return;
    moveTo(next);
  };
  const onPreviewForward = (): void => {
    const next = trackForward(vault.track);
    if (next === vault.track || !vault.preview?.forward()) return;
    moveTo(next);
  };

  // [AI Note]: 키보드 = 마운트 때 한 번이 아니라 "핸들러가 읽는 state가 바뀔 때마다" document에 다시 등록한다 (엔진 이벤트는 click · input뿐이라 keydown은 직접 등록, MF-34).
  // deps에 doc · selectedId를 넣어서 핸들러가 늘 이번 렌더의 값을 본다 — 빠지면 "b1을 고르고 b2를 고른 뒤 Delete"가 옛 선택 b1을 지운다.
  // 다시 등록하기 전 cleanup이 먼저 removeEventListener를 불러서 리스너는 항상 1개다 (등록 − 해제 = 1). unmount() 때도 cleanup이 돈다.
  // Ctrl/Cmd+Z = 실제 영역 [실행 취소], Ctrl/Cmd+Shift+Z = [다시 실행] (앱 편집 Undo는 없앴다, task_006). 두 핸들러는 함수형 setter + 보관함을 써서 옛 state를 안 읽는다(deps 불필요).
  // 실행 취소 · 다시 실행 키는 preventDefault로 브라우저 기본 Undo/Redo를 막는다 (Q18): 처음 · 끝이라 움직일 게 없어도 막는다. 안 막으면 브라우저 글자 되돌리기가 남은 라벨 칸에 겹쳐 적용된다.
  // 라벨 글자 칸(글자 input · textarea) 안 키(action null)와 Delete · Backspace는 막지 않는다. 입력칸 안의 키 · 수정키 규칙은 keys.ts의 keyAction이 정한다.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target as Element | null;
      const action = keyAction({
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        targetTag: target?.tagName ?? null,
        targetType: target instanceof HTMLInputElement ? target.type : null,
      });
      if (action === 'delete') {
        deleteSelected();
      } else if (action === 'back') {
        event.preventDefault();
        onPreviewBack();
      } else if (action === 'forward') {
        event.preventDefault();
        onPreviewForward();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [doc, selectedId]);

  // [AI Note]: [7] useState = 레이어 창의 인스턴스 목록 펼침 여부 (처음 펼침). 맨 끝 칸이라 앞 칸 번호 [0] ~ [6]은 그대로다.
  // 접혀 있어도 인스턴스를 고르거나 [인스턴스 생성]을 누르면 펼친다 — 고른 행 · 새 행이 숨지 않게. setter가 같은 틱에 모여 렌더는 여전히 1번(결정 9 B),
  // 이미 펼침이면 같은 값(Object.is)이라 렌더를 더 만들지 않는다. 메인을 고를 때는 펼침을 건드리지 않는다.
  const [layersOpen, setLayersOpen] = useState(true);
  const onToggleLayers = (): void => setLayersOpen(!layersOpen);
  const selectAndReveal = (id: string): void => {
    onSelect(id);
    if (id !== 'main') setLayersOpen(true);
  };
  const addAndReveal = (): void => {
    onAdd();
    setLayersOpen(true);
  };

  return h(
    'div',
    { class: 'app' },
    // [AI Note]: 자식 순서 = 도구 막대(0) · 레이어(1) · 캔버스(2) · 속성(3). 이 순서가 엔진 patch 경로 접두 [0,0] ~ [0,3]이 된다 (FD-10)
    h(Toolbar, { canBack: canBack(nav), canForward: canForward(nav), onBack: onPreviewBack, onForward: onPreviewForward, onPatch: onPreviewPatch }),
    h(LayerPanel, { main: doc.main, instances: doc.instances, selectedId, open: layersOpen, onToggle: onToggleLayers, onSelect: selectAndReveal, onMove, variables: doc.variables, onVariableChange }),
    h(Canvas, { main: doc.main, instances: doc.instances, variables: doc.variables, selectedId, onSelect: selectAndReveal }),
    // [인스턴스 생성]은 속성 패널 오른쪽 아래(메인을 골랐을 때)에 있다 — [삭제]와 같은 자리
    h(PropertyPanel, { main: doc.main, instances: doc.instances, variables: doc.variables, selectedId, onEdit, onReset, onDelete: deleteSelected, onAdd: addAndReveal }),
    // 실제 영역 구역 = 5번째 자식 [0,4]. DOM 순서는 맨 끝, 자리는 CSS로 정한다 (앞 네 개의 경로 접두 [0,0] ~ [0,3]은 그대로)
    h(PreviewPanel, {}),
  );
}
