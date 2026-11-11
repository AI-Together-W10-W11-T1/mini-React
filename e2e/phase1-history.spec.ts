import type { Page } from '@playwright/test';
import { test, expect, URL, captureAlert, edit, editorValue, expectThreeSame, holdNodes, sameNode, observeMutations, structureOf } from './phase1-helpers';
import type { NodeSpec, StructNode } from './phase1-helpers';

// [AI Note]: 뒤로 · 앞으로 인수 시나리오 (QA-11 ~ QA-15, B3). 이동 뒤에는 세 칸(편집창 글 · 테스트 영역 · 실제 영역)이
// 모두 그 기록 상태와 같아야 한다. 편집은 편집창 글을 읽어 일부만 바꿔 다시 채운다 (샘플 들여쓰기에 기대지 않음).

/** 초기 샘플에서 붙잡아 둘 노드 (이름 → 영역 안 선택자). `ptext`는 `<p>` 안 글자 노드 */
const SAMPLE_NODES: Record<string, NodeSpec> = {
  section: '#card',
  h2: 'h2',
  p: 'p.note',
  ptext: { sel: 'p.note', child: 0 },
  ul: 'ul',
  li1: 'li:nth-of-type(1)',
  li2: 'li:nth-of-type(2)',
  li3: 'li:nth-of-type(3)',
  button: 'button',
};

async function open(page: Page): Promise<void> {
  await page.goto(URL);
  await expect(page.getByTestId('real-area').locator('section#card')).toBeVisible();
}

const patchButton = (page: Page) => page.getByTestId('btn-patch');
const backButton = (page: Page) => page.getByTestId('btn-back');
const forwardButton = (page: Page) => page.getByTestId('btn-forward');

/** 한 상태: 실제 영역 구조 + 그 상태의 편집창 글 */
interface State {
  real: StructNode[];
  editor: string;
}

async function stateOf(page: Page): Promise<State> {
  return { real: await structureOf(page, 'real-area'), editor: await editorValue(page) };
}

/** 세 칸이 모두 `expected`와 같다 (편집창 글은 구조뿐 아니라 글 자체도 같다: 편집창 글 = vnodesToHtml(스냅샷)) */
async function expectState(page: Page, expected: State, label: string): Promise<void> {
  expect(await structureOf(page, 'real-area'), `${label}: 실제 영역`).toEqual(expected.real);
  expect(await structureOf(page, 'test-area'), `${label}: 테스트 영역`).toEqual(expected.real);
  expect(await editorValue(page), `${label}: 편집창 글`).toBe(expected.editor);
  await expectThreeSame(page);
}

/** 편집창 글을 일부 바꿔 Patch하고, 그 상태(S)를 돌려준다. 편집창 글은 Patch 직후 친 그대로다 */
async function patchWith(page: Page, fn: (current: string) => string): Promise<State> {
  await edit(page, fn);
  await patchButton(page).click();
  const state = await stateOf(page);
  expect(await structureOf(page, 'test-area')).toEqual(state.real);
  return state;
}

test('QA-11 Patch 두 번 뒤 뒤로 · 앞으로를 누르면 세 칸이 그 상태가 되고, 바뀌지 않은 노드는 같은 참조이며 바뀐 곳만 변경된다', async ({ page }) => {
  await open(page);
  const initial = await stateOf(page);
  await holdNodes(page, SAMPLE_NODES);
  const watcher = await observeMutations(page);

  const s1 = await patchWith(page, (t) => t.replace('안녕', '반가워')); // S1 = 글자 하나 변경
  const s2 = await patchWith(page, (t) => t.replace('<li>셋</li>', '<li>셋</li><li>넷</li>')); // S2 = <ul> 끝에 <li> 추가
  await watcher.takeSummary(); // Patch 때 기록은 버린다. 아래부터 이동 때 기록만 센다
  expect(s1.real).not.toEqual(initial.real);
  expect(s2.real).not.toEqual(s1.real);

  // 뒤로 → S1. 바뀐 곳(<ul>)만: childList뿐이고 target은 모두 <ul>
  await backButton(page).click();
  await expectState(page, s1, '뒤로 → S1');
  await expect(page.getByTestId('real-area').locator('li')).toHaveCount(3);
  const backMutations = await watcher.takeSummary();
  expect(backMutations).toMatchObject({ characterData: 0, attributes: 0 });
  expect(backMutations.childList).toBeGreaterThan(0);
  expect(new Set(backMutations.targets), '뒤로: 기록 target은 <ul>뿐이다').toEqual(new Set(['childList:ul']));
  for (const name of Object.keys(SAMPLE_NODES)) {
    expect(await sameNode(page, name, SAMPLE_NODES[name]), `뒤로 때 ${name}는 같은 참조`).toBe(true);
  }

  // 앞으로 → S2
  await forwardButton(page).click();
  await expectState(page, s2, '앞으로 → S2');
  await expect(page.getByTestId('real-area').locator('li')).toHaveCount(4);
  await expect(page.getByTestId('real-area').locator('li').nth(3)).toHaveText('넷');
  const forwardMutations = await watcher.takeSummary();
  expect(forwardMutations).toMatchObject({ characterData: 0, attributes: 0 });
  expect(forwardMutations.childList).toBeGreaterThan(0);
  expect(new Set(forwardMutations.targets), '앞으로: 기록 target은 <ul>뿐이다').toEqual(new Set(['childList:ul']));
  for (const name of Object.keys(SAMPLE_NODES)) {
    expect(await sameNode(page, name, SAMPLE_NODES[name]), `앞으로 때 ${name}는 같은 참조`).toBe(true);
  }

  // 뒤로 두 번: S2 → S1 → 초기. 마지막(S1 → 초기, 글자 되돌리기)은 characterData 1건뿐
  await backButton(page).click();
  await expectState(page, s1, '뒤로 → S1(다시)');
  await watcher.takeSummary();
  await backButton(page).click();
  await expectState(page, initial, '뒤로 → 초기');
  expect(await watcher.takeSummary()).toMatchObject({ characterData: 1, childList: 0, attributes: 0, total: 1 });
  for (const name of Object.keys(SAMPLE_NODES)) {
    expect(await sameNode(page, name, SAMPLE_NODES[name]), `초기로 돌아와도 ${name}는 같은 참조`).toBe(true);
  }
});

