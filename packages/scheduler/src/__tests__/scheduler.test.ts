import { afterEach, describe, it, expect, vi } from 'vitest';
import { scheduleRender, setRenderErrorHandler } from '../scheduler';
import { NESTED_RENDER_LIMIT } from '@mini-react/shared';
import { flush } from '../../../shared/src/__tests__/helpers';

// [AI Note]: 마이크로태스크 Batching (알고리즘 결정 9 B). 오류는 마이크로태스크 안에서 나므로 호출한 쪽에서 잡을 수 없다 —
// 테스트는 setRenderErrorHandler로 오류를 모아 확인하고, 매 테스트가 끝나면 기본(다시 던지기)으로 되돌린다.
const errors: unknown[] = [];
function collectErrors(): void {
  errors.length = 0;
  setRenderErrorHandler((error) => void errors.push(error));
}
afterEach(() => {
  setRenderErrorHandler(null);
  errors.length = 0;
});

describe('scheduleRender — 마이크로태스크 예약 (알고리즘 결정 9 B)', () => {
  it('호출 직후에는 task가 돌지 않고, 지금 실행 중인 코드가 끝난 직후(마이크로태스크)에 한 번 돈다', async () => {
    const log: string[] = [];
    log.push('before');
    scheduleRender({}, () => log.push('task'));
    log.push('after');
    expect(log).toEqual(['before', 'after']);
    await Promise.resolve(); // 마이크로태스크 한 번이면 충분하다 (setTimeout 같은 매크로태스크가 아님)
    expect(log).toEqual(['before', 'after', 'task']);
  });

  it('같은 틱에 같은 owner로 여러 번 예약해도 task는 1번만 돈다', async () => {
    const owner = {};
    const task = vi.fn();
    for (let i = 0; i < 10; i++) scheduleRender(owner, task);
    expect(task).not.toHaveBeenCalled();
    await flush();
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('owner(컴포넌트)가 다르면 각자 1번씩 돈다 (예약 순서대로)', async () => {
    const log: string[] = [];
    const a = {};
    const b = {};
    scheduleRender(a, () => log.push('a'));
    scheduleRender(b, () => log.push('b'));
    scheduleRender(a, () => log.push('a2'));
    await flush();
    expect(log).toEqual(['a', 'b']);
  });

  it('돈 뒤에는 다시 예약할 수 있다 (틱마다 1번)', async () => {
    const owner = {};
    const task = vi.fn();
    scheduleRender(owner, task);
    await flush();
    scheduleRender(owner, task);
    scheduleRender(owner, task);
    await flush();
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('task 안에서(effect처럼) 같은 owner를 다시 예약하면 새 렌더가 따로 돈다 (돌기 전에 예약 표시를 지운다)', async () => {
    const owner = {};
    const log: string[] = [];
    scheduleRender(owner, () => {
      log.push('first');
      scheduleRender(owner, () => log.push('second'));
    });
    await flush();
    expect(log).toEqual(['first', 'second']);
  });

  it('task가 던져도 오류 처리 함수로 가고, 같은 owner의 다음 예약은 정상이다 (예약 표시 복구)', async () => {
    collectErrors();
    const owner = {};
    scheduleRender(owner, () => {
      throw new Error('렌더 실패');
    });
    await flush();
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('렌더 실패');
    const task = vi.fn();
    scheduleRender(owner, task);
    await flush();
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('한 owner의 task가 던져도 다른 owner의 task는 그대로 돈다', async () => {
    collectErrors();
    const ran = vi.fn();
    scheduleRender({}, () => {
      throw new Error('a 실패');
    });
    scheduleRender({}, ran);
    await flush();
    expect(ran).toHaveBeenCalledTimes(1);
    expect(errors).toHaveLength(1);
  });

  /** queueMicrotask를 가로채 예약된 마이크로태스크를 직접 돌려 본다 (던져진 오류가 그대로 나오는지 보려고) */
  function withManualMicrotasks(body: (runAll: () => void) => void): void {
    const queued: (() => void)[] = [];
    vi.stubGlobal('queueMicrotask', (callback: () => void) => void queued.push(callback));
    try {
      body(() => queued.splice(0).forEach((callback) => callback()));
    } finally {
      vi.unstubAllGlobals();
    }
  }

  it('오류 처리 함수를 지정하지 않으면(기본) 오류를 삼키지 않고 마이크로태스크에서 그대로 다시 던진다', () => {
    withManualMicrotasks((runAll) => {
      scheduleRender({}, () => {
        throw new Error('그대로 던짐');
      });
      expect(runAll).toThrow('그대로 던짐');
    });
  });

  it('오류 처리 함수가 던지면 그 오류가 마이크로태스크에서 나가고, 그 뒤 예약도 정상이다', () => {
    withManualMicrotasks((runAll) => {
      setRenderErrorHandler((error) => {
        throw new Error(`처리 중: ${(error as Error).message}`);
      });
      const owner = {};
      scheduleRender(owner, () => {
        throw new Error('원래 오류');
      });
      expect(runAll).toThrow('처리 중: 원래 오류');
      setRenderErrorHandler(null);
      const task = vi.fn();
      scheduleRender(owner, task); // 같은 owner의 예약 표시도 복구돼 있다
      runAll();
      expect(task).toHaveBeenCalledTimes(1);
    });
  });

  it('setRenderErrorHandler(null)로 기본 처리 함수(다시 던지기)로 되돌린다', () => {
    withManualMicrotasks((runAll) => {
      const mine = vi.fn();
      setRenderErrorHandler(mine);
      setRenderErrorHandler(null);
      scheduleRender({}, () => {
        throw new Error('x');
      });
      expect(runAll).toThrow('x');
      expect(mine).not.toHaveBeenCalled();
    });
  });
});

describe('scheduleRender — 무한 렌더 안전장치 (연달아 50번)', () => {
  /** 한 owner가 count번까지 연달아(렌더 안에서 다음 렌더를 예약) 렌더한다 */
  async function chainOf(count: number): Promise<number> {
    const owner = {};
    let runs = 0;
    const step = (): void => {
      runs++;
      if (runs < count) scheduleRender(owner, step);
    };
    scheduleRender(owner, step);
    await flush();
    return runs;
  }

  it('NESTED_RENDER_LIMIT은 50', () => {
    expect(NESTED_RENDER_LIMIT).toBe(50);
  });

  it('연달아 50번은 허용한다', async () => {
    collectErrors();
    expect(await chainOf(NESTED_RENDER_LIMIT)).toBe(NESTED_RENDER_LIMIT);
    expect(errors).toEqual([]);
  });

  it('연달아 51번째 렌더는 돌지 않고 오류가 난다 (문구에 "무한 렌더"와 한도 숫자)', async () => {
    collectErrors();
    expect(await chainOf(NESTED_RENDER_LIMIT + 1)).toBe(NESTED_RENDER_LIMIT); // 51번째 task는 실행되지 않음
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toMatch(/무한 렌더/);
    expect((errors[0] as Error).message).toContain(String(NESTED_RENDER_LIMIT));
  });

  it('서로 다른 owner가 주고받으며 이어져도 연달아 횟수로 센다', async () => {
    collectErrors();
    const a = {};
    const b = {};
    let runs = 0;
    const ping = (): void => {
      runs++;
      scheduleRender(runs % 2 === 0 ? a : b, ping);
    };
    scheduleRender(a, ping);
    await flush();
    expect(runs).toBe(NESTED_RENDER_LIMIT);
    expect(errors).toHaveLength(1);
  });

  it('오류가 난 뒤에는 횟수가 0부터 다시 센다 (앱이 죽지 않음)', async () => {
    collectErrors();
    await chainOf(NESTED_RENDER_LIMIT + 5);
    expect(errors).toHaveLength(1);
    errors.length = 0;
    expect(await chainOf(NESTED_RENDER_LIMIT)).toBe(NESTED_RENDER_LIMIT);
    expect(errors).toEqual([]);
  });

  it('렌더가 던져 연쇄가 끊긴 뒤에도 횟수가 복구된다 (finally)', async () => {
    collectErrors();
    scheduleRender({}, () => {
      throw new Error('렌더 실패');
    });
    await flush();
    errors.length = 0;
    expect(await chainOf(NESTED_RENDER_LIMIT)).toBe(NESTED_RENDER_LIMIT); // 복구되지 않았다면 한도를 넘는다
    expect(errors).toEqual([]);
  });

  it('나란히(연달아가 아닌) 틱마다 1000번 예약해도 오류가 없다', async () => {
    collectErrors();
    const task = vi.fn();
    const owner = {};
    for (let i = 0; i < 1000; i++) {
      scheduleRender(owner, task);
      await Promise.resolve(); // 마이크로태스크 한 번이면 예약된 렌더가 돈다 (setTimeout 1000번은 느려서 쓰지 않음)
    }
    expect(task).toHaveBeenCalledTimes(1000);
    expect(errors).toEqual([]);
  });

  it('같은 틱에 서로 다른 owner 1000개를 예약해도 오류가 없다 (한꺼번에 예약한 것은 연달아가 아님)', async () => {
    collectErrors();
    const task = vi.fn();
    for (let i = 0; i < 1000; i++) scheduleRender({}, task);
    await flush();
    expect(task).toHaveBeenCalledTimes(1000);
    expect(errors).toEqual([]);
  });
});

describe('scheduleRender — 패키지 경계', () => {
  it('DOM 전역(document · window)이 없어도 동작한다 (scheduler는 DOM을 만지지 않음)', async () => {
    vi.stubGlobal('document', undefined);
    vi.stubGlobal('window', undefined);
    try {
      const task = vi.fn();
      expect(() => scheduleRender({}, task)).not.toThrow();
      await flush();
      expect(task).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
