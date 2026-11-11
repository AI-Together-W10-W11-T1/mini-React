import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from '@mini-react/react-dom';
import type { FunctionComponent } from '@mini-react/react-reconciler';
import type { Patch } from '@mini-react/shared';
import { App } from '../App';
import { createPreview } from '../preview';
import type { Preview } from '../preview';

// [AI Note]: createPreview(Dev-3) 단위 테스트. jsdom에서 render(App, root)로 만든 앱의 캔버스를 「테스트 영역」으로 삼고,
// 별도 <div>를 「실제 영역」으로 createPreview를 직접 부른다 (앱이 안에서 만드는 자기 실제 영역과는 따로). patch 종류 · 개수는 observe 콜백으로 센다 (qa_todo 「patch 기대 표 R-1 ~ 13」).
// 실제 영역 경로는 영역 상자 안 자식부터: 메인 [0,0] · b1 [1,0] · b2 [1,1] · b3 [1,2].

let root: HTMLElement;
let instance: FunctionComponent;
let real: HTMLElement;
let layer: HTMLElement;
let seen: Patch[];
let preview: Preview;

const testArea = (): HTMLElement => root.querySelector<HTMLElement>('[data-testid="canvas"]') as HTMLElement;
const byId = (id: string): HTMLElement => {
  const found = root.querySelector<HTMLElement>(`[data-testid="${id}"]`);
  if (found === null) throw new Error(`data-testid="${id}"가 없다`);
  return found;
};
const tick = (): Promise<void> => Promise.resolve();
const click = async (el: Element): Promise<void> => {
  (el as HTMLElement).click();
  await tick();
};
const testButton = (id: string): HTMLElement => {
  const found = testArea().querySelector<HTMLElement>(`[data-testid="figma-button"][data-id="${id}"]`);
  if (found === null) throw new Error(`테스트 영역에 ${id} 버튼이 없다`);
  return found;
};
const selectMain = (): Promise<void> => click(testButton('main'));
const typeInto = async (id: string, value: string): Promise<void> => {
  const input = byId(id) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  await tick();
};
const choose = async (id: string, value: string): Promise<void> => {
  const select = byId(id) as HTMLSelectElement;
  select.value = value;
  select.dispatchEvent(new Event('input'));
  await tick();
};
const toggle = async (id: string, checked: boolean): Promise<void> => {
  const box = byId(id) as HTMLInputElement;
  box.checked = checked;
  box.dispatchEvent(new Event('input'));
  await tick();
};
const chip = (hex: string): Promise<void> => click(root.querySelector(`[data-testid="color-chip"][data-color="${hex}"]`) as Element);

/** 영역 안 버튼마다 「모습」: id · 글자 · 아이콘 유무 · class(selected 뺌) · style 글 */
function look(area: Element, prefix: '' | 'real-') {
  return Array.from(area.querySelectorAll<HTMLElement>(`[data-testid="${prefix}figma-button"]`)).map((b) => ({
    id: b.getAttribute('data-id'),
    label: b.querySelector(`[data-testid="${prefix}btn-label"]`)?.textContent ?? null,
    icon: b.querySelector(`[data-testid="${prefix}btn-icon"]`) !== null,
    cls: (b.getAttribute('class') ?? '').split(/\s+/).filter((c) => c !== 'selected').join(' '),
    style: b.getAttribute('style'),
  }));
}
const realLook = () => look(real, 'real-');
const testLook = () => look(testArea(), '');

/** 지금까지 observe가 받은 patch를 종류별로 세고 비운다 */
function take(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of seen) out[p.kind] = (out[p.kind] ?? 0) + 1;
  seen = [];
  return out;
}

// [AI Note]: jsdom은 Range.getBoundingClientRect가 없다 (깜빡임 위치 재기가 부른다). 크기를 못 재는 환경이라 0 크기 상자를 돌려주는 대역만 둔다 — 위치 · 크기 단언은 e2e가 맡는다.
if (typeof Range.prototype.getBoundingClientRect !== 'function') {
  Range.prototype.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0);
}

beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
  instance = render(App, root);
  real = document.createElement('div');
  layer = document.createElement('div');
  document.body.append(real, layer);
  seen = [];
  preview = createPreview({ testArea: testArea(), realArea: real, overlayLayer: layer, observe: (event) => seen.push(event.patch) });
});

afterEach(() => {
  instance.unmount();
  root.remove();
  real.remove();
  layer.remove();
});

