import { afterEach, describe, it, expect, vi } from 'vitest';
import { h, useEffect, useMemo, useState } from '@mini-react/react';
import type { AreaChildren, Patch, Props, VNode } from '@mini-react/shared';
import { NESTED_RENDER_LIMIT } from '@mini-react/shared';
import { setRenderErrorHandler } from '@mini-react/scheduler';
import { FunctionComponent } from '../FunctionComponent';
import type { FunctionComponentHost } from '../FunctionComponent';
import { flush } from '../../../shared/src/__tests__/helpers';

type Setter<S> = (next: S | ((prev: S) => S)) => void;

// [AI Note]: Batching(결정 9 B)에서는 setter가 일으킨 렌더의 오류가 마이크로태스크 안에서 나므로 호출한 쪽이 try/catch로 잡을 수 없다.
// 테스트는 scheduler의 오류 처리 함수 자리(setRenderErrorHandler)로 오류를 모아 확인한다. 직접 부른 mount() · update()는 예전처럼 던진다.
const errors: unknown[] = [];
function collectRenderErrors(): void {
  errors.length = 0;
  setRenderErrorHandler((error) => void errors.push(error));
}
afterEach(() => {
  setRenderErrorHandler(null);
  errors.length = 0;
});
const messages = (): string[] => errors.map((e) => (e as Error).message);

function makeHost() {
  const patches: (readonly Patch[])[] = [];
  const mounts: AreaChildren[] = [];
  const host: FunctionComponentHost = {
    mount: (c: AreaChildren) => void mounts.push(c),
    apply: (p: readonly Patch[]) => void patches.push(p),
  };
  return { host, patches, mounts };
}

const ORDER_ERROR = 'Hook 호출 순서 · 개수가 달라졌습니다';

