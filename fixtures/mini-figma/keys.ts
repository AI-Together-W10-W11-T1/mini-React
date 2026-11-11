// [AI Note]: 키 판정 순수 함수. DOM 이벤트가 아니라 평범한 객체를 받으므로 document · window · Hook이 없다.
// App이 KeyboardEvent를 이 모양(KeyInfo)으로 바꿔 넘기고, 돌려받은 동작(KeyAction)만 실행한다.

/** App이 KeyboardEvent에서 뽑아 넘기는 값. targetTag = event.target의 tagName (없으면 null) */
export interface KeyInfo {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly targetTag: string | null;
}

export type KeyAction = 'delete' | 'undo' | 'redo';

/** 입력칸에서는 브라우저 기본 동작(글자 지우기 · 글자 되돌리기)을 그대로 둔다 → 앱 단축키는 무시 */
const TEXT_FIELD_TAGS: ReadonlySet<string> = new Set(['INPUT', 'SELECT', 'TEXTAREA']);

/**
 * 누른 키 → 앱 동작. 정해진 키 밖이면 null.
 * - Delete · Backspace: Ctrl · Meta · Alt · Shift가 하나도 없을 때만 'delete' (Q17-4)
 * - Ctrl/Meta + z → 'undo', Ctrl/Meta + Shift + z(`key`가 'Z'로 와도) → 'redo'. Alt가 있으면 무시
 * - 입력칸(INPUT · SELECT · TEXTAREA, 대소문자 무관) 안의 키는 전부 null
 */
export function keyAction(info: KeyInfo): KeyAction | null {
  if (info.targetTag !== null && TEXT_FIELD_TAGS.has(info.targetTag.toUpperCase())) return null;

  const anyModifier = info.ctrlKey || info.metaKey || info.altKey || info.shiftKey;
  if (info.key === 'Delete' || info.key === 'Backspace') return anyModifier ? null : 'delete';

  if (info.key.toLowerCase() === 'z' && (info.ctrlKey || info.metaKey) && !info.altKey) {
    return info.shiftKey ? 'redo' : 'undo';
  }
  return null;
}