describe('처음 모습 (PP-03 · PP-05)', () => {
  it('만들자마자 실제 영역 = 테스트 영역 복사본: 버튼 4개, 글자 · class · style이 같고 selected 0', () => {
    expect(realLook()).toHaveLength(4);
    expect(realLook()).toEqual(testLook());
    expect(realLook().map((b) => b.label)).toEqual(['버튼', '버튼', '취소', '삭제']);
    expect(real.querySelectorAll('.selected')).toHaveLength(0);
  });

  it('실제 영역의 data-testid는 모두 real- 접두이고, 제목(test-area-title)은 복사되지 않는다', () => {
    const ids = Array.from(real.querySelectorAll('[data-testid]')).map((n) => n.getAttribute('data-testid') as string);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(id.startsWith('real-'), id).toBe(true);
    expect(ids).not.toContain('real-test-area-title');
    expect(real.querySelector('h2')).toBeNull();
  });

  it('읽기는 테스트 영역을 안 고친다: 노드 참조 · 글자 그대로, 변경이 없으니 patch 0', () => {
    const before = Array.from(testArea().querySelectorAll('*'));
    const textBefore = testArea().textContent;
    preview.patch();
    expect(Array.from(testArea().querySelectorAll('*'))).toEqual(before);
    expect(testArea().textContent).toBe(textBefore);
    expect(seen).toHaveLength(0);
  });
});

