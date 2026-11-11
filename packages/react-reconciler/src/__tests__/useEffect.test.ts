import { afterEach, describe, it, expect, vi } from 'vitest';
import { h, useEffect, useState } from '@mini-react/react';
import type { AreaChildren, Patch, VNode } from '@mini-react/shared';
import { FunctionComponent } from '../FunctionComponent';
import { flush } from '../../../shared/src/__tests__/helpers';
import { setRenderErrorHandler } from '@mini-react/scheduler';
import type { FunctionComponentHost } from '../FunctionComponent';

type Setter<S> = (next: S | ((prev: S) => S)) => void;

afterEach(() => setRenderErrorHandler(null)); // 오류 처리 함수를 바꾼 테스트가 실패해도 다음 테스트에 남지 않게

// [AI Note]: 가짜 host와 effect가 같은 log에 적는다 — "host.mount / host.apply 뒤에 effect"인지 순서로 확인한다.
function setup(App: (log: string[]) => VNode) {
  const log: string[] = [];
  const patches: (readonly Patch[])[] = [];
  const host: FunctionComponentHost = {
    mount: (_c: AreaChildren) => void log.push('mount'),
    apply: (p: readonly Patch[]) => {
      patches.push(p);
      log.push('apply');
    },
  };
  const fc = new FunctionComponent(() => App(log), {}, host);
  return { fc, log, patches };
}

describe('useEffect — 실행 시점 (P2-16 · T-12)', () => {
  it('mount: DOM(host.mount) 반영 뒤에 실행된다', () => {
    const { fc, log } = setup((log) => {
      useEffect(() => {
        log.push('effect');
      }, []);
      return h('p', null);
    });
    fc.mount();
    expect(log).toEqual(['mount', 'effect']);
  });

  it('update: 모은 렌더의 host.apply 직후에 실행된다 (setter를 부른 코드가 끝난 직후, 한 번)', async () => {
    let set: Setter<number> = () => {};
    const { fc, log } = setup((log) => {
      const [n, setN] = useState(0);
      set = setN;
      useEffect(() => {
        log.push(`effect:${n}`);
      });
      return h('p', null, String(n));
    });
    fc.mount();
    log.length = 0;
    set(1);
    await flush();
    expect(log).toEqual(['apply', 'effect:1']);
  });

  it('setter를 3번 모으면 렌더 · host.apply · effect가 모두 한 번이고, effect는 apply 직후 최종 값으로 돈다', async () => {
    let set: Setter<number> = () => {};
    const { fc, log } = setup((log) => {
      const [n, setN] = useState(0);
      set = setN;
      useEffect(() => {
        log.push(`effect:${n}`);
      }, [n]);
      return h('p', null, String(n));
    });
    fc.mount();
    log.length = 0;
    set((c) => c + 1);
    set((c) => c + 1);
    set((c) => c + 1);
    expect(log).toEqual([]); // 부른 직후에는 렌더 · effect 모두 아직
    await flush();
    expect(log).toEqual(['apply', 'effect:3']);
  });

  it('렌더가 예약된 뒤 effect를 돌리기 전에 unmount()하면 그 렌더도 effect도 돌지 않는다', async () => {
    let set: Setter<number> = () => {};
    const App = vi.fn();
    const { fc, log } = setup((log) => {
      App();
      const [n, setN] = useState(0);
      set = setN;
      useEffect(() => void log.push('effect'));
      return h('p', null, String(n));
    });
    fc.mount();
    log.length = 0;
    App.mockClear();
    set(1);
    fc.unmount(); // 같은 틱에 해제 → 예약된 렌더는 돌아도 아무 일 없다
    await flush();
    expect(App).not.toHaveBeenCalled();
    expect(log).toEqual([]);
  });

  it('바뀐 게 없어 host.apply가 없어도(변경 0건) 의존성 생략 effect는 update 뒤에 돈다', () => {
    const { fc, log } = setup((log) => {
      useEffect(() => {
        log.push('effect');
      });
      return h('p', null);
    });
    fc.mount();
    fc.update();
    expect(log).toEqual(['mount', 'effect', 'effect']);
  });

  it('effect를 한 번도 안 부르는 컴포넌트는 아무 일 없다', () => {
    const { fc } = setup(() => h('p', null));
    expect(() => {
      fc.mount();
      fc.update();
    }).not.toThrow();
  });
});