test('QA-12 처음에서 뒤로, 끝에서 앞으로를 눌러도 아무 일 없고 편집창에 쳐 둔 글도 그대로다', async ({ page }) => {
  await open(page);
  const watcher = await observeMutations(page);
  const initial = await stateOf(page);

  // 처음(0번)에서 뒤로 · 앞으로: 기록이 하나뿐이라 둘 다 무시
  await backButton(page).click();
  await forwardButton(page).click();
  expect((await watcher.takeSummary()).total).toBe(0);
  await expectState(page, initial, '처음 상태');

  // 처음에서 뒤로 + 편집창에 글을 쳐 둠: 이동이 없으므로 친 글 · 미리보기가 그대로
  const typed = await edit(page, (t) => t.replace('안녕', '미저장'));
  await backButton(page).click();
  expect(await editorValue(page)).toBe(typed);
  await expect(page.getByTestId('test-area').locator('p.note')).toHaveText('미저장');
  await expect(page.getByTestId('real-area').locator('p.note')).toHaveText('안녕');
  expect((await watcher.takeSummary()).total).toBe(0);

  // Patch 한 번 한 최신 상태(끝 기록)에서 앞으로
  await patchButton(page).click(); // typed를 Patch (기록 한 칸)
  const last = await stateOf(page);
  await watcher.takeSummary();
  await forwardButton(page).click();
  expect((await watcher.takeSummary()).total).toBe(0);
  await expectState(page, last, '끝 상태');

  // 끝에서 앞으로 + 편집창에 쳐 둔 글: 그대로
  const typedAgain = await edit(page, (t) => t.replace('미저장', '또 미저장'));
  await forwardButton(page).click();
  expect(await editorValue(page)).toBe(typedAgain);
  await expect(page.getByTestId('test-area').locator('p.note')).toHaveText('또 미저장');
  await expect(page.getByTestId('real-area').locator('p.note')).toHaveText('미저장');
  expect((await watcher.takeSummary()).total).toBe(0);
});

test('QA-13 뒤로 간 뒤 새 Patch를 하면 앞쪽 기록이 끊겨 앞으로가 아무 일도 없고, 뒤로는 A → 초기에서 멈춘다', async ({ page }) => {
  await open(page);
  const watcher = await observeMutations(page);
  const initial = await stateOf(page);
  const a = await patchWith(page, (t) => t.replace('안녕', 'A글'));
  const b = await patchWith(page, (t) => t.replace('<li>셋</li>', '<li>셋</li><li>B</li>'));
  expect(b.real).not.toEqual(a.real);

  await backButton(page).click();
  await expectState(page, a, '뒤로 → A');
  const c = await patchWith(page, (t) => t.replace('제목', 'C제목')); // 갈림길: A에서 새 Patch C
  expect(c.real).not.toEqual(a.real);
  expect(c.real).not.toEqual(b.real);
  await watcher.takeSummary();

  // 앞으로: C가 끝이라 아무 일 없다 (B로 못 간다)
  await forwardButton(page).click();
  expect((await watcher.takeSummary()).total).toBe(0);
  await expectState(page, c, '앞으로(끝) → 그대로 C');
  await expect(page.getByTestId('real-area').locator('li')).toHaveCount(3);

  // 뒤로 → A, 뒤로 → 초기, 그 뒤엔 더 못 감
  await backButton(page).click();
  await expectState(page, a, '뒤로 → A');
  await backButton(page).click();
  await expectState(page, initial, '뒤로 → 초기');
  await watcher.takeSummary();
  await backButton(page).click();
  expect((await watcher.takeSummary()).total).toBe(0);
  await expectState(page, initial, '더 못 감');

  // 다시 앞으로 → A → C (끊긴 B는 없다)
  await forwardButton(page).click();
  await expectState(page, a, '앞으로 → A');
  await forwardButton(page).click();
  await expectState(page, c, '앞으로 → C');
  await watcher.takeSummary();
  await forwardButton(page).click();
  expect((await watcher.takeSummary()).total).toBe(0);
});