describe('Hook 호출 순서 · 개수 오류 (정책 「§4.2 허용하지 않는 호출」)', () => {
  it('조건부 Hook으로 개수가 늘면 오류', () => {
    let flag = false;
    const App = (): VNode => {
      useState(0);
      if (flag) useState(1); // if 안 Hook = 규칙 위반
      return h('p', null);
    };
    const { host } = makeHost();
    const fc = new FunctionComponent(App, {}, host);
    fc.mount();
    flag = true;
    expect(() => fc.update()).toThrow(ORDER_ERROR);
  });

  it('조건부 Hook으로 개수가 줄어도 오류', () => {
    let flag = true;
    const App = (): VNode => {
      useState(0);
      if (flag) useState(1);
      return h('p', null);
    };
    const fc = new FunctionComponent(App, {}, makeHost().host);
    fc.mount();
    flag = false;
    expect(() => fc.update()).toThrow(ORDER_ERROR);
  });

  it('순서가 바뀌어 같은 번호의 종류(kind)가 달라지면 오류', () => {
    let flip = false;
    const App = (): VNode => {
      if (flip) {
        useMemo(() => 1, []);
        useState(0);
      } else {
        useState(0);
        useMemo(() => 1, []);
      }
      return h('p', null);
    };
    const fc = new FunctionComponent(App, {}, makeHost().host);
    fc.mount();
    flip = true;
    expect(() => fc.update()).toThrow('Hook 호출 순서');
  });

  it('오류가 난 렌더는 적용하지 않는다 — host.apply 없음 · 이전 VNode 보존 · hooks 개수 그대로', () => {
    let flag = false;
    let label = 'a';
    const { host, patches } = makeHost();
    const fc = new FunctionComponent(
      (): VNode => {
        useState(0);
        if (flag) useState(1);
        return h('p', null, label);
      },
      {},
      host,
    );
    fc.mount();
    flag = true;
    label = 'b';
    expect(() => fc.update()).toThrow(ORDER_ERROR);
    expect(patches).toHaveLength(0);
    expect(fc.hooks).toHaveLength(1); // 오류 렌더가 만든 슬롯은 버려진다
    expect(fc.lastPatches).toEqual([]);
    // 이전 VNode가 그대로라서 다음 정상 update의 before는 'a'
    flag = false;
    fc.update();
    expect(patches[0]).toEqual([{ kind: 'SET_TEXT', path: [0, 0], before: 'a', after: 'b' }]);
  });

  it('오류가 난 렌더가 바꿔 둔 슬롯 값(useMemo 재계산)도 되돌린다', () => {
    let dep = 1;
    let flag = false;
    const factory = vi.fn(() => `v${dep}`);
    const App = (): VNode => {
      useMemo(factory, [dep]);
      if (flag) useState(0);
      return h('p', null);
    };
    const fc = new FunctionComponent(App, {}, makeHost().host);
    fc.mount();
    expect(fc.hooks[0]).toEqual({ kind: 'memo', value: 'v1', deps: [1] });
    dep = 2;
    flag = true;
    expect(() => fc.update()).toThrow(ORDER_ERROR);
    expect(fc.hooks[0]).toEqual({ kind: 'memo', value: 'v1', deps: [1] }); // 재계산 결과 'v2'가 남지 않음
  });

  it('오류 뒤 다음 update()가 정상이다 (디스패처 · 깊이 복구)', () => {
    let flag = false;
    let n = 0;
    const { host, patches } = makeHost();
    const fc = new FunctionComponent(
      (): VNode => {
        const [count] = useState(0);
        if (flag) useState(1);
        return h('p', null, `${count}:${n}`);
      },
      {},
      host,
    );
    fc.mount();
    flag = true;
    expect(() => fc.update()).toThrow();
    expect(() => useState(0)).toThrow('Hook은 함수형 컴포넌트 렌더 중에만'); // 디스패처가 내려가 있음
    flag = false;
    n = 1;
    fc.update();
    expect(patches).toHaveLength(1);
  });

  it('처음 렌더(mount)가 컴포넌트 오류로 실패하면 슬롯이 남지 않는다', () => {
    const App = (): VNode => {
      useState(0);
      throw new Error('mount boom');
    };
    const { host, mounts } = makeHost();
    const fc = new FunctionComponent(App, {}, host);
    expect(() => fc.mount()).toThrow('mount boom');
    expect(fc.hooks).toHaveLength(0);
    expect(mounts).toHaveLength(0);
  });
});

