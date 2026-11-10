import type { Page } from '@playwright/test';
import { test, expect, URL, edit, expectThreeSame, observeMutations } from './phase1-helpers';

// [AI Note]: Diff 시각화(확장) 인수 시나리오 (QA-22, A1). 깜빡임은 CSS 애니메이션으로 사라지므로 상자 DOM을 직접 세지 않고
// 페이지가 남기는 숫자(`viz-overlay`의 data-last-patch-count · data-last-flash-count)로 개수를 확인한다.
// 위치는 오버레이에 상자가 붙는 순간을 MutationObserver로 붙잡아 그 자리의 좌표를 기록해 비교한다 (애니메이션 시간에 안 흔들림).

const patchButton = (page: Page) => page.getByTestId('btn-patch');
const backButton = (page: Page) => page.getByTestId('btn-back');
const forwardButton = (page: Page) => page.getByTestId('btn-forward');
const toggle = (page: Page) => page.getByTestId('viz-toggle');
const overlay = (page: Page) => page.getByTestId('viz-overlay');

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** 이번 동작에서 페이지가 남긴 숫자 */
async function counts(page: Page): Promise<{ patch: number; flash: number }> {
  const read = async (name: string): Promise<number> => {
    const raw = await overlay(page).getAttribute(name);
    expect(raw, `${name} 속성이 있어야 한다`).not.toBeNull();
    return Number(raw);
  };
  return { patch: await read('data-last-patch-count'), flash: await read('data-last-flash-count') };
}

/** 오버레이에 상자가 붙는 순간의 위치(페이지 좌표)를 모은다. `take()`가 지금까지 모인 것을 돌려주고 비운다 */
async function recordFlashes(page: Page): Promise<{ take(): Promise<Box[]> }> {
  await page.evaluate(() => {
    const target = document.querySelector('[data-testid="viz-overlay"]')!;
    const store: Box[] = [];
    const collect = (records: MutationRecord[]): void => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          const r = node.getBoundingClientRect();
          store.push({ left: r.left + scrollX, top: r.top + scrollY, right: r.right + scrollX, bottom: r.bottom + scrollY });
        });
      }
    };
    const observer = new MutationObserver(collect);
    observer.observe(target, { childList: true });
    (window as unknown as Record<string, unknown>).__flashes = { store, observer, collect };
  });
  return {
    async take() {
      return page.evaluate(() => {
        const slot = (
          window as unknown as Record<string, { store: Box[]; observer: MutationObserver; collect: (records: MutationRecord[]) => void }>
        ).__flashes;
        slot.collect(slot.observer.takeRecords());
        return slot.store.splice(0);
      });
    },
  };
}

/** 실제 영역 안 선택자(`child`가 있으면 그 자식 글자 노드)의 위치(페이지 좌표) */
async function realBox(page: Page, selector: string, child?: number): Promise<Box> {
  return page.evaluate(
    ({ selector, child }) => {
      const element = document.querySelector(`[data-testid="real-area"] ${selector}`)!;
      let r: DOMRect;
      if (child === undefined) r = element.getBoundingClientRect();
      else {
        const range = document.createRange();
        range.selectNodeContents(element.childNodes[child]);
        r = range.getBoundingClientRect();
      }
      return { left: r.left + scrollX, top: r.top + scrollY, right: r.right + scrollX, bottom: r.bottom + scrollY };
    },
    { selector, child },
  );
}

/** `inner`가 `outer` 안에 (오차 `slack` 픽셀까지) 들어 있다 */
function within(inner: Box, outer: Box, slack = 3): boolean {
  return inner.left >= outer.left - slack && inner.top >= outer.top - slack && inner.right <= outer.right + slack && inner.bottom <= outer.bottom + slack;
}

function overlaps(a: Box, b: Box): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

