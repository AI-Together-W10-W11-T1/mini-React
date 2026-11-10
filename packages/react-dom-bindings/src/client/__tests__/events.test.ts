import { describe, it, expect, vi, afterEach } from 'vitest';
import { setEventHandler } from '../events';

afterEach(() => vi.restoreAllMocks());

function click(element: Element): void {
  element.dispatchEvent(new Event('click', { bubbles: true }));
}

describe('setEventHandler — 리스너 하나 + 핸들러 교체 (결정 8 B)', () => {
  it('등록 뒤 click 한 번에 핸들러 한 번 호출', () => {
    const button = document.createElement('button');
    const handler = vi.fn();
    setEventHandler(button, 'click', handler);
    click(button);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toBeInstanceOf(Event);
  });

  it('핸들러를 여러 번 바꿔도 한 번 눌렀을 때 마지막 핸들러만 한 번 호출 (중복 없음, §6.2)', () => {
    const button = document.createElement('button');
    const handlers = Array.from({ length: 20 }, () => vi.fn());
    handlers.forEach((h) => setEventHandler(button, 'click', h));
    click(button);
    handlers.slice(0, -1).forEach((h) => expect(h).not.toHaveBeenCalled());
    expect(handlers[19]).toHaveBeenCalledTimes(1);
  });

  it('addEventListener는 요소 · 이벤트당 한 번만 (교체해도 다시 등록하지 않음)', () => {
    const button = document.createElement('button');
    const spy = vi.spyOn(button, 'addEventListener');
    const removeSpy = vi.spyOn(button, 'removeEventListener');
    for (let i = 0; i < 10; i++) setEventHandler(button, 'click', vi.fn());
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBe('click');
    expect(removeSpy).not.toHaveBeenCalled();
  });

  it('null이면 눌러도 아무 일 없고 오류도 없다 (핸들러만 비우고 리스너는 남김)', () => {
    const button = document.createElement('button');
    const handler = vi.fn();
    const removeSpy = vi.spyOn(button, 'removeEventListener');
    setEventHandler(button, 'click', handler);
    setEventHandler(button, 'click', null);
    expect(() => click(button)).not.toThrow();
    expect(handler).not.toHaveBeenCalled();
    expect(removeSpy).not.toHaveBeenCalled();
  });

  it('null 뒤 다시 핸들러를 붙이면 호출된다 (리스너는 한 번만 등록됨)', () => {
    const button = document.createElement('button');
    const spy = vi.spyOn(button, 'addEventListener');
    const first = vi.fn();
    const second = vi.fn();
    setEventHandler(button, 'click', first);
    setEventHandler(button, 'click', null);
    setEventHandler(button, 'click', second);
    click(button);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('등록한 적 없는 요소에 null을 주면 리스너를 만들지 않는다', () => {
    const button = document.createElement('button');
    const spy = vi.spyOn(button, 'addEventListener');
    setEventHandler(button, 'click', null);
    expect(spy).not.toHaveBeenCalled();
    expect(() => click(button)).not.toThrow();
  });

  it('다른 이벤트에 붙어 있는 요소에 click null을 먼저 줘도 이후 click 핸들러가 등록된다', () => {
    const input = document.createElement('input');
    const onClick = vi.fn();
    setEventHandler(input, 'input', vi.fn());
    setEventHandler(input, 'click', null);
    setEventHandler(input, 'click', onClick);
    click(input);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('click · input은 서로 독립', () => {
    const input = document.createElement('input');
    const onClick = vi.fn();
    const onInput = vi.fn();
    setEventHandler(input, 'click', onClick);
    setEventHandler(input, 'input', onInput);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onInput).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
    setEventHandler(input, 'click', null);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onInput).toHaveBeenCalledTimes(2);
  });

  it('요소 둘은 서로 독립', () => {
    const a = document.createElement('button');
    const b = document.createElement('button');
    const ha = vi.fn();
    const hb = vi.fn();
    setEventHandler(a, 'click', ha);
    setEventHandler(b, 'click', hb);
    click(a);
    expect(ha).toHaveBeenCalledTimes(1);
    expect(hb).not.toHaveBeenCalled();
    setEventHandler(a, 'click', null);
    click(b);
    expect(hb).toHaveBeenCalledTimes(1);
  });

  it('핸들러가 던진 예외는 삼키지 않고 위로 (리스너 함수를 직접 부르면 그대로 던짐)', () => {
    const button = document.createElement('button');
    const spy = vi.spyOn(button, 'addEventListener');
    setEventHandler(button, 'click', () => {
      throw new Error('핸들러 오류');
    });
    const listener = spy.mock.calls[0][1] as (event: Event) => void;
    expect(() => listener(new Event('click'))).toThrow('핸들러 오류');
  });

  it('지원 밖 이벤트 이름은 경고 1회 후 무시 (리스너를 만들지 않음)', () => {
    const div = document.createElement('div');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const spy = vi.spyOn(div, 'addEventListener');
    const handler = vi.fn();
    setEventHandler(div, 'mousedown', handler);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(spy).not.toHaveBeenCalled();
    div.dispatchEvent(new Event('mousedown'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('지원 밖 이벤트를 비우는(null) 호출은 조용히 무시', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    setEventHandler(document.createElement('div'), 'mousedown', null);
    expect(warn).not.toHaveBeenCalled();
  });

  it('요소가 화면에서 빠져도 엔진이 따로 치우지 않는다 (핸들러는 요소에 매인 WeakMap)', () => {
    const parent = document.createElement('div');
    const li = document.createElement('li');
    parent.appendChild(li);
    const handler = vi.fn();
    setEventHandler(li, 'click', handler);
    parent.removeChild(li);
    // 빠진 요소를 직접 눌러도 (다시 붙이지 않고) 그 요소의 핸들러가 그대로 있을 뿐 다른 곳에 새지 않는다
    click(li);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
