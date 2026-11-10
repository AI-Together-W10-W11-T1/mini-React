import { describe, it, expect, vi } from 'vitest';
import { scheduleRender } from '../scheduler';
import { NESTED_RENDER_LIMIT } from '@mini-react/shared';

describe('scheduleRender — 즉시 동기 실행 (알고리즘 결정 9 A)', () => {
  it('호출한 즉시 task가 한 번 실행되고 반환 전에 끝난다 (동기)', () => {
    const log: string[] = [];
    log.push('before');
    scheduleRender(() => log.push('task'));
    log.push('after');
    expect(log).toEqual(['before', 'task', 'after']);
  });

  it('task를 정확히 한 번만 부른다', () => {
    const task = vi.fn();
    scheduleRender(task);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('중첩 호출(task 안에서 다시 예약)은 안쪽이 먼저 끝난다', () => {
    const log: string[] = [];
    scheduleRender(() => {
      log.push('outer start');
      scheduleRender(() => log.push('inner'));
      log.push('outer end');
    });
    expect(log).toEqual(['outer start', 'inner', 'outer end']);
  });
});

describe('scheduleRender — 무한 렌더 안전장치 (중첩 깊이)', () => {
  /** depth번 중첩해 부르고 가장 안쪽에서 inner를 실행 */
  function nest(depth: number, inner: () => void): void {
    if (depth === 0) {
      inner();
      return;
    }
    scheduleRender(() => nest(depth - 1, inner));
  }

  it('NESTED_RENDER_LIMIT은 50', () => {
    expect(NESTED_RENDER_LIMIT).toBe(50);
  });

  it('깊이 50은 허용한다', () => {
    const inner = vi.fn();
    expect(() => nest(NESTED_RENDER_LIMIT, inner)).not.toThrow();
    expect(inner).toHaveBeenCalledTimes(1);
  });

  it('51째 중첩에서 오류가 난다 (문구에 "무한 렌더"와 한도 숫자)', () => {
    const inner = vi.fn();
    expect(() => nest(NESTED_RENDER_LIMIT + 1, inner)).toThrow(/무한 렌더/);
    expect(() => nest(NESTED_RENDER_LIMIT + 1, inner)).toThrow(String(NESTED_RENDER_LIMIT));
    expect(inner).not.toHaveBeenCalled();
  });

  it('task가 예외를 던져도 깊이가 복구되어 다음 예약이 정상이다', () => {
    expect(() =>
      scheduleRender(() => {
        throw new Error('렌더 실패');
      }),
    ).toThrow('렌더 실패');
    const inner = vi.fn();
    // 복구되지 않았다면 깊이 1이 남아 이 중첩 50이 한도를 넘는다
    expect(() => nest(NESTED_RENDER_LIMIT, inner)).not.toThrow();
    expect(inner).toHaveBeenCalledTimes(1);
  });

  it('한도 오류가 난 뒤에도 깊이가 복구된다 (앱이 죽지 않음)', () => {
    expect(() => nest(NESTED_RENDER_LIMIT + 5, () => {})).toThrow(/무한 렌더/);
    const inner = vi.fn();
    expect(() => nest(NESTED_RENDER_LIMIT, inner)).not.toThrow();
    expect(inner).toHaveBeenCalledTimes(1);
  });

  it('나란히(연달아 아닌) 호출 1000번은 오류가 없다 (중첩이 아님)', () => {
    const task = vi.fn();
    expect(() => {
      for (let i = 0; i < 1000; i++) scheduleRender(task);
    }).not.toThrow();
    expect(task).toHaveBeenCalledTimes(1000);
  });

  it('중첩 안쪽의 예외는 바깥으로 전달되고 바깥 깊이도 복구된다', () => {
    expect(() =>
      scheduleRender(() => {
        scheduleRender(() => {
          throw new Error('안쪽 실패');
        });
      }),
    ).toThrow('안쪽 실패');
    const inner = vi.fn();
    expect(() => nest(NESTED_RENDER_LIMIT, inner)).not.toThrow();
  });

  it('DOM 전역(document · window)이 없어도 동작한다 (scheduler는 DOM을 만지지 않음)', () => {
    vi.stubGlobal('document', undefined);
    vi.stubGlobal('window', undefined);
    try {
      const task = vi.fn();
      expect(() => scheduleRender(task)).not.toThrow();
      expect(task).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
