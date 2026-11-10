import { describe, it, expect } from 'vitest';
import { createVDomRoot } from '../createVDomRoot';
import { readAreaChildren } from '@mini-react/react-dom-bindings';
import type { AreaChildren } from '@mini-react/shared';

/** 실제 영역 상자: 이 안의 자식 목록만 비교 대상이다 (§5 영역 상자 = 보이지 않는 감싸개) */
function box(html: string): HTMLElement {
  const area = document.createElement('div');
  area.id = 'real-area';
  area.innerHTML = html;
  return area;
}

/** HTML 글 → 영역 자식 목록 VNode (편집창 글을 브라우저가 읽은 것과 같은 방식) */
function parse(html: string): AreaChildren {
  return readAreaChildren(box(html));
}

function deepFreeze<T>(v: T): T {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v);
    Object.values(v as object).forEach(deepFreeze);
  }
  return v;
}

/** 영역 안 변경을 종류와 상관없이 센다 (P1-13 · T-04: 무변경이면 0건) */
function observe(target: Node): MutationObserver {
  const observer = new MutationObserver(() => {});
  observer.observe(target, { subtree: true, childList: true, attributes: true, characterData: true });
  return observer;
}

/** html을 실제 영역으로 시작해 root를 만들고, next로 update한 뒤 DOM이 next와 같은지까지 확인한다 */
function updateTo(startHtml: string, nextHtml: string) {
  const area = box(startHtml);
  const root = createVDomRoot(area);
  const next = parse(nextHtml);
  const changed = root.update(next);
  expect(area.innerHTML).toBe(nextHtml);
  expect(readAreaChildren(area)).toEqual(next);
  return { area, root, next, changed };
}

describe('createVDomRoot — 로드 때 읽기 (P1-20)', () => {
  it('만들 때 readAreaChildren(realArea)로 0번 기록을 만든다: snapshot()이 실제 영역을 읽은 VNode와 같다', () => {
    const area = box('<section id="card"><h2>제목</h2><!-- 안내 --><p class="note" style="color: red">안녕</p></section>');
    const root = createVDomRoot(area);
    expect(root.snapshot()).toEqual(readAreaChildren(area));
    expect(root.snapshot()).toHaveLength(1);
  });

  it('만드는 것만으로는 실제 영역을 건드리지 않는다 (DOM 변경 0건)', () => {
    const area = box('<p>안녕</p>');
    const observer = observe(area);
    createVDomRoot(area);
    expect(observer.takeRecords()).toHaveLength(0);
  });
});

describe('createVDomRoot.update — diff → patch → 기록 (D-01 ~ D-05)', () => {
  it('D-01 텍스트 변경: 글자만 바뀌고 true를 돌려준다 (P1-06)', () => {
    const { changed } = updateTo('<p>안녕</p>', '<p>반가워</p>');
    expect(changed).toBe(true);
  });

  it('D-02 속성 추가 · 수정 · 삭제 (P1-07 ~ P1-09)', () => {
    updateTo('<p>글</p>', '<p class="a">글</p>');
    updateTo('<p class="a">글</p>', '<p class="b">글</p>');
    updateTo('<p class="a" id="x">글</p>', '<p id="x">글</p>');
  });

  it('D-03 노드 추가 (P1-10)', () => {
    updateTo('<ul><li>1</li></ul>', '<ul><li>1</li><li>2</li></ul>');
  });

  it('D-04 노드 삭제 (P1-11)', () => {
    updateTo('<ul><li>1</li><li>2</li><li>3</li></ul>', '<ul><li>1</li><li>3</li></ul>');
  });

  it('D-05 노드 교체: 태그 종류와 하위 구조가 목표와 같다 (P1-12)', () => {
    updateTo('<div><p>x</p></div>', '<section><h1>y</h1><span>z</span></section>');
  });

  it('복합 변경 한 번에: 글자 + 속성 + style + 추가 + 삭제 (P1-15)', () => {
    updateTo(
      '<section id="card"><h2>제목</h2><p class="note" style="color: red; font-size: 16px">안녕</p><ul><li>하나</li><li>둘</li><li>셋</li></ul></section>',
      '<section id="card" class="on"><h2>새 제목</h2><p class="note" style="color: blue">안녕</p><ul><li>하나</li><li>셋</li><li>넷</li></ul><em>끝</em></section>',
    );
  });

  it('여러 형제 삭제 · 삭제와 수정이 함께 일어나도 다른 노드를 잘못 고치지 않는다 (P1-16)', () => {
    updateTo('<ul><li>a</li><li>b</li><li>c</li><li>d</li><li>e</li></ul>', '<ul><li>a</li><li>c</li></ul>');
    updateTo('<ul><li>a</li><li>b</li><li>c</li><li>d</li></ul>', '<ul><li>A</li><li>c</li><li>D</li></ul>');
  });

  it('공백 · 주석이 번호를 차지해도 맞게 반영된다 (VNode 번호 = childNodes 번호)', () => {
    updateTo('<ul>\n  <li>1</li>\n  <!-- 메모 -->\n  <li>2</li>\n</ul>', '<ul>\n  <li>1</li>\n  <!-- 메모 수정 -->\n  <li>2</li>\n  <li>3</li>\n</ul>');
  });

  it('영역 상자가 빈 입력 · 최상위가 여러 개인 입력도 같은 규칙 (T-05 · §5)', () => {
    updateTo('<p>a</p><p>b</p>', '');
    updateTo('', '<p>a</p><p>b</p>');
    updateTo('<p>a</p>', '<p>a</p><h1>b</h1>text');
    updateTo('text<p>a</p>', '<span>x</span>');
  });
});