describe('useEffect — 의존성 (정책 「§4.2 useEffect 의존성」)', () => {
  it('의존성 생략 = 매 렌더 뒤', () => {
    const body = vi.fn();
    const { fc } = setup(() => {
      useEffect(body);
      return h('p', null);
    });
    fc.mount();
    fc.update();
    fc.update();
    expect(body).toHaveBeenCalledTimes(3);
  });

  it('[] = mount 한 번만', () => {
    const body = vi.fn();
    const { fc } = setup(() => {
      useEffect(body, []);
      return h('p', null);
    });
    fc.mount();
    fc.update();
    fc.update();
    expect(body).toHaveBeenCalledTimes(1);
  });

  it('[a] = a가 바뀔 때만 (다른 상태가 바뀌어도 안 돈다)', async () => {
    const seen: number[] = [];
    let setA: Setter<number> = () => {};
    let setB: Setter<number> = () => {};
    const { fc } = setup(() => {
      const [a, sa] = useState(0);
      const [b, sb] = useState(0);
      setA = sa;
      setB = sb;
      useEffect(() => {
        seen.push(a);
      }, [a]);
      return h('p', null, `${a}${b}`);
    });
    fc.mount();
    setB(1);
    await flush();
    setB(2);
    await flush();
    expect(seen).toEqual([0]);
    setA(5);
    await flush();
    expect(seen).toEqual([0, 5]);
    setB(3);
    await flush();
    expect(seen).toEqual([0, 5]);
  });

  it('의존성 배열의 길이가 달라지면 바뀐 것으로 본다', () => {
    let deps: unknown[] = [1];
    const body = vi.fn();
    const { fc } = setup(() => {
      useEffect(body, deps);
      return h('p', null);
    });
    fc.mount();
    deps = [1, 2];
    fc.update();
    expect(body).toHaveBeenCalledTimes(2);
  });

  it('여러 effect는 선언한 순서대로 실행된다', () => {
    const { fc, log } = setup((log) => {
      useEffect(() => void log.push('A'));
      useEffect(() => void log.push('B'));
      useEffect(() => void log.push('C'));
      return h('p', null);
    });
    fc.mount();
    expect(log).toEqual(['mount', 'A', 'B', 'C']);
  });

  it('슬롯 { kind: effect, deps, cleanup }이 hooks 배열에 쌓인다', () => {
    const cleanup = () => {};
    const { fc } = setup(() => {
      useEffect(() => cleanup, [1]);
      return h('p', null);
    });
    fc.mount();
    expect(fc.hooks[0]).toEqual({ kind: 'effect', deps: [1], cleanup });
  });

  it('같은 번호 슬롯의 종류가 effect가 아니면 오류', () => {
    const { fc } = setup(() => {
      useEffect(() => {}, []);
      return h('p', null);
    });
    fc.mount();
    fc.hooks[0] = { kind: 'state', value: 0, setter: () => {} };
    expect(() => fc.update()).toThrow('Hook 호출 순서');
  });
});