describe('렌더 중 컴포넌트가 던진 예외 (§6.2 오류 복구)', () => {
  it('상태 · 이전 VNode 그대로, 예외는 삼키지 않고 오류 처리 함수로, 다음 update는 정상', async () => {
    collectRenderErrors();
    let boom = false;
    let setN: Setter<number> = () => {};
    const { host, patches } = makeHost();
    const fc = new FunctionComponent(
      (): VNode => {
        const [n, s] = useState(0);
        setN = s;
        if (boom) throw new Error('render boom');
        return h('p', null, String(n));
      },
      {},
      host,
    );
    fc.mount();
    boom = true;
    setN(1); // 렌더는 마이크로태스크에서 돌고, 그 예외는 호출한 쪽이 아니라 오류 처리 함수(기본 = 다시 던지기)로 간다
    expect(errors).toEqual([]);
    await flush();
    expect(messages()).toEqual(['render boom']);
    expect(patches).toHaveLength(0);
    expect(fc.hooks[0]).toMatchObject({ kind: 'state', value: 1 }); // setter가 바꾼 값은 그대로 (렌더만 적용 안 됨)
    boom = false;
    setN(2);
    await flush();
    expect(patches).toHaveLength(1);
    expect(patches[0]).toEqual([{ kind: 'SET_TEXT', path: [0, 0], before: '0', after: '2' }]);
  });

  it('예약 표시 · 연달아 횟수도 복구된다 (예외 뒤 많이 불러도 큐가 막히거나 무한 렌더 오류가 나지 않음)', async () => {
    collectRenderErrors();
    let boom = true;
    let setN: Setter<number> = () => {};
    const fc = new FunctionComponent(
      (): VNode => {
        const [n, s] = useState(0);
        setN = s;
        if (boom && n > 0) throw new Error('boom');
        return h('p', null, String(n));
      },
      {},
      makeHost().host,
    );
    fc.mount();
    for (let i = 1; i <= 100; i++) {
      setN(i);
      await flush(); // 한 번에 하나씩: 렌더마다 오류가 나도 다음 예약이 정상으로 걸린다
    }
    expect(errors).toHaveLength(100);
    expect(new Set(messages())).toEqual(new Set(['boom']));
    boom = false;
    errors.length = 0;
    setN(1000);
    await flush();
    expect(errors).toEqual([]); // 큐가 막히지 않았고 무한 렌더 오류도 없다
    expect(fc.hooks[0]).toMatchObject({ value: 1000 });
  });

  it('렌더가 던진 오류 뒤에도 effect 보호 코드 · 이전 VNode가 흔들리지 않는다 (다음 렌더의 patch before는 마지막 성공 모습)', async () => {
    collectRenderErrors();
    let boom = false;
    let setN: Setter<number> = () => {};
    const { host, patches } = makeHost();
    const fc = new FunctionComponent(
      (): VNode => {
        const [n, s] = useState(0);
        setN = s;
        if (boom) throw new Error('render boom');
        return h('p', null, String(n));
      },
      {},
      host,
    );
    fc.mount();
    boom = true;
    setN(1);
    await flush();
    boom = false;
    setN(2);
    await flush();
    expect(patches).toEqual([[{ kind: 'SET_TEXT', path: [0, 0], before: '0', after: '2' }]]);
  });
});

describe('자식 · 렌더 밖 Hook 호출은 오류 (P2-08 · T-16)', () => {
  const rootWith = (Child: (p: Props) => VNode) => new FunctionComponent((): VNode => h('div', null, h(Child, null)), {}, makeHost().host);

  it('자식 컴포넌트에서 useState를 부르면 오류', () => {
    const fc = rootWith(() => {
      useState(0);
      return h('i', null);
    });
    expect(() => fc.mount()).toThrow('Hook은 루트 컴포넌트에서만 부를 수 있습니다');
  });
  it('자식 컴포넌트에서 useEffect를 부르면 오류', () => {
    const fc = rootWith(() => {
      useEffect(() => {});
      return h('i', null);
    });
    expect(() => fc.mount()).toThrow('Hook은 루트 컴포넌트에서만 부를 수 있습니다');
  });
  it('자식 컴포넌트에서 useMemo를 부르면 오류', () => {
    const fc = rootWith(() => {
      useMemo(() => 1, []);
      return h('i', null);
    });
    expect(() => fc.mount()).toThrow('Hook은 루트 컴포넌트에서만 부를 수 있습니다');
  });

  it('update 도중 자식이 Hook을 불러도 오류이고 루트 상태는 그대로다', () => {
    let bad = false;
    const Child = (): VNode => {
      if (bad) useState(0);
      return h('i', null);
    };
    const fc = new FunctionComponent(
      (): VNode => {
        useState(7);
        return h('div', null, h(Child, null));
      },
      {},
      makeHost().host,
    );
    fc.mount();
    bad = true;
    expect(() => fc.update()).toThrow('Hook은 루트 컴포넌트에서만');
    expect(fc.hooks).toHaveLength(1);
    expect(fc.hooks[0]).toMatchObject({ value: 7 });
  });

  it('렌더 밖(이벤트 핸들러 안)에서 Hook을 부르면 오류 — 렌더가 끝나면 디스패처가 내려간다', () => {
    let handler: () => void = () => {};
    const fc = new FunctionComponent(
      (): VNode => {
        handler = () => void useState(0);
        return h('button', null);
      },
      {},
      makeHost().host,
    );
    fc.mount();
    expect(handler).toThrow('Hook은 함수형 컴포넌트 렌더 중에만 부를 수 있습니다');
  });
});

