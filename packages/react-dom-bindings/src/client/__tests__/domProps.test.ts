import { describe, it, expect, vi, afterEach } from 'vitest';
import { applyDomProp } from '../domProps';

afterEach(() => vi.restoreAllMocks());

describe('applyDomProp — value · checked를 프로퍼티로 (실제 값과 다를 때만)', () => {
  it('value를 프로퍼티로 넣는다 (속성은 만들지 않음)', () => {
    const input = document.createElement('input');
    applyDomProp(input, 'value', 'abc');
    expect(input.value).toBe('abc');
    expect(input.hasAttribute('value')).toBe(false);
  });

  it('실제 값과 같으면 대입하지 않는다 (setter 스파이)', () => {
    const input = document.createElement('input');
    input.value = 'hello';
    const setter = vi.spyOn(HTMLInputElement.prototype, 'value', 'set');
    applyDomProp(input, 'value', 'hello');
    expect(setter).not.toHaveBeenCalled();
    applyDomProp(input, 'value', 'hello!');
    expect(setter).toHaveBeenCalledTimes(1);
    expect(input.value).toBe('hello!');
  });

  it('같은 값이면 커서(selectionStart · selectionEnd)가 그대로다', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.value = 'hello world';
    input.setSelectionRange(3, 5);
    applyDomProp(input, 'value', 'hello world');
    expect(input.selectionStart).toBe(3);
    expect(input.selectionEnd).toBe(5);
    input.remove();
  });

  it('null이면 value는 빈 문자열로 둔다 (props에서 빠짐)', () => {
    const input = document.createElement('input');
    input.value = 'x';
    applyDomProp(input, 'value', null);
    expect(input.value).toBe('');
  });

  it('checked: true · false · 같은 값이면 대입하지 않음', () => {
    const box = document.createElement('input');
    box.type = 'checkbox';
    applyDomProp(box, 'checked', true);
    expect(box.checked).toBe(true);
    expect(box.hasAttribute('checked')).toBe(false);
    const setter = vi.spyOn(HTMLInputElement.prototype, 'checked', 'set');
    applyDomProp(box, 'checked', true);
    expect(setter).not.toHaveBeenCalled();
    applyDomProp(box, 'checked', false);
    expect(setter).toHaveBeenCalledTimes(1);
    expect(box.checked).toBe(false);
  });

  it('checked null은 false로', () => {
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = true;
    applyDomProp(box, 'checked', null);
    expect(box.checked).toBe(false);
  });

  it('textarea value도 같은 규칙', () => {
    const area = document.createElement('textarea');
    applyDomProp(area, 'value', 'a\nb');
    expect(area.value).toBe('a\nb');
  });
});
