import { describe, it, expect, vi } from 'vitest';
import { h, useEffect, useState } from '@mini-react/react';
import type { AreaChildren, Patch, VNode } from '@mini-react/shared';
import { FunctionComponent } from '../FunctionComponent';
import type { FunctionComponentHost } from '../FunctionComponent';

type Setter<S> = (next: S | ((prev: S) => S)) => void;

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

  it('update: host.apply 뒤에 실행된다 (같은 setter 호출 안에서 바로)', () => {
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
    expect(log).toEqual(['apply', 'effect:1']);
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

  it('[a] = a가 바뀔 때만 (다른 상태가 바뀌어도 안 돈다)', () => {
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
    setB(2);
    expect(seen).toEqual([0]);
    setA(5);
    expect(seen).toEqual([0, 5]);
    setB(3);
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
  it('cleanup은 마운트 직후엔 없고, 다시 실행하기 직전에 1번 불린다 (cleanup(이전) → 본문(새) 순서)', () => {
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
    expect(log).toEqual(['mount', 'run:0', 'apply', 'cleanup:0', 'run:1']);
    set(2);
    expect(log.slice(5)).toEqual(['apply', 'cleanup:1', 'run:2']);
  });

  it('의존성이 안 바뀌면 cleanup도 안 부른다', () => {
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
    setOther(2);
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

  it('unmount() 뒤 setter는 무시된다 (렌더 · host.apply 없음)', () => {
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

describe('useEffect — effect 안에서 setter (렌더 중첩, 결정 9 A)', () => {
  it('effect에서 setter를 부르면 렌더가 한 번 더 돌고 최종 상태 · 이전 VNode가 맞다', () => {
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
    expect(renders).toBe(4); // 0 → 1 → 2 → 3
    expect(patches.map((p) => (p[0] as { after: string }).after)).toEqual(['1', '2', '3']);
    // 이전 VNode가 마지막 렌더(3)로 저장되어 있어야 다음 diff의 before가 맞다
    set(4);
    const last = patches[patches.length - 1][0] as { before: string; after: string };
    expect(last).toMatchObject({ before: '3', after: '4' });
  });

  it('의존성 [] effect가 setter를 불러도 자기 자신을 다시 실행하지 않는다 (무한 루프 없음)', () => {
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
    expect(body).toHaveBeenCalledTimes(1);
  });

  it('중첩 렌더에서 같은 effect가 다시 돌아도 cleanup이 빠지지 않는다 (바깥 본문이 늦게 끝나는 경우)', () => {
    const log: string[] = [];
    let setN: Setter<number> = () => {};
    const { fc } = setup(() => {
      const [n, s] = useState(0);
      setN = s;
      useEffect(() => {
        log.push(`run:${n}`);
        if (n === 0) s(1); // 자기 의존성을 바꾼다 → 안쪽에서 같은 effect가 다시 돎
        return () => void log.push(`cleanup:${n}`);
      }, [n]);
      return h('p', null, String(n));
    });
    fc.mount();
    fc.unmount();
    setN(2);
    // run:0 → (안쪽) run:1 … 각 실행의 cleanup이 정확히 한 번씩 불렸다
    const runs = log.filter((l) => l.startsWith('run')).length;
    const cleanups = log.filter((l) => l.startsWith('cleanup')).length;
    expect(cleanups).toBe(runs);
  });

  it('같은 목록 뒤쪽 effect는 안쪽 렌더가 대신 실행해 한 번만 돈다 (옛 클로저로 다시 돌지 않음)', () => {
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
    expect(seen).toEqual([1]); // 0으로 한 번, 1로 한 번이 아니라 최신 값으로만
  });
});