describe('무한 렌더 안전장치 (정책: 연달아 50번 넘으면 오류)', () => {
  /** effect 안에서 상태를 limit까지 올리는 루트 */
  function chain(limit: number) {
    const ctx = { renders: 0, n: 0 };
    const App = (): VNode => {
      ctx.renders++;
      const [n, setN] = useState(0);
      ctx.n = n;
      useEffect(() => {
        if (n < limit) setN(n + 1);
      }, [n]);
      return h('p', null, String(n));
    };
    return { ctx, fc: new FunctionComponent(App, {}, makeHost().host) };
  }

  it('연달아 10번으로 끝나는 연쇄는 정상이다 (카운터를 10까지 올리는 effect)', async () => {
    collectRenderErrors();
    const { ctx, fc } = chain(10);
    fc.mount();
    await flush();
    expect(errors).toEqual([]);
    expect(ctx.n).toBe(10);
  });

  it(`한도(${NESTED_RENDER_LIMIT})까지는 정상이다 — 연달아 ${NESTED_RENDER_LIMIT}번`, async () => {
    collectRenderErrors();
    const { ctx, fc } = chain(NESTED_RENDER_LIMIT);
    fc.mount();
    await flush();
    expect(errors).toEqual([]);
    expect(ctx.n).toBe(NESTED_RENDER_LIMIT);
  });

  it(`${NESTED_RENDER_LIMIT + 1}번째 렌더에서 오류 (문구에 "무한 렌더" · 한도 숫자), 그 렌더는 돌지 않는다`, async () => {
    collectRenderErrors();
    const { ctx, fc } = chain(NESTED_RENDER_LIMIT + 1);
    fc.mount();
    await flush();
    expect(errors).toHaveLength(1);
    expect(messages()[0]).toContain('무한 렌더');
    expect(messages()[0]).toContain(String(NESTED_RENDER_LIMIT));
    expect(ctx.n).toBe(NESTED_RENDER_LIMIT); // 51번째 렌더(n=51)는 실행되지 않았다
    expect(fc.hooks[0]).toMatchObject({ kind: 'state', value: NESTED_RENDER_LIMIT + 1 }); // setter가 바꾼 칸 값은 남는다 (기존 정책)
  });

  it('매번 setter를 부르는 effect는 오류를 내고, 그 뒤에도 앱이 죽지 않는다 (연달아 횟수 복구)', async () => {
    collectRenderErrors();
    let loop = true;
    let setN: Setter<number> = () => {};
    const { host, patches } = makeHost();
    const fc = new FunctionComponent(
      (): VNode => {
        const [n, s] = useState(0);
        setN = s;
        useEffect(() => {
          if (loop) s((c) => c + 1);
        }); // 의존성 생략 = 매 렌더 뒤 → 영원히 반복
        return h('p', null, String(n));
      },
      {},
      host,
    );
    fc.mount();
    await flush();
    expect(errors).toHaveLength(1);
    expect(messages()[0]).toContain('무한 렌더');
    loop = false;
    patches.length = 0;
    errors.length = 0;
    // 앱이 살아 있다: 새 setter 호출이 정상 렌더 (연달아 횟수가 0으로 돌아와 있음)
    setN((c) => c + 1);
    await flush();
    expect(errors).toEqual([]);
    expect(patches.length).toBe(1);
  });
});