describe('useEffect — cleanup · unmount (정책 「§4.2 cleanup · 해제」)', () => {
  it('cleanup은 마운트 직후엔 없고, 다시 실행하기 직전에 1번 불린다 (cleanup(이전) → 본문(새) 순서)', async () => {
    let set: Setter<number> = () => {};
    const { fc, log } = setup((log) => {
      const [n, setN] = useState(0);
      set = setN;
      useEffect(() => {
        log.push(`run:${n}`);
        return () => void log.push(`cleanup:${n}`);
      }, [n]);
      return h('p', null, String(n));
    });
    fc.mount();
    expect(log).toEqual(['mount', 'run:0']);
    set(1);
    await flush();
    expect(log).toEqual(['mount', 'run:0', 'apply', 'cleanup:0', 'run:1']);
    set(2);
    await flush();
    expect(log.slice(5)).toEqual(['apply', 'cleanup:1', 'run:2']);
  });

  it('의존성이 안 바뀌면 cleanup도 안 부른다', async () => {
    const cleanup = vi.fn();
    let setOther: Setter<number> = () => {};
    const { fc } = setup(() => {
      const [, so] = useState(0);
      setOther = so;
      useEffect(() => cleanup, []);
      return h('p', null);
    });
    fc.mount();
    setOther(1);
    await flush();
    setOther(2);
    await flush();
    expect(cleanup).not.toHaveBeenCalled();
  });

  it('unmount()가 마지막 cleanup을 부르고, 두 번 불러도 두 번째는 아무 일 없다', () => {
    const cleanup = vi.fn();
    const { fc } = setup(() => {
      useEffect(() => cleanup, []);
      return h('p', null);
    });
    fc.mount();
    fc.unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
    fc.unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('unmount()는 모든 effect의 cleanup을 (선언 순서대로) 부른다', () => {
    const order: string[] = [];
    const { fc } = setup(() => {
      useEffect(() => () => void order.push('A'), []);
      useEffect(() => undefined, []); // cleanup 없음
      useEffect(() => () => void order.push('C'), []);
      return h('p', null);
    });
    fc.mount();
    fc.unmount();
    expect(order).toEqual(['A', 'C']);
  });

  it('unmount() 뒤 setter는 무시된다 (렌더 · host.apply 없음)', async () => {
    let set: Setter<number> = () => {};
    const App = vi.fn();
    const { fc, log } = setup((log) => {
      App();
      const [n, setN] = useState(0);
      set = setN;
      useEffect(() => void log.push('effect'));
      return h('p', null, String(n));
    });
    fc.mount();
    fc.unmount();
    log.length = 0;
    App.mockClear();
    set(1);
    await flush();
    expect(App).not.toHaveBeenCalled();
    expect(log).toEqual([]);
  });

  it('effect가 아무것도 안 돌려줘도 정상이다', () => {
    const { fc } = setup(() => {
      useEffect(() => {});
      useEffect(() => undefined);
      return h('p', null);
    });
    expect(() => {
      fc.mount();
      fc.update();
      fc.unmount();
    }).not.toThrow();
  });

  it('cleanup이 아닌 값(문자열 등)을 돌려주면 cleanup으로 쓰지 않는다', () => {
    const { fc } = setup(() => {
      useEffect((() => 'not a function') as unknown as () => void, []);
      return h('p', null);
    });
    fc.mount();
    expect(fc.hooks[0]).toMatchObject({ cleanup: null });
    expect(() => fc.unmount()).not.toThrow();
  });
});

describe('useEffect — effect 안에서 setter (연달아 렌더, 결정 9 B)', () => {
  it('effect에서 setter를 부르면 렌더가 한 번 더 돌고 최종 상태 · 이전 VNode가 맞다', async () => {
    let renders = 0;
    let set: Setter<number> = () => {};
    const { fc, patches } = setup(() => {
      renders++;
      const [n, setN] = useState(0);
      set = setN;
      useEffect(() => {
        if (n < 3) setN((c) => c + 1);
      }, [n]);
      return h('p', null, String(n));
    });
    fc.mount();
    expect(renders).toBe(1); // mount 직후: setter가 예약한 렌더는 아직 안 돈다
    await flush();
    expect(renders).toBe(4); // 0 → 1 → 2 → 3 (렌더가 연달아 이어진다)
    expect(patches.map((p) => (p[0] as { after: string }).after)).toEqual(['1', '2', '3']);
    // 이전 VNode가 마지막 렌더(3)로 저장되어 있어야 다음 diff의 before가 맞다
    set(4);
    await flush();
    const last = patches[patches.length - 1][0] as { before: string; after: string };
    expect(last).toMatchObject({ before: '3', after: '4' });
  });

  it('의존성 [] effect가 setter를 불러도 자기 자신을 다시 실행하지 않는다 (무한 루프 없음)', async () => {
    const body = vi.fn();
    let setN: Setter<number> = () => {};
    const { fc } = setup(() => {
      const [, s] = useState(0);
      setN = s;
      useEffect(() => {
        body();
        setN(1);
      }, []);
      return h('p', null);
    });
    fc.mount();
    await flush();
    expect(body).toHaveBeenCalledTimes(1);
  });

  it('effect가 자기 의존성을 바꿔 다음 렌더에서 같은 effect가 다시 돌아도 cleanup이 빠지지 않는다 (cleanup(이전) → 본문(새) 순서)', async () => {
    const log: string[] = [];
    const { fc } = setup(() => {
      const [n, s] = useState(0);
      useEffect(() => {
        log.push(`run:${n}`);
        if (n === 0) s(1); // 자기 의존성을 바꾼다 → 다음 렌더에서 같은 effect가 다시 돎
        return () => void log.push(`cleanup:${n}`);
      }, [n]);
      return h('p', null, String(n));
    });
    fc.mount();
    await flush();
    fc.unmount();
    // 각 실행의 cleanup이 정확히 한 번씩, 순서대로 불렸다
    expect(log).toEqual(['run:0', 'cleanup:0', 'run:1', 'cleanup:1']);
  });

  it('같은 목록의 뒤쪽 effect는 렌더마다 한 번씩만, 그 렌더의 값으로 돈다 (옛 클로저로 다시 돌지 않음)', async () => {
    const seen: number[] = [];
    const { fc } = setup(() => {
      const [n, setN] = useState(0);
      useEffect(() => {
        if (n === 0) setN(1);
      }, [n]);
      useEffect(() => {
        seen.push(n);
      }, [n]);
      return h('p', null, String(n));
    });
    fc.mount();
    await flush();
    expect(seen).toEqual([0, 1]); // 렌더(0)에서 한 번, 이어진 렌더(1)에서 한 번 (task_002 즉시 동기 때는 안쪽 렌더가 대신 돌아 [1])
  });
});

describe('실패한 렌더는 effect 예약을 되돌린다 (검수 1회차 NB-2 · 정책 「§4.2 렌더 실패」)', () => {
  it('effect 안 setter가 예약한 렌더가 (effect를 예약한 뒤) 실패해도, 그 렌더의 effect는 돌지 않고 앞 렌더의 effect는 빠지지 않는다', async () => {
    const errors: unknown[] = [];
    setRenderErrorHandler((error) => void errors.push(error));
    const calls: string[] = [];
    let boom = false;
    let setN: Setter<number> = () => {};
    const App = (): VNode => {
      const [n, s] = useState(0);
      setN = s;
      useEffect(() => {
        calls.push(`A${n}`);
        if (n === 1) {
          boom = true;
          s(5); // 이어서 예약되는 렌더(n=5)가 실패한다
        }
      }); // 의존성 생략: 매 렌더 예약
      useEffect(() => {
        calls.push(`B${n}`);
      });
      if (boom) throw new Error('inner render boom'); // effect 두 개를 예약한 "뒤"에 실패
      return h('p', null, String(n));
    };
    const fc = new FunctionComponent(App, {}, { mount: () => {}, apply: () => {} });
    fc.mount();
    calls.length = 0;
    setN(1);
    await flush();
    // 렌더(n=1)의 effect A · B가 둘 다 돈다. 이어서 예약된 렌더(n=5)는 effect 두 개를 예약한 뒤 실패해 없었던 일이다 (A5 · B5 없음)
    expect(calls).toEqual(['A1', 'B1']);
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('inner render boom');
    // 앞 렌더가 남긴 예약이 흔들리지 않았으므로 다음 정상 렌더도 effect가 정상으로 돈다
    boom = false;
    setN(6);
    await flush();
    expect(calls).toEqual(['A1', 'B1', 'A6', 'B6']);
  });
});