test('QA-14 이동하면 미저장 편집은 버려지고 세 칸이 모두 그 기록 상태가 된다', async ({ page }) => {
  await open(page);
  const s1 = await patchWith(page, (t) => t.replace('안녕', '반가워'));
  const s2 = await patchWith(page, (t) => t.replace('<li>셋</li>', '<li>셋</li><li>넷</li>'));

  // 편집창에 새 글을 치고(Patch 안 함) 뒤로
  await edit(page, (t) => t.replace('반가워', '버려질 글').replace('<h2>제목</h2>', '<h2>버려질 제목</h2>'));
  await expect(page.getByTestId('test-area').locator('p.note')).toHaveText('버려질 글');
  await backButton(page).click();
  await expectState(page, s1, '뒤로 → S1');
  await expect(page.getByTestId('test-area')).not.toContainText('버려질');
  await expect(page.getByTestId('real-area')).not.toContainText('버려질');
  expect(await editorValue(page)).not.toContain('버려질');

  // 다시 글을 치고 앞으로
  await edit(page, (t) => t.replace('반가워', '또 버려질 글'));
  await expect(page.getByTestId('test-area').locator('p.note')).toHaveText('또 버려질 글');
  await forwardButton(page).click();
  await expectState(page, s2, '앞으로 → S2');
  await expect(page.getByTestId('test-area')).not.toContainText('버려질');
  expect(await editorValue(page)).not.toContain('버려질');
});

test('QA-15 Patch 세 번 뒤 뒤로를 끝까지, 앞으로를 끝까지 가도 각 칸이 Patch 당시 상태와 같다', async ({ page }) => {
  await open(page);
  const states: State[] = [await stateOf(page)]; // 0 = 초기
  states.push(await patchWith(page, (t) => t.replace('안녕', '하나')));
  states.push(await patchWith(page, (t) => t.replace('<li>둘</li>', '<li>둘</li><li>둘반</li>')));
  states.push(await patchWith(page, (t) => t.replace('<button disabled="">잠김</button>', '<button>풀림</button>')));
  // 뒤에 한 Patch가 앞 상태를 바꾸지 않았다 (각 상태가 서로 다르다)
  for (let i = 1; i < states.length; i++) expect(states[i].real, `S${i} ≠ S${i - 1}`).not.toEqual(states[i - 1].real);

  for (let i = states.length - 2; i >= 0; i--) {
    await backButton(page).click();
    await expectState(page, states[i], `뒤로 → S${i}`);
  }
  for (let i = 1; i < states.length; i++) {
    await forwardButton(page).click();
    await expectState(page, states[i], `앞으로 → S${i}`);
  }
});

test('QA-33 뒤로 · 앞으로 도중 예외(C2)가 나면 [Patch 오류] alert 뒤 실제 영역이 그 기록 상태로 복구되고 기록은 움직이지 않는다', async ({ page }) => {
  await open(page);
  const initial = await stateOf(page);
  const s1 = await patchWith(page, (t) => t.replace('안녕', '반가워'));

  // 뒤로 도중 예외: 실제 영역의 <p>를 바깥에서 뗀다 (역패치 경로가 사라진다)
  await page.evaluate(() => document.querySelector('[data-testid="real-area"] p.note')!.remove());
  const backMessage = await captureAlert(page, () => backButton(page).click());
  expect(backMessage).toContain('[Patch 오류]');
  expect(backMessage).toContain('되돌렸습니다');
  // 실제 영역이 지금 기록(S1)의 VNode로 다시 그려진다. 편집창 · 테스트 영역은 그대로
  expect(await structureOf(page, 'real-area')).toEqual(s1.real);
  await expectState(page, s1, '뒤로 예외 뒤');
  // current가 움직이지 않았으므로 다시 뒤로 하면 정상 이동한다
  await backButton(page).click();
  await expectState(page, initial, '복구 뒤 뒤로 → 초기');

  // 앞으로 도중 예외: 초기 상태에서 <p>를 떼고 앞으로
  await page.evaluate(() => document.querySelector('[data-testid="real-area"] p.note')!.remove());
  const forwardMessage = await captureAlert(page, () => forwardButton(page).click());
  expect(forwardMessage).toContain('[Patch 오류]');
  expect(await structureOf(page, 'real-area')).toEqual(initial.real);
  await expectState(page, initial, '앞으로 예외 뒤');
  await forwardButton(page).click();
  await expectState(page, s1, '복구 뒤 앞으로 → S1');
});
