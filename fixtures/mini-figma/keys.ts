// [AI Note]: 키 판정 순수 함수. DOM 이벤트가 아니라 평범한 객체를 받으므로 document · window · Hook이 없다.
// App이 KeyboardEvent를 이 모양(KeyInfo)으로 바꿔 넘기고, 돌려받은 동작(KeyAction)만 실행한다.

/**
 * App이 KeyboardEvent에서 뽑아 넘기는 값.
 * targetTag = event.target의 tagName (없으면 null), targetType = 그 target이 `<input>`일 때의 type (아니면 null)
 */
export interface KeyInfo {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly targetTag: string | null;
  readonly targetType: string | null;
}

// [AI Note]: back / forward = 실제 영역 State History 뒤로 · 앞으로 (task_006에서 앱 편집 Undo/Redo의 자리를 이어받음)
export type KeyAction = 'delete' | 'back' | 'forward';

/** type이 checkbox · color인 `<input>`인가 = 글자를 치는 칸이 아닌 입력 부품 */
function isNonTextInput(tag: string, type: string | null): boolean {
  const t = (type ?? '').toLowerCase();
  return tag === 'INPUT' && (t === 'checkbox' || t === 'color');
}

/** 대상이 글자 입력칸인가: `<textarea>`, 그리고 checkbox · color가 아닌 `<input>`. 여기서는 브라우저 기본 동작(글자 지우기 · 글자 되돌리기)을 그대로 둔다 → 앱 키 전부 무시 (Q18 ③) */
function isTextField(tag: string, type: string | null): boolean {
  return tag === 'TEXTAREA' || (tag === 'INPUT' && !isNonTextInput(tag, type));
}

/**
 * 대상이 선택 상자 · 체크박스 · 색 입력칸인가. 글자 입력이 없으므로 뒤로 · 앞으로 키는 앱이 맡되 Delete · Backspace는 무시 (Q18 ②).
 * [AI Note]: 색 입력칸(`<input type="color">`)은 ④-3으로 여기에 넣었다 — 안 넣으면 글자 칸으로 취급돼 색 입력칸에 포커스가 있을 때(칩을 누른 직후 등) Ctrl+Z가 아무 일도 안 한다.
 */
function isChoiceControl(tag: string, type: string | null): boolean {
  return tag === 'SELECT' || isNonTextInput(tag, type);
}

/**
 * 누른 키 → 앱 동작. 정해진 키 밖이면 null.
 * - Delete · Backspace: Ctrl · Meta · Alt · Shift가 하나도 없을 때만 'delete' (Q17-4). 입력칸 · 선택 상자 · 체크박스 · 색 입력칸 안에서는 null
 * - Ctrl/Meta + z → 'back', Ctrl/Meta + Shift + z(`key`가 'Z'로 와도) → 'forward'. Alt가 있으면 무시
 * - 글자 입력칸(글자 input · textarea) 안의 키는 전부 null (Q18 ③). 선택 상자 · 체크박스 · 색 입력칸 안은 뒤로 · 앞으로만 처리 (Q18 ②, ④-3)
 */
export function keyAction(info: KeyInfo): KeyAction | null {
  const tag = info.targetTag?.toUpperCase() ?? null;
  if (tag !== null && isTextField(tag, info.targetType)) return null;

  const anyModifier = info.ctrlKey || info.metaKey || info.altKey || info.shiftKey;
  if (info.key === 'Delete' || info.key === 'Backspace') {
    if (tag !== null && isChoiceControl(tag, info.targetType)) return null;
    return anyModifier ? null : 'delete';
  }

  if (info.key.toLowerCase() === 'z' && (info.ctrlKey || info.metaKey) && !info.altKey) {
    return info.shiftKey ? 'forward' : 'back';
  }
  return null;
}
