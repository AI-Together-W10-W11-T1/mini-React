import { describe, expect, it } from 'vitest';
import { keyAction } from '../keys';
import type { KeyAction, KeyInfo } from '../keys';

/** 수정키가 없고 target이 입력칸이 아닌 기본 키 정보에서 필요한 것만 바꾼다 */
const press = (key: string, mods: Partial<KeyInfo> = {}): KeyInfo => ({
  key,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  targetTag: 'BODY',
  ...mods,
});

describe('keyAction — 정해진 키 (MF-33)', () => {
  it.each<[string, KeyInfo, KeyAction]>([
    ['Delete (수정키 없음)', press('Delete'), 'delete'],
    ['Backspace (수정키 없음)', press('Backspace'), 'delete'],
    ['Ctrl+z', press('z', { ctrlKey: true }), 'undo'],
    ['Meta+z (Cmd)', press('z', { metaKey: true }), 'undo'],
    ['Ctrl+Z (Caps Lock)', press('Z', { ctrlKey: true }), 'undo'],
    ['Ctrl+Shift+z', press('z', { ctrlKey: true, shiftKey: true }), 'redo'],
    ['Ctrl+Shift+Z (key가 대문자로 옴)', press('Z', { ctrlKey: true, shiftKey: true }), 'redo'],
    ['Meta+Shift+z', press('z', { metaKey: true, shiftKey: true }), 'redo'],
    ['Meta+Shift+Z (key가 대문자로 옴)', press('Z', { metaKey: true, shiftKey: true }), 'redo'],
    ['Ctrl+Meta+z (둘 다 눌림)', press('z', { ctrlKey: true, metaKey: true }), 'undo'],
    ['Ctrl+Meta+Shift+Z (둘 다 눌림)', press('Z', { ctrlKey: true, metaKey: true, shiftKey: true }), 'redo'],
  ])('%s → %s', (_name, info, expected) => {
    expect(keyAction(info)).toBe(expected);
  });
});

describe('keyAction — 정해진 키 밖은 null', () => {
  it.each<[string, KeyInfo]>([
    ['Ctrl+y', press('y', { ctrlKey: true })],
    ['Escape', press('Escape')],
    ['수정키 없는 z', press('z')],
    ['수정키 없는 Z', press('Z')],
    ['Shift+z 단독', press('Z', { shiftKey: true })],
    ['Alt+z', press('z', { altKey: true })],
    ['Ctrl+Alt+z', press('z', { ctrlKey: true, altKey: true })],
    ['Meta+Alt+z', press('z', { metaKey: true, altKey: true })],
    ['Ctrl+Alt+Shift+z', press('Z', { ctrlKey: true, altKey: true, shiftKey: true })],
    ['Enter', press('Enter')],
    ['a', press('a')],
    ['Ctrl+a', press('a', { ctrlKey: true })],
  ])('%s → null', (_name, info) => {
    expect(keyAction(info)).toBeNull();
  });
});

describe('keyAction — Delete · Backspace는 수정키가 하나도 없을 때만 (Q17-4)', () => {
  it.each<[string, KeyInfo]>([
    ['Shift+Delete', press('Delete', { shiftKey: true })],
    ['Ctrl+Delete', press('Delete', { ctrlKey: true })],
    ['Meta+Delete', press('Delete', { metaKey: true })],
    ['Alt+Delete', press('Delete', { altKey: true })],
    ['Shift+Backspace', press('Backspace', { shiftKey: true })],
    ['Ctrl+Backspace', press('Backspace', { ctrlKey: true })],
    ['Meta+Backspace', press('Backspace', { metaKey: true })],
    ['Alt+Backspace', press('Backspace', { altKey: true })],
    ['Ctrl+Shift+Delete', press('Delete', { ctrlKey: true, shiftKey: true })],
  ])('%s → null', (_name, info) => {
    expect(keyAction(info)).toBeNull();
  });
});

describe('keyAction — 입력칸 안의 키는 무시 (알고리즘: 입력칸 안 키 무시)', () => {
  const keys: [string, Partial<KeyInfo> & { key: string }][] = [
    ['Delete', { key: 'Delete' }],
    ['Backspace', { key: 'Backspace' }],
    ['Ctrl+z', { key: 'z', ctrlKey: true }],
    ['Meta+z', { key: 'z', metaKey: true }],
    ['Ctrl+Shift+Z', { key: 'Z', ctrlKey: true, shiftKey: true }],
    ['Meta+Shift+Z', { key: 'Z', metaKey: true, shiftKey: true }],
  ];

  describe.each(['INPUT', 'SELECT', 'TEXTAREA', 'input', 'select', 'textarea', 'Input'])('targetTag = %s', (tag) => {
    it.each(keys)('%s → null', (_name, info) => {
      expect(keyAction(press(info.key, { ...info, targetTag: tag }))).toBeNull();
    });
  });

  describe.each<[string, string | null]>([
    ['BUTTON', 'BUTTON'],
    ['DIV', 'DIV'],
    ['BODY', 'BODY'],
    ['없음(null)', null],
  ])('targetTag = %s (입력칸이 아니므로 처리)', (_label, tag) => {
    it('Delete → delete, Ctrl+z → undo, Ctrl+Shift+Z → redo', () => {
      expect(keyAction(press('Delete', { targetTag: tag }))).toBe('delete');
      expect(keyAction(press('z', { ctrlKey: true, targetTag: tag }))).toBe('undo');
      expect(keyAction(press('Z', { ctrlKey: true, shiftKey: true, targetTag: tag }))).toBe('redo');
    });
  });
});
