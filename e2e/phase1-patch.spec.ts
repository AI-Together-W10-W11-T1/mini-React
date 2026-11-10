import type { Page } from '@playwright/test';
import { test, expect, URL, edit, editorValue, expectThreeSame, holdNodes, sameNode, isStillConnected, observeMutations, structureOf } from './phase1-helpers';
import type { NodeSpec } from './phase1-helpers';

// [AI Note]: Patch 흐름 인수 시나리오 (QA-2 ~ QA-10). 편집은 편집창 글을 읽어 일부만 바꿔 다시 채운다 (샘플 들여쓰기에 기대지 않음).
// 참조 유지는 holdNodes로 window.__keep에 붙잡아 두고 ===로 비교한다. 부분 갱신은 MutationObserver 종류별 개수로 증명한다 (B1 · B2).

/** 초기 샘플에서 붙잡아 둘 노드 (이름 → 영역 안 선택자) */
const SAMPLE_NODES: Record<string, string> = {
  section: '#card',
  h2: 'h2',
  p: 'p.note',
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

async function clickPatch(page: Page): Promise<void> {
  await page.getByTestId('btn-patch').click();
}

/** 이름 목록 중 현재 `specs[name]`과 같은 참조인 것만 확인한다 */
async function expectSame(page: Page, names: string[], specs: Record<string, NodeSpec> = SAMPLE_NODES): Promise<void> {
  for (const name of names) {
    expect(await sameNode(page, name, specs[name]), `${name}는 같은 참조여야 한다`).toBe(true);
  }
}

test('QA-2 글자 하나를 고치고 Patch하면 그 글자만 바뀌고 MutationObserver 기록은 characterData 1건뿐이다', async ({ page }) => {
  await open(page);
  await holdNodes(page, SAMPLE_NODES);
  const watcher = await observeMutations(page);

  const typed = await edit(page, (t) => t.replace('안녕', '반가워'));
  await clickPatch(page);

  await expect(page.getByTestId('real-area').locator('p.note')).toHaveText('반가워');
  expect(await structureOf(page, 'real-area')).toEqual(await structureOf(page, 'test-area'));
  // 글자 노드를 뺀 다른 노드는 같은 참조
  await expectSame(page, Object.keys(SAMPLE_NODES));
  // (B1) characterData 정확히 1건, childList · attributes 0건
  const mutations = await watcher.takeSummary();
  expect(mutations).toMatchObject({ characterData: 1, childList: 0, attributes: 0, total: 1 });
  expect(mutations.targets).toEqual(['characterData:#text']);
  // (B7) Patch 성공 뒤 편집창 글은 친 그대로다 (스냅샷 글로 바뀌지 않음)
  expect(await editorValue(page)).toBe(typed);
});

test('QA-3 속성 추가 · 수정 · 삭제를 Patch하면 실제 영역 속성이 같아지고 요소는 같은 참조다 (속성 순서는 비교하지 않는다)', async ({ page }) => {
  await open(page);
  await holdNodes(page, SAMPLE_NODES);

  await edit(page, (t) =>
    t
      // title을 class보다 앞에 쓴다 (실제 영역에서는 SET_ATTR로 맨 뒤에 붙어 속성 순서가 달라진다, A4)
      .replace('<p class="note"', '<p title="새 제목" class="note2"')
      .replace('<section id="card" class="card">', '<section class="card">'),
  );
  await clickPatch(page);

  const real = page.getByTestId('real-area');
  const testArea = page.getByTestId('test-area');
  await expect(real.locator('p')).toHaveAttribute('title', '새 제목');
  await expect(real.locator('p')).toHaveAttribute('class', 'note2');
  await expect(real.locator('section')).not.toHaveAttribute('id', /.*/);
  expect(await real.locator('p').evaluate((e) => e.getAttributeNames())).toEqual(['class', 'style', 'title']);
  expect(await testArea.locator('p').evaluate((e) => e.getAttributeNames())).toEqual(['title', 'class', 'style']);
  expect(await structureOf(page, 'real-area')).toEqual(await structureOf(page, 'test-area'));
  await expectSame(page, ['section', 'p', 'ul', 'button'], { ...SAMPLE_NODES, section: 'section', p: 'p' });
});

test('QA-4 <ul> 끝에 <li>를 추가하고 Patch하면 <li>가 4개가 되고 앞 세 <li>는 같은 참조다', async ({ page }) => {
  await open(page);
  await holdNodes(page, SAMPLE_NODES);

  await edit(page, (t) => t.replace('<li>셋</li>', '<li>셋</li>\n    <li>넷</li>'));
  await clickPatch(page);

  const items = page.getByTestId('real-area').locator('li');
  await expect(items).toHaveCount(4);
  await expect(items.nth(3)).toHaveText('넷');
  expect(await structureOf(page, 'real-area')).toEqual(await structureOf(page, 'test-area'));
  await expectSame(page, ['li1', 'li2', 'li3', 'ul', 'section']);
});

test('QA-5 가운데 <li>를 지우면 위치 비교라서 둘째 노드는 남고 셋째 노드가 지워진다 / 여러 개를 한꺼번에 지워도 맞다', async ({ page }) => {
  await open(page);
  await holdNodes(page, SAMPLE_NODES);

  // (a) 가운데 <li>둘을 지운다 (A2)
  await edit(page, (t) => t.replace('    <li>둘</li>\n', ''));
  await clickPatch(page);

  const real = page.getByTestId('real-area');
  await expect(real.locator('li')).toHaveText(['하나', '셋']);
  expect(await structureOf(page, 'real-area')).toEqual(await structureOf(page, 'test-area'));
  // 위치 비교: 원래 둘째 <li> 노드는 그대로 남아 글자만 '셋'으로 바뀌고, 원래 셋째 <li>가 지워진다
  expect(await sameNode(page, 'li2', 'li:nth-of-type(2)')).toBe(true);
  expect(await isStillConnected(page, 'li3')).toBe(false);
  await expectSame(page, ['ul', 'li1', 'section', 'h2', 'p', 'button']);

  // (b) 다시 처음 상태에서 <li> 둘을 한꺼번에 지우고 <p> 글자도 바꾼다
  await open(page);
  await holdNodes(page, SAMPLE_NODES);
  await edit(page, (t) => t.replace('    <li>둘</li>\n    <li>셋</li>\n', '').replace('안녕', '바뀜'));
  await clickPatch(page);

  await expect(real.locator('li')).toHaveText(['하나']);
  await expect(real.locator('p.note')).toHaveText('바뀜');
  expect(await structureOf(page, 'real-area')).toEqual(await structureOf(page, 'test-area'));
  await expectSame(page, ['ul', 'li1', 'section', 'h2', 'p', 'button']);
});

test('QA-6 <ul>을 <ol>로 바꾸고 Patch하면 <ol>과 그 안의 <li>는 새 노드이고 주변 요소는 같은 참조다', async ({ page }) => {
  await open(page);
  await holdNodes(page, SAMPLE_NODES);

  await edit(page, (t) => t.replace('<ul>', '<ol>').replace('</ul>', '</ol>'));
  await clickPatch(page);

  const real = page.getByTestId('real-area');
  await expect(real.locator('ol')).toHaveCount(1);
  await expect(real.locator('ul')).toHaveCount(0);
  await expect(real.locator('ol > li')).toHaveText(['하나', '둘', '셋']);
  expect(await structureOf(page, 'real-area')).toEqual(await structureOf(page, 'test-area'));
  // (A3) 교체는 하위 구조까지 새로 만든다: 옛 <ul> · <li> 세 개와 다른 노드
  expect(await sameNode(page, 'ul', 'ol')).toBe(false);
  for (const [i, name] of ['li1', 'li2', 'li3'].entries()) {
    expect(await sameNode(page, name, `ol > li:nth-of-type(${i + 1})`), `${name}는 새 노드여야 한다`).toBe(false);
  }
  await expectSame(page, ['section', 'h2', 'p', 'button']);
});

test('QA-7 글자 · 속성 · 삭제 · 추가 · 교체를 한꺼번에 Patch해도 실제 영역이 테스트 영역과 같다', async ({ page }) => {
  await open(page);
  await holdNodes(page, SAMPLE_NODES);

  await edit(page, (t) =>
    t
      .replace('<h2>제목</h2>', '<h2>새 제목</h2>')
      .replace('<li>하나</li>', '<li class="first">하나</li>')
      .replace('    <li>둘</li>\n', '')
      .replace('<li>셋</li>', '<li>셋</li>\n    <li>넷</li>')
      .replace(/<button[^>]*>잠김<\/button>/, '<a>링크</a>'), // boolean 속성은 편집창에서 disabled=""로 보인다
  );
  await clickPatch(page);

  const real = page.getByTestId('real-area');
  await expect(real.locator('h2')).toHaveText('새 제목');
  await expect(real.locator('li').first()).toHaveClass('first');
  await expect(real.locator('button')).toHaveCount(0);
  await expect(real.locator('a')).toHaveText('링크');
  expect(await structureOf(page, 'real-area')).toEqual(await structureOf(page, 'test-area'));
  await expectThreeSame(page);
});

test('QA-8 편집 없이 Patch를 누르면 실제 영역 DOM 변경이 0건이고 뒤로를 눌러도 아무 일 없다', async ({ page }) => {
  await open(page);
  const watcher = await observeMutations(page);
  const before = await editorValue(page);
  const structBefore = await structureOf(page, 'real-area');

  await clickPatch(page);
  expect((await watcher.takeSummary()).total).toBe(0);

  // 기록이 안 생겼으므로 뒤로는 무시된다
  await page.getByTestId('btn-back').click();
  expect((await watcher.takeSummary()).total).toBe(0);
  expect(await structureOf(page, 'real-area')).toEqual(structBefore);
  expect(await editorValue(page)).toBe(before);
});

test('QA-9 글자 하나와 class만 바꾸고 Patch하면 characterData 1건 + attributes 1건뿐이고 부모 · 형제는 같은 참조다', async ({ page }) => {
  await open(page);
  await holdNodes(page, SAMPLE_NODES);
  const watcher = await observeMutations(page);

  await edit(page, (t) => t.replace('class="note"', 'class="note big"').replace('안녕', '안녕하세요'));
  await clickPatch(page);

  const real = page.getByTestId('real-area');
  await expect(real.locator('p.note')).toHaveText('안녕하세요');
  await expect(real.locator('p')).toHaveClass('note big');
  await expectSame(page, Object.keys(SAMPLE_NODES));
  // (B2) characterData 1건 + attributes 1건, childList 0건
  const mutations = await watcher.takeSummary();
  expect(mutations).toMatchObject({ characterData: 1, attributes: 1, childList: 0, total: 2 });
  expect(mutations.targets.sort()).toEqual(['attributes:p', 'characterData:#text']);
  expect(await structureOf(page, 'real-area')).toEqual(await structureOf(page, 'test-area'));
});

test('QA-10 편집 → Patch → 같은 편집창에서 다른 편집 → Patch해도 직전 반영 상태 기준으로 맞다', async ({ page }) => {
  await open(page);
  const real = page.getByTestId('real-area');

  await edit(page, (t) => t.replace('안녕', '반가워'));
  await clickPatch(page);
  await expect(real.locator('p.note')).toHaveText('반가워');
  expect(await structureOf(page, 'real-area')).toEqual(await structureOf(page, 'test-area'));

  await holdNodes(page, SAMPLE_NODES);
  await edit(page, (t) => t.replace('<h2>제목</h2>', '<h2>새 제목</h2>'));
  await clickPatch(page);

  await expect(real.locator('h2')).toHaveText('새 제목');
  // 첫 Patch의 변경이 유지된다
  await expect(real.locator('p.note')).toHaveText('반가워');
  expect(await structureOf(page, 'real-area')).toEqual(await structureOf(page, 'test-area'));
  await expectSame(page, ['section', 'h2', 'p', 'ul', 'button']);
});