describe('createVDomRoot.update — 저장한 VNode만 기준 (P1-33)', () => {
  it('저장한 VNode만 기준: 실제 영역을 바깥에서 어긋나게 고쳐 둬도 diff는 저장한 VNode와 next만 비교한다', () => {
    const area = box('<p>가</p><p>나</p>');
    const root = createVDomRoot(area);
    // 실제 영역을 바깥에서 몰래 고침. 실제 DOM을 다시 읽어 비교했다면 이 글자도 "나"로 되돌려졌을 것이다
    area.children[1].textContent = '몰래 바뀜';
    root.update(parse('<p>다</p><p>나</p>'));
    expect(area.children[0].textContent).toBe('다');
    expect(area.children[1].textContent).toBe('몰래 바뀜');
  });
});

describe('createVDomRoot.update — 무변경 무시 · 부분 갱신 (T-04 · T-06)', () => {
  it('무변경 무시: false를 돌려주고 DOM 변경 0건 · 기록이 안 늘어난다 (T-04)', () => {
    const html = '<section id="card"><h2>제목</h2><p class="note">안녕</p></section>';
    const area = box(html);
    const root = createVDomRoot(area);
    const before = root.snapshot();
    const observer = observe(area);
    expect(root.update(parse(html))).toBe(false);
    expect(observer.takeRecords()).toHaveLength(0);
    expect(root.snapshot()).toBe(before); // 기록이 늘지 않음 (뒤로가 null인 것은 Dev-13 테스트에서 이어서 확인)
  });

  it('무변경 뒤에도 snapshot()은 그대로 (이전 기록 유지)', () => {
    const area = box('<p>a</p>');
    const root = createVDomRoot(area);
    const before = root.snapshot();
    root.update(parse('<p>a</p>'));
    expect(root.snapshot()).toBe(before);
  });

  it('부분 갱신: 글자 하나를 바꿔도 관련 없는 노드 · 부모의 참조가 그대로다 (T-06 · P1-17 · P1-18)', () => {
    const area = box('<section><h2>제목</h2><p>안녕</p><ul><li>하나</li><li>둘</li></ul></section>');
    const root = createVDomRoot(area);
    const section = area.firstElementChild!;
    const h2 = section.children[0];
    const p = section.children[1];
    const ul = section.children[2];
    const li2 = ul.children[1];
    const text = p.firstChild!;
    const observer = observe(area);
    root.update(parse('<section><h2>제목</h2><p>반가워</p><ul><li>하나</li><li>둘</li></ul></section>'));
    expect(area.firstElementChild).toBe(section);
    expect(section.children[0]).toBe(h2);
    expect(section.children[1]).toBe(p);
    expect(section.children[2]).toBe(ul);
    expect(ul.children[1]).toBe(li2);
    expect(p.firstChild).toBe(text); // 글자 노드도 재생성하지 않고 nodeValue만 바꿈
    const records = observer.takeRecords();
    expect(records).toHaveLength(1);
    expect(records[0].type).toBe('characterData');
  });
});

