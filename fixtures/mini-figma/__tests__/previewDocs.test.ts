import { describe, expect, it } from 'vitest';
import { History } from '@mini-react/react-dom';
import { HISTORY_LIMIT } from '@mini-react/shared';
import type { HistoryEntry } from '@mini-react/shared';
import { INITIAL_DOC } from '../model';
import type { Doc } from '../model';
import { initialTrack, trackBack, trackDoc, trackForward, trackPush } from '../previewDocs';
import type { DocTrack } from '../previewDocs';

// [AI Note]: 실제 영역 기록 칸마다 그때의 doc 사본을 들고 있는 모델(PP-06 변경). 칸 번호 = nav.index, 불변식 docs.length === nav.size.
// 칸 수 · 잘림 · 경계는 previewNav(navPush · navBack · navForward)가 정하고, 엔진 History에 같은 연산을 돌려 매 단계 맞춰 본다.

/** 번호표가 붙은 doc 사본 (label에 번호를 넣어 서로 구별한다) */
const docN = (n: number): Doc => ({ main: { ...INITIAL_DOC.main, label: `d${n}` }, instances: [], variables: INITIAL_DOC.variables });
const tag = (d: Doc): string => d.main.label;
const entry = (n: number): HistoryEntry => ({ snapshot: [], patches: [], inverse: [{ kind: 'SET_TEXT', path: [0], before: String(n), after: String(n - 1) }] });

/** trackPush · trackBack · trackForward를 하나씩 받아 DocTrack과 엔진 History를 같이 굴리는 짝 */
function pair() {
  let track: DocTrack = initialTrack(docN(0));
  let counter = 0;
  const history = new History({ snapshot: [], patches: [], inverse: [] });
  // 엔진 쪽 각 항목에 번호표를 달아 두는 곳: 엔진 항목 → 번호표
  const labels = new Map<object, string>();
  labels.set(history.current, 'd0');
  return {
    push() {
      counter++;
      track = trackPush(track, docN(counter));
      history.push(entry(counter));
      labels.set(history.current, `d${counter}`);
    },
    back() {
      track = trackBack(track);
      history.back();
    },
    forward() {
      track = trackForward(track);
      history.forward();
    },
    get track() {
      return track;
    },
    engine() {
      let index = 0;
      for (let x = history.current; x.prev !== null; x = x.prev) index++;
      return { index, size: history.size, tag: labels.get(history.current) };
    },
  };
}

describe('PD-1 기본 동작', () => {
  it('처음 trackDoc = 처음 doc, nav는 { index: 0, size: 1 }', () => {
    const t = initialTrack(INITIAL_DOC);
    expect(trackDoc(t)).toBe(INITIAL_DOC);
    expect(t.nav).toEqual({ index: 0, size: 1 });
    expect(t.docs).toEqual([INITIAL_DOC]);
  });

  it('push · back · forward마다 trackDoc이 그 칸 doc이고, 이전 DocTrack은 안 고쳐진다', () => {
    const d0 = docN(0), d1 = docN(1), d2 = docN(2);
    const t0 = initialTrack(d0);
    const t1 = trackPush(t0, d1);
    const t2 = trackPush(t1, d2);
    expect(trackDoc(t1)).toBe(d1);
    expect(trackDoc(t2)).toBe(d2);
    const b1 = trackBack(t2);
    expect(trackDoc(b1)).toBe(d1);
    const b0 = trackBack(b1);
    expect(trackDoc(b0)).toBe(d0);
    expect(trackDoc(trackForward(b0))).toBe(d1);
    expect(trackDoc(trackForward(trackForward(b0)))).toBe(d2);
    // 입력 불변
    expect(t0.docs).toEqual([d0]);
    expect(t0.nav).toEqual({ index: 0, size: 1 });
    expect(t2.docs).toEqual([d0, d1, d2]);
    expect(t2.nav).toEqual({ index: 2, size: 3 });
    expect(b0.docs).toEqual([d0, d1, d2]);
  });
});