describe('Patch 기대 표 (실제 영역 patch 종류 · 개수) — R-1 ~ R-13', () => {
  it('R-1 아무것도 안 함 → false · patch 0 · 깜빡임 층 숫자 없음', () => {
    expect(preview.patch()).toBe(false);
    expect(take()).toEqual({});
    expect(layer.dataset.lastPatchCount).toBeUndefined();
  });

  it('R-2 b2 고르기만(selected · 속성 패널 변화) → false · patch 0, 반복해도 기록이 안 쌓인다', async () => {
    await click(testButton('b2'));
    expect(testButton('b2').classList.contains('selected')).toBe(true); // 헛돌지 않게: 테스트 영역에는 정말 selected가 있다
    expect(preview.patch()).toBe(false);
    expect(preview.patch()).toBe(false);
    expect(take()).toEqual({});
    expect(real.querySelectorAll('.selected')).toHaveLength(0);
    expect(preview.back(), '기록이 0번뿐이라 뒤로 못 감').toBe(false);
  });

  it('R-3 메인 라벨 `버튼!` → { SET_TEXT: 2 }, 실제 영역 글자가 바뀜', async () => {
    await selectMain();
    await typeInto('prop-label', '버튼!');
    expect(preview.patch()).toBe(true);
    expect(take()).toEqual({ SET_TEXT: 2 });
    expect(realLook().map((b) => b.label)).toEqual(['버튼!', '버튼!', '취소', '삭제']);
  });

  it('R-4 메인 크기 L → { SET_ATTR: 4 } (class)', async () => {
    await selectMain();
    await choose('prop-size', 'L');
    preview.patch();
    expect(take()).toEqual({ SET_ATTR: 4 });
    expect(realLook().map((b) => b.cls)).toEqual(Array(4).fill('figma-button btn-L'));
  });

  it('R-5 메인 색 #05b169 → { SET_STYLE: 6 } (메인 · b1 · b2 × 배경 + 글자색)', async () => {
    await selectMain();
    await chip('#05b169');
    preview.patch();
    expect(take()).toEqual({ SET_STYLE: 6 });
    expect(realLook()).toEqual(testLook());
  });

  it('R-5b 메인 색 #cf202f → { SET_STYLE: 3 } (배경만), 한 줄 = background-color · #0052ff → #cf202f', async () => {
    await selectMain();
    await chip('#cf202f');
    preview.patch();
    const first = seen[0];
    if (first.kind !== 'SET_STYLE') throw new Error('SET_STYLE이 아니다');
    expect(first.property).toBe('background-color');
    expect(first.before).toBe('#0052ff');
    expect(first.after).toBe('#cf202f');
    expect(take()).toEqual({ SET_STYLE: 3 });
  });

  // [AI Note]: R-6 · R-7은 기획 표(INSERT 4 · REMOVE 4)와 다르다. 실제 영역은 DOM에서 읽어 key가 없어서 위치 비교라 (Button 안 key는 미니 React 쪽 diff 몫),
  // 아이콘을 켜면 글자 span 자리(0번)가 아이콘 span으로 바뀌고(SET_ATTR 3 + SET_TEXT 1, 버튼 4개 × ) 글자 span은 뒤(1번)에 새로 생긴다. 엔진 정상 동작이고 화면 결과는 맞다 (아래 look 비교).
  it('R-6 메인 아이콘 켜기 → { SET_ATTR: 12, SET_TEXT: 4, INSERT: 4 } (위치 비교: 0번 글자 span이 아이콘으로, 글자 span은 1번에 새로 생김)', async () => {
    await selectMain();
    await toggle('prop-hasicon', true);
    preview.patch();
    const inserts = seen.filter((p) => p.kind === 'INSERT');
    expect(inserts.map((p) => (p.kind === 'INSERT' ? p.path.at(-1) : -1))).toEqual([1, 1, 1, 1]);
    expect(take()).toEqual({ SET_ATTR: 12, SET_TEXT: 4, INSERT: 4 });
    expect(real.querySelectorAll('[data-testid="real-btn-icon"]')).toHaveLength(4);
    expect(realLook()).toEqual(testLook());
  });

  it('R-7 (R-6 뒤) 아이콘 끄기 → { SET_ATTR: 12, SET_TEXT: 4, REMOVE: 4 }, 모습은 테스트 영역과 같음', async () => {
    await selectMain();
    await toggle('prop-hasicon', true);
    preview.patch();
    take();
    await toggle('prop-hasicon', false);
    preview.patch();
    expect(take()).toEqual({ SET_ATTR: 12, SET_TEXT: 4, REMOVE: 4 });
    expect(real.querySelectorAll('[data-testid="real-btn-icon"]')).toHaveLength(0);
    expect(realLook()).toEqual(testLook());
  });

  it('R-8 (R-6 뒤) 종류 ♥ → { SET_TEXT: 4 } (아이콘 글자만, REPLACE 아님)', async () => {
    await selectMain();
    await toggle('prop-hasicon', true);
    preview.patch();
    take();
    await choose('prop-icon', 'heart');
    preview.patch();
    expect(take()).toEqual({ SET_TEXT: 4 });
  });

  it('R-9 [+ 인스턴스] → { INSERT: 1 }, 경로 [1,3]', async () => {
    await click(byId('add-instance'));
    preview.patch();
    const only = seen[0];
    expect(only.kind === 'INSERT' && only.path).toEqual([1, 3]);
    expect(take()).toEqual({ INSERT: 1 });
    expect(realLook()).toHaveLength(5);
  });

  it('R-10 b3 삭제 → { REMOVE: 1 }', async () => {
    await click(testButton('b3'));
    await click(byId('delete-instance'));
    preview.patch();
    expect(take()).toEqual({ REMOVE: 1 });
    expect(realLook().map((b) => b.id)).toEqual(['main', 'b1', 'b2']);
  });

  it('R-11 b1 삭제 (key가 없어 위치 비교) → { SET_ATTR: 2, SET_TEXT: 2, SET_STYLE: 1, REMOVE: 1 }', async () => {
    await click(testButton('b1'));
    await click(byId('delete-instance'));
    preview.patch();
    expect(take()).toEqual({ SET_ATTR: 2, SET_TEXT: 2, SET_STYLE: 1, REMOVE: 1 });
    expect(realLook()).toEqual(testLook());
  });

  it('R-12 b1 ↓ (순서 바꿈) → { SET_ATTR: 2, SET_TEXT: 2 }, MOVE 없음', async () => {
    await click(root.querySelector('[data-testid="layer-item"][data-id="b1"] [data-testid="layer-down"]') as Element);
    preview.patch();
    const counts = take();
    expect(counts).toEqual({ SET_ATTR: 2, SET_TEXT: 2 });
    expect(counts.MOVE).toBeUndefined();
    expect(realLook().map((b) => b.id)).toEqual(['main', 'b2', 'b1', 'b3']);
  });

  it('R-13 테스트 영역 DOM을 직접 고쳐 span.btn-label → em → { REPLACE: 1 } (D-05)', () => {
    const label = testButton('main').querySelector('[data-testid="btn-label"]') as HTMLElement;
    const em = document.createElement('em');
    for (const attr of Array.from(label.attributes)) em.setAttribute(attr.name, attr.value);
    em.append(...Array.from(label.childNodes));
    label.replaceWith(em);
    expect(preview.patch()).toBe(true);
    expect(take()).toEqual({ REPLACE: 1 });
    const realMain = real.querySelector('[data-testid="real-figma-button"][data-id="main"]') as HTMLElement;
    expect(realMain.querySelector('em')).not.toBeNull();
    expect(realMain.querySelector('span[data-testid="real-btn-label"]')).toBeNull();
  });
});