describe('createVDomRoot.update — 연속 Patch · 기록 (P1-25 · P1-26 · P1-27)', () => {
  it('연속 update 3회가 매번 직전 반영 상태를 기준으로 정확하다 (P1-25)', () => {
    const area = box('<ul><li>1</li></ul>');
    const root = createVDomRoot(area);
    const steps = ['<ul><li>1</li><li>2</li></ul>', '<ul><li>1</li><li>2</li><li>3</li></ul>', '<ul><li>2</li><li>3</li></ul><p>끝</p>'];
    for (const html of steps) {
      const next = parse(html);
      expect(root.update(next)).toBe(true);
      expect(area.innerHTML).toBe(html);
      expect(root.snapshot()).toBe(next);
    }
  });

  it('같은 내용으로 다시 update하면 두 번째는 무변경이다 (연속 Patch의 기준이 직전 상태)', () => {
    const area = box('<p>a</p>');
    const root = createVDomRoot(area);
    expect(root.update(parse('<p>b</p>'))).toBe(true);
    expect(root.update(parse('<p>b</p>'))).toBe(false);
  });

  it('update마다 snapshot이 새 객체로 쌓이고, 이미 저장한 과거 snapshot의 내용은 안 바뀐다 (P1-26 · P1-27)', () => {
    const area = box('<p>a</p>');
    const root = createVDomRoot(area);
    const s0 = deepFreeze(root.snapshot()) as AreaChildren; // 얼려 두면 고치는 순간 strict 모드에서 예외가 난다
    const s0Copy = JSON.stringify(s0);
    const next1 = deepFreeze(parse('<p>b</p>'));
    const next2 = deepFreeze(parse('<p>c</p><p>d</p>'));
    root.update(next1);
    const s1 = root.snapshot();
    root.update(next2);
    const s2 = root.snapshot();
    expect(new Set([s0, s1, s2]).size).toBe(3);
    expect(s1).toBe(next1);
    expect(s2).toBe(next2);
    expect(JSON.stringify(s0)).toBe(s0Copy);
    expect(JSON.stringify(s1)).toBe(JSON.stringify(parse('<p>b</p>')));
  });

  it('update가 얼린 VNode를 받아도 예외 없이 동작한다 (입력을 고치지 않음)', () => {
    const area = box('<ul><li>1</li><li>2</li></ul>');
    const root = createVDomRoot(area);
    expect(() => root.update(deepFreeze(parse('<ul><li>2</li><li>3</li></ul><p>x</p>')))).not.toThrow();
    expect(area.innerHTML).toBe('<ul><li>2</li><li>3</li></ul><p>x</p>');
  });
});

describe('createVDomRoot.update — Patch 도중 예외 복구 (C2 · B22)', () => {
  const START = '<ul><li>1</li></ul><p>a</p>';
  const NEXT = '<ul><li>1</li><li>2</li></ul><p>b</p>';

  it('B22: 실제 영역을 바깥에서 망가뜨려 경로가 사라지면 원래 예외가 다시 던져지고, 기록은 안 늘고 current는 안 움직인다', () => {
    const area = box(START);
    const root = createVDomRoot(area);
    const before = root.snapshot();
    area.firstElementChild!.remove(); // <ul>을 뗌 → 영역은 <p>a</p>뿐이라 [1, 0] 경로가 없다
    expect(() => root.update(parse(NEXT))).toThrow(/patch: 경로/);
    expect(root.snapshot()).toBe(before); // 새 기록이 붙지 않고 current도 안 움직임 (뒤로가 null인 것은 Dev-13 테스트에서 이어서 확인)
  });

  it('B22: 적용되다 만 patch도 되돌려져 실제 영역이 지금(current) 기록의 snapshot과 같아진다', () => {
    const area = box(START);
    const root = createVDomRoot(area);
    area.firstElementChild!.remove();
    // 이 입력은 <ul> 자리(<p>)에 <li>를 먼저 끼워 넣은 뒤 다음 patch에서 경로가 없어 실패한다 (일부만 적용된 상태)
    expect(() => root.update(parse(NEXT))).toThrow();
    expect(readAreaChildren(area)).toEqual(root.snapshot());
    expect(area.innerHTML).toBe(START);
  });

  it('B22: 영역을 통째로 비워 첫 patch부터 실패해도 같은 복구가 된다', () => {
    const area = box(START);
    const root = createVDomRoot(area);
    area.replaceChildren();
    expect(() => root.update(parse(NEXT))).toThrow();
    expect(area.innerHTML).toBe(START);
  });

  it('B22: 복구 뒤 이어서 정상 update가 성공하고 기록이 정확히 한 칸 늘어난다', () => {
    const area = box(START);
    const root = createVDomRoot(area);
    area.firstElementChild!.remove();
    expect(() => root.update(parse(NEXT))).toThrow();

    const next2 = parse('<ul><li>1</li></ul><p>다시</p>');
    expect(root.update(next2)).toBe(true);
    expect(area.innerHTML).toBe('<ul><li>1</li></ul><p>다시</p>');
    expect(root.snapshot()).toBe(next2);
    // 기록이 정확히 한 칸 늘었다는 확인(back)은 Dev-13 테스트에서 이어서 한다
  });
});