test('QA-22 시각화는 기본 꺼짐이고, 켜면 Patch · 뒤로 · 앞으로에서 깜빡임 개수가 그 동작의 patch 개수와 같으며, 실제 영역에는 표시용 변경이 없고, 끄면 깜빡임이 다시 0이다', async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByTestId('real-area').locator('section#card')).toBeVisible();

  // 기본 꺼짐 · 오버레이는 실제 영역 밖에서 마우스를 가로채지 않는다
  await expect(toggle(page)).not.toBeChecked();
  const placement = await page.evaluate(() => {
    const real = document.querySelector('[data-testid="real-area"]')!;
    const layer = document.querySelector('[data-testid="viz-overlay"]')!;
    return { inside: real.contains(layer), pointerEvents: getComputedStyle(layer).pointerEvents };
  });
  expect(placement).toEqual({ inside: false, pointerEvents: 'none' });

  const flashes = await recordFlashes(page);
  const watcher = await observeMutations(page);

  // 꺼짐: 글자 하나 Patch → patch 개수는 1 이상(= 1)이고 깜빡임은 0
  await edit(page, (t) => t.replace('안녕', '반가워'));
  await patchButton(page).click();
  const off = await counts(page);
  expect(off.patch, '꺼져 있어도 patch 개수는 남긴다').toBeGreaterThanOrEqual(1);
  expect(off.flash, '꺼짐에서는 깜빡임 0').toBe(0);
  expect(await flashes.take(), '꺼짐에서는 상자를 그리지 않는다').toEqual([]);
  expect(await watcher.takeSummary()).toMatchObject({ characterData: 1, attributes: 0, childList: 0, total: 1 });

  // 켜기: 글자 하나 Patch → 정확히 1개 (이 숫자만 고정)
  await toggle(page).check();
  await edit(page, (t) => t.replace('반가워', '잘가'));
  await patchButton(page).click();
  expect(await counts(page)).toEqual({ patch: 1, flash: 1 });
  const textBox = await realBox(page, 'p.note', 0);
  const patchFlashes = await flashes.take();
  expect(patchFlashes, '글자 하나 Patch는 상자 하나').toHaveLength(1);
  expect(overlaps(patchFlashes[0], textBox), '상자가 바뀐 글자 위에 겹친다').toBe(true);
  expect(within(patchFlashes[0], textBox), '상자는 바뀐 글자만 감싼다 (영역 전체가 아니다)').toBe(true);
  // 켜져 있어도 실제 영역 DOM 변경은 같다 (글자 하나뿐), 표시용 class · 속성 없음 (구조가 테스트 영역과 같다)
  expect(await watcher.takeSummary()).toMatchObject({ characterData: 1, attributes: 0, childList: 0, total: 1 });
  await expectThreeSame(page);
  // 상자는 애니메이션이 끝나면 지워진다
  await expect(overlay(page).locator('*')).toHaveCount(0, { timeout: 5000 });

  // 뒤로 · 앞으로: 같은 1개짜리 patch라 둘 다 1
  await backButton(page).click();
  expect(await counts(page)).toEqual({ patch: 1, flash: 1 });
  expect(overlaps((await flashes.take())[0], await realBox(page, 'p.note', 0)), '뒤로: 바뀐 글자 위').toBe(true);
  expect(await watcher.takeSummary()).toMatchObject({ characterData: 1, attributes: 0, childList: 0, total: 1 });
  await expectThreeSame(page);

  await forwardButton(page).click();
  expect(await counts(page)).toEqual({ patch: 1, flash: 1 });
  expect(overlaps((await flashes.take())[0], await realBox(page, 'p.note', 0)), '앞으로: 바뀐 글자 위').toBe(true);
  expect(await watcher.takeSummary()).toMatchObject({ characterData: 1, attributes: 0, childList: 0, total: 1 });
  await expectThreeSame(page);

  // <li> 하나 삭제 Patch: 공백 글자 노드도 함께 바뀌어 patch가 여러 개일 수 있다 → 숫자는 고정하지 않고 "깜빡임 = patch"만 본다
  const li3Before = await realBox(page, 'li:nth-of-type(3)');
  await edit(page, (t) => t.replace(/\s*<li>셋<\/li>/, ''));
  await patchButton(page).click();
  const removed = await counts(page);
  expect(removed.patch).toBeGreaterThanOrEqual(1);
  expect(removed.flash, '깜빡임 개수 = patch 개수').toBe(removed.patch);
  const removeFlashes = await flashes.take();
  expect(removeFlashes).toHaveLength(removed.patch);
  expect(removeFlashes.some((box) => overlaps(box, li3Before)), '지워진 <li>는 지우기 전 자리에 상자가 겹친다').toBe(true);
  await expect(page.getByTestId('real-area').locator('li')).toHaveCount(2);
  await expectThreeSame(page);

  // 삭제를 뒤로 되돌릴 때도 깜빡임 = patch
  await backButton(page).click();
  const undone = await counts(page);
  expect(undone.patch).toBeGreaterThanOrEqual(1);
  expect(undone.flash).toBe(undone.patch);
  expect(await flashes.take()).toHaveLength(undone.patch);
  await expect(page.getByTestId('real-area').locator('li')).toHaveCount(3);
  await expectThreeSame(page);

  // 끄기: Patch는 되지만 깜빡임은 다시 0 (patch 개수는 계속 남는다)
  await toggle(page).uncheck();
  await edit(page, (t) => t.replace('잘가', '끝'));
  await patchButton(page).click();
  const offAgain = await counts(page);
  expect(offAgain.patch).toBeGreaterThanOrEqual(1);
  expect(offAgain.flash).toBe(0);
  expect(await flashes.take()).toEqual([]);
  await expectThreeSame(page);
  await expect(page.getByTestId('real-area').locator('p.note')).toHaveText('끝');
});