describe('뒤로 · 앞으로 (PP-06)', () => {
  it('Patch 2번 → back · back · forward · forward 매 단계 실제 영역이 그 기록 모습, 경계 이동은 false, 테스트 영역은 그대로 (모듈 단위)', async () => {
    const initial = realLook();
    await selectMain();
    await typeInto('prop-label', '확인');
    preview.patch();
    const a = realLook();
    await choose('prop-size', 'L');
    preview.patch();
    const b = realLook();
    expect(a).not.toEqual(initial);
    expect(b).not.toEqual(a);

    const testNodes = Array.from(testArea().querySelectorAll('*'));
    const testSnapshot = testLook();
    const testText = testArea().textContent;

    expect(preview.forward(), '끝에서 앞으로').toBe(false);
    expect(realLook()).toEqual(b);
    expect(preview.back()).toBe(true);
    expect(realLook()).toEqual(a);
    expect(preview.back()).toBe(true);
    expect(realLook()).toEqual(initial);
    expect(preview.back(), '처음에서 뒤로').toBe(false);
    expect(realLook()).toEqual(initial);
    expect(preview.forward()).toBe(true);
    expect(realLook()).toEqual(a);
    expect(preview.forward()).toBe(true);
    expect(realLook()).toEqual(b);
    expect(preview.forward()).toBe(false);

    // 움직이는 동안 테스트 영역은 그대로 (같은 노드 · 같은 모습 · 같은 글자)
    expect(Array.from(testArea().querySelectorAll('*'))).toEqual(testNodes);
    expect(testLook()).toEqual(testSnapshot);
    expect(testArea().textContent).toBe(testText);
  });

  it('뒤로 간 뒤 Patch하면 앞쪽 기록을 버린다 (forward 거짓), 새 모습이 현재', async () => {
    await selectMain();
    await typeInto('prop-label', '확인');
    preview.patch();
    await choose('prop-size', 'L');
    preview.patch();
    preview.back();
    expect(preview.patch(), '테스트 영역(L)과 실제 영역(M)이 다르므로 새 기록').toBe(true);
    expect(realLook()).toEqual(testLook());
    expect(preview.forward()).toBe(false);
    preview.back();
    preview.back();
    expect(realLook().map((b) => b.label)).toEqual(['버튼', '버튼', '취소', '삭제']);
    expect(preview.back()).toBe(false);
  });

  it('뒤로 · 앞으로 때도 observe가 불린다 (역패치 · 정패치), 경계 이동은 안 불린다', async () => {
    await selectMain();
    await typeInto('prop-label', '확인');
    preview.patch();
    take();
    preview.back();
    expect(take()).toEqual({ SET_TEXT: 2 });
    preview.back();
    expect(take()).toEqual({});
    preview.forward();
    expect(take()).toEqual({ SET_TEXT: 2 });
  });

  it('한도 50: [+ 인스턴스] → Patch를 55번 하면 back()은 정확히 49번 참 · 50번째 거짓, 맨 끝은 처음(b1~b3)이 아니라 b1~b9 모습', async () => {
    for (let i = 0; i < 55; i++) {
      await click(byId('add-instance'));
      expect(preview.patch()).toBe(true);
    }
    let backs = 0;
    while (preview.back()) backs++;
    expect(backs).toBe(49);
    expect(preview.back()).toBe(false);
    // 가장 오래된 6칸이 빠져 b1~b9 모습(버튼 10개)에서 멈춘다
    expect(realLook().map((b) => b.id)).toEqual(['main', ...Array.from({ length: 9 }, (_, i) => `b${i + 1}`)]);
    let forwards = 0;
    while (preview.forward()) forwards++;
    expect(forwards).toBe(49);
    expect(realLook()).toEqual(testLook());
  });
});

describe('깜빡임 연결 (PP-08)', () => {
  it('색 바꾸고 Patch → 깜빡임 층 data-last-patch-count · data-last-flash-count = 3, 박스 3개', async () => {
    await selectMain();
    await chip('#cf202f');
    preview.patch();
    expect(layer.dataset.lastPatchCount).toBe('3');
    expect(layer.dataset.lastFlashCount).toBe('3');
    expect(layer.querySelectorAll('.viz-box')).toHaveLength(3);
  });

  it('무변경 Patch는 지난 숫자를 그대로 둔다', async () => {
    await selectMain();
    await chip('#cf202f');
    preview.patch();
    preview.patch();
    expect(layer.dataset.lastPatchCount).toBe('3');
    expect(layer.dataset.lastFlashCount).toBe('3');
  });

  it('깜빡임은 실제 영역 DOM에 class · 박스를 붙이지 않는다 (VNode와 어긋남 방지)', async () => {
    await selectMain();
    await chip('#cf202f');
    preview.patch();
    expect(real.querySelector('.viz-box')).toBeNull();
    expect(realLook()).toEqual(testLook());
  });
});

describe('테스트 영역 불변', () => {
  it('Patch · 뒤로 · 앞으로 어느 것도 테스트 영역 DOM 변경을 만들지 않는다 (MutationObserver)', async () => {
    await selectMain();
    await typeInto('prop-label', '확인');
    const records: MutationRecord[] = [];
    const observer = new MutationObserver((list) => records.push(...list));
    observer.observe(testArea(), { subtree: true, childList: true, attributes: true, characterData: true });
    preview.patch();
    preview.back();
    preview.forward();
    records.push(...observer.takeRecords());
    observer.disconnect();
    expect(records).toHaveLength(0);
  });
});