describe('PD-2 경계', () => {
  it('처음에서 trackBack · 끝에서 trackForward는 같은 객체', () => {
    const t0 = initialTrack(docN(0));
    expect(trackBack(t0)).toBe(t0);
    expect(trackForward(t0)).toBe(t0);
    const t2 = trackPush(trackPush(t0, docN(1)), docN(2));
    expect(trackForward(t2)).toBe(t2);
    const b = trackBack(trackBack(t2));
    expect(trackBack(b)).toBe(b);
  });
});

describe('PD-3 뒤로 간 뒤 push', () => {
  it('앞쪽 사본이 사라져 docs.length = index + 2, 버려진 사본은 어떤 칸에도 안 남는다', () => {
    const d = [0, 1, 2, 3].map(docN);
    let t = initialTrack(d[0]!);
    t = trackPush(t, d[1]!);
    t = trackPush(t, d[2]!);
    t = trackBack(trackBack(t)); // index 0
    const fresh = docN(9);
    t = trackPush(t, fresh);
    expect(t.nav).toEqual({ index: 1, size: 2 });
    expect(t.docs.length).toBe(t.nav.index + 1);
    expect(t.docs).toEqual([d[0], fresh]);
    expect(t.docs).not.toContain(d[1]);
    expect(t.docs).not.toContain(d[2]);
    expect(trackForward(t)).toBe(t);
  });
});

describe('PD-4 한도 50 · 엔진 대조', () => {
  it('push 60번 → docs 50개, 맨 앞 = 11번째 사본(d10), index 49, back 49번째에 맨 앞 사본, 50번째는 같은 객체', () => {
    let t = initialTrack(docN(0));
    for (let i = 1; i <= 60; i++) t = trackPush(t, docN(i));
    expect(t.docs.length).toBe(HISTORY_LIMIT);
    expect(t.nav).toEqual({ index: 49, size: 50 });
    expect(tag(t.docs[0]!)).toBe('d11');
    expect(tag(trackDoc(t))).toBe('d60');
    for (let i = 0; i < 49; i++) t = trackBack(t);
    expect(tag(trackDoc(t))).toBe('d11');
    expect(trackBack(t)).toBe(t);
  });

  it('엔진 History에 같은 연산(push · back · forward · 뒤로 간 뒤 push · 60번 push)을 넣어 매 단계 size · 현재 칸이 같다', () => {
    const p = pair();
    const same = () => {
      const e = p.engine();
      expect(p.track.nav.size).toBe(e.size);
      expect(p.track.nav.index).toBe(e.index);
      expect(tag(trackDoc(p.track))).toBe(e.tag);
      expect(p.track.docs.length).toBe(p.track.nav.size);
    };
    same();
    p.push(); same();
    p.push(); same();
    p.back(); same();
    p.back(); same();
    p.back(); same();
    p.forward(); same();
    p.push(); same(); // 뒤로 간 뒤 push
    p.forward(); same();
    for (let i = 0; i < 60; i++) { p.push(); same(); }
    for (let i = 0; i < 55; i++) { p.back(); same(); }
    for (let i = 0; i < 55; i++) { p.forward(); same(); }
  });
});

describe('PD-5 무작위 불변식', () => {
  it('무작위 연산 2000번 동안 docs.length === nav.size · trackDoc === docs[nav.index] · 엔진 History와 같은 위치', () => {
    const p = pair();
    let seed = 12345;
    const rnd = (): number => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < 2000; i++) {
      const r = rnd();
      if (r < 0.4) p.push();
      else if (r < 0.7) p.back();
      else p.forward();
      const t = p.track;
      const e = p.engine();
      expect(t.docs.length).toBe(t.nav.size);
      expect(trackDoc(t)).toBe(t.docs[t.nav.index]);
      expect(t.nav.size).toBe(e.size);
      expect(t.nav.index).toBe(e.index);
      expect(tag(trackDoc(t))).toBe(e.tag);
    }
  });
});