describe('렌더 중 setter 호출은 오류 (검수 1회차 NB-1 · 정책 「§4.2 렌더 중 setter」)', () => {
  const MSG = '렌더 중에는 setter를 부를 수 없습니다';

  it('컴포넌트 본문에서 setter를 부르면 오류이고, 상태 · DOM 반영은 그대로다', () => {
    let boom = false;
    let renders = 0;
    const { host, patches } = makeHost();
    const fc = new FunctionComponent(
      (): VNode => {
        renders++;
        const [n, setN] = useState(0);
        if (boom) setN(5); // 본문 안 setter = 정책 밖 사용
        return h('p', null, String(n));
      },
      {},
      host,
    );
    fc.mount();
    boom = true;
    expect(() => fc.update()).toThrow(MSG);
    expect(renders).toBe(2); // 안쪽 렌더가 또 돌지 않음
    expect(fc.hooks[0]).toMatchObject({ kind: 'state', value: 0 }); // 5가 남지 않음
    expect(patches).toHaveLength(0);
    boom = false;
    expect(() => fc.update()).not.toThrow(); // 다음 렌더는 정상
  });

  it('함수형 setter도 렌더 중이면 오류이고 그 함수는 부르지 않는다', () => {
    const updater = vi.fn((c: number) => c + 1);
    let boom = false;
    const fc = new FunctionComponent(
      (): VNode => {
        const [n, setN] = useState(0);
        if (boom) setN(updater);
        return h('p', null, String(n));
      },
      {},
      makeHost().host,
    );
    fc.mount();
    boom = true;
    expect(() => fc.update()).toThrow(MSG);
    expect(updater).not.toHaveBeenCalled();
  });

  it('렌더 중 setter 오류 뒤에도 새 컴포넌트 인스턴스는 정상으로 마운트되고 setter가 patch를 낸다 (전역 깊이 · 렌더 표시 복구)', async () => {
    let boom = true;
    let setN: Setter<number> = () => {};
    const { host, patches } = makeHost();
    const fc = new FunctionComponent(
      (): VNode => {
        const [n, s] = useState(0);
        setN = s;
        if (boom && n === 0) s(9);
        return h('p', null, String(n));
      },
      {},
      host,
    );
    expect(() => fc.mount()).toThrow(MSG);
    boom = false;
    const ok = new FunctionComponent((): VNode => {
      const [n, s] = useState(0);
      setN = s;
      return h('p', null, String(n));
    }, {}, host);
    ok.mount();
    setN(1);
    await flush();
    expect(patches).toHaveLength(1);
  });

  it('effect 안(렌더가 끝난 뒤) setter는 지금처럼 허용된다', async () => {
    const fc = new FunctionComponent(
      (): VNode => {
        const [n, setN] = useState(0);
        useEffect(() => {
          if (n < 2) setN(n + 1);
        }, [n]);
        return h('p', null, String(n));
      },
      {},
      makeHost().host,
    );
    expect(() => fc.mount()).not.toThrow();
    await flush();
    expect(fc.hooks[0]).toMatchObject({ value: 2 });
  });

  it('자식 컴포넌트가 (props로 받은) setter를 렌더 중에 불러도 오류', () => {
    let boom = false;
    const Child = ({ set }: Props): VNode => {
      if (boom) (set as () => void)();
      return h('i', null);
    };
    const fc = new FunctionComponent(
      (): VNode => {
        const [n, setN] = useState(0);
        return h('div', null, h(Child, { set: () => setN(n + 1) }));
      },
      {},
      makeHost().host,
    );
    fc.mount();
    boom = true;
    expect(() => fc.update()).toThrow(MSG);
  });

  it('cleanup 안 setter도 렌더 밖이라 허용된다', async () => {
    let setN: Setter<number> = () => {};
    const fc = new FunctionComponent(
      (): VNode => {
        const [n, s] = useState(0);
        setN = s;
        useEffect(() => () => {}, [n]);
        return h('p', null, String(n));
      },
      {},
      makeHost().host,
    );
    fc.mount();
    expect(() => setN(1)).not.toThrow();
    await flush();
    expect(fc.hooks[0]).toMatchObject({ value: 1 });
  });
});
