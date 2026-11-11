import { describe, expect, it } from 'vitest';
import { History } from '@mini-react/react-dom';
import { HISTORY_LIMIT } from '@mini-react/shared';
import type { HistoryEntry } from '@mini-react/shared';
import { INITIAL_NAV, canBack, canForward, navBack, navForward, navPush } from '../previewNav';
import type { PreviewNav } from '../previewNav';

// [AI Note]: 실제 영역 뒤로 · 앞으로 가능 여부 모델(PP-06). 엔진 History가 정답이므로 같은 연산을 둘 다에 돌려 매 단계 맞춰 본다.

const entry = (n: number): HistoryEntry => ({ snapshot: [], patches: [], inverse: [{ kind: 'SET_TEXT', path: [0], before: String(n), after: String(n - 1) }] });

/** push · back · forward를 하나씩 받아 nav와 엔진 History를 같이 굴리는 짝 */
function pair() {
  let nav: PreviewNav = INITIAL_NAV;
  let counter = 0;
  const history = new History({ snapshot: [], patches: [], inverse: [] });
  return {
    push() {
      nav = navPush(nav);
      history.push(entry(++counter));
    },
    back() {
      nav = navBack(nav);
      history.back();
    },
    forward() {
      nav = navForward(nav);
      history.forward();
    },
    get nav() {
      return nav;
    },
    /** 엔진에서 센 값: 기록 수 · 맨 앞(head)에서 몇 칸째인지 */
    engine() {
      let index = 0;
      for (let x = history.current; x.prev !== null; x = x.prev) index++;
      return { index, size: history.size };
    },
  };
}

describe('기본 동작', () => {
  it('처음에는 뒤로도 앞으로도 갈 수 없다', () => {
    expect(INITIAL_NAV).toEqual({ index: 0, size: 1 });
    expect(canBack(INITIAL_NAV)).toBe(false);
    expect(canForward(INITIAL_NAV)).toBe(false);
  });

  it('push하면 뒤로만 갈 수 있다', () => {
    const n = navPush(INITIAL_NAV);
    expect(n).toEqual({ index: 1, size: 2 });
    expect(canBack(n)).toBe(true);
    expect(canForward(n)).toBe(false);
  });

  it('back으로 처음에 오면 앞으로만 갈 수 있고, forward로 끝에 오면 다시 뒤로만 갈 수 있다', () => {
    const back = navBack(navPush(INITIAL_NAV));
    expect(back).toEqual({ index: 0, size: 2 });
    expect(canBack(back)).toBe(false);
    expect(canForward(back)).toBe(true);
    const end = navForward(back);
    expect(canBack(end)).toBe(true);
    expect(canForward(end)).toBe(false);
  });

  it('가운데에서는 둘 다 갈 수 있다', () => {
    const mid = navBack(navPush(navPush(INITIAL_NAV)));
    expect(mid).toEqual({ index: 1, size: 3 });
    expect(canBack(mid)).toBe(true);
    expect(canForward(mid)).toBe(true);
  });

  it('경계에서 이동하면 같은 객체를 돌려준다 (setter가 렌더를 안 일으킴)', () => {
    expect(navBack(INITIAL_NAV)).toBe(INITIAL_NAV);
    const end = navPush(INITIAL_NAV);
    expect(navForward(end)).toBe(end);
  });

  it('뒤로 간 뒤 push하면 앞쪽을 버린다 (size = index + 2, 앞으로 못 감)', () => {
    const a = navPush(navPush(navPush(INITIAL_NAV))); // index 3 size 4
    const b = navBack(navBack(a)); // index 1 size 4
    const c = navPush(b);
    expect(c).toEqual({ index: 2, size: 3 });
    expect(canForward(c)).toBe(false);
  });
});

describe('한도 50', () => {
  it('push 60번 = size 50 · index 49, back 49번이면 뒤로 못 간다', () => {
    let n = INITIAL_NAV;
    for (let i = 0; i < 60; i++) n = navPush(n);
    expect(HISTORY_LIMIT).toBe(50);
    expect(n).toEqual({ index: 49, size: 50 });
    let backs = 0;
    while (canBack(n)) {
      n = navBack(n);
      backs++;
    }
    expect(backs).toBe(49);
    expect(canForward(n)).toBe(true);
  });

  it('정확히 한도에 닿는 경계: push 49번 = size 50, 50번째부터 맨 앞이 빠져도 size 50', () => {
    let n = INITIAL_NAV;
    for (let i = 0; i < 49; i++) n = navPush(n);
    expect(n).toEqual({ index: 49, size: 50 });
    expect(navPush(n)).toEqual({ index: 49, size: 50 });
  });
});

describe('엔진 History와 같은 연산을 돌려 매 단계 대조', () => {
  it('push · back · forward · 뒤로 간 뒤 push 섞기', () => {
    const p = pair();
    const ops: Array<'push' | 'back' | 'forward'> = [
      'back', 'forward', 'push', 'push', 'push', 'back', 'back', 'forward', 'push', 'back', 'back', 'back', 'back', 'back', 'forward', 'forward', 'forward', 'forward',
      'forward', 'push', 'push', 'back', 'push',
    ];
    for (const op of ops) {
      p[op]();
      expect(p.nav, op).toEqual(p.engine());
    }
  });

  it('한도를 넘기는 push 70번, 그 사이 back · forward · 뒤로 간 뒤 push', () => {
    const p = pair();
    for (let i = 0; i < 70; i++) {
      p.push();
      expect(p.nav).toEqual(p.engine());
    }
    for (let i = 0; i < 20; i++) {
      p.back();
      expect(p.nav).toEqual(p.engine());
    }
    // 뒤로 간 뒤 push = 앞쪽이 끊기고 한도 근처에서 맨 앞 처리가 틀리지 않는다 (엔진 B17)
    for (let i = 0; i < 40; i++) {
      p.push();
      expect(p.nav).toEqual(p.engine());
    }
    for (let i = 0; i < 60; i++) {
      p.back();
      expect(p.nav).toEqual(p.engine());
    }
    for (let i = 0; i < 60; i++) {
      p.forward();
      expect(p.nav).toEqual(p.engine());
    }
  });

  it('무작위 연산 2000번 (고정 시드)', () => {
    const p = pair();
    let seed = 12345;
    const rand = (): number => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let i = 0; i < 2000; i++) {
      const r = rand();
      const op = r < 0.4 ? 'push' : r < 0.7 ? 'back' : 'forward';
      p[op]();
      expect(p.nav, `${i}번째 ${op}`).toEqual(p.engine());
    }
  });
});
