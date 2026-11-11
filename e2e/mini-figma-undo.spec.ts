import type { Page } from '@playwright/test';
import {
  test,
  expect,
  URL,
  holdNodes,
  sameNode,
  selectOnCanvas,
  canvasOrder,
  layerOrder,
  canvasLabels,
  selectedOnCanvas,
  selectedInLayer,
  buttonSel,
  inRow,
  moveInLayer,
  blurFocus,
  pressUndo,
  pressRedo,
} from './mini-figma-helpers';

// [AI Note]: QA-19 ~ QA-25 (키보드 Undo · Redo · Delete, Dev-11). 이 스펙의 테스트는 desktop · mobile 두 프로젝트에서 모두 돈다.
// Undo · Redo를 누르기 전에는 도우미(pressUndo · pressRedo)가 포커스를 입력칸 밖으로 뺀다 — 입력칸 안의 키는 앱이 무시하기 때문이다.

/** 캔버스 버튼 하나의 class 글 */
async function classOf(page: Page, id: string): Promise<string[]> {
  return ((await page.locator(buttonSel(id)).getAttribute('class')) ?? '').split(' ');
}

/** 메인 · b1 · b2 · b3 버튼의 색 클래스 (btn-blue · btn-red · btn-green) */
async function colorsOf(page: Page): Promise<string[]> {
  const out: string[] = [];
  for (const id of ['main', 'b1', 'b2', 'b3']) out.push((await classOf(page, id)).find((c) => c.startsWith('btn-') && ['btn-blue', 'btn-red', 'btn-green'].includes(c)) ?? '');
  return out;
}

async function pressMetaUndo(page: Page): Promise<void> {
  await blurFocus(page);
  await page.keyboard.press('Meta+KeyZ');
}

async function pressMetaRedo(page: Page): Promise<void> {
  await blurFocus(page);
  await page.keyboard.press('Meta+Shift+KeyZ');
}

/** 메인을 고르고 색을 빨강으로 바꾼 상태를 만든다 (Undo 한 단계) */
async function makeMainRed(page: Page): Promise<void> {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');
  await page.getByTestId('prop-color').selectOption({ label: '빨강' });
  expect(await colorsOf(page)).toEqual(['btn-red', 'btn-red', 'btn-red', 'btn-red']);
}

test('QA-19 메인 색을 빨강으로 바꾼 뒤 Ctrl+Z는 파랑으로, Ctrl+Shift+Z는 다시 빨강으로 되돌리고 고르기는 그대로다', async ({ page }) => {
  await makeMainRed(page);
  // b3는 처음부터 빨강(override)이라 메인 색을 바꿔도 그대로, 비교는 메인 · b1 · b2
  await pressUndo(page);

  expect((await colorsOf(page)).slice(0, 3)).toEqual(['btn-blue', 'btn-blue', 'btn-blue']);
  await expect(page.getByTestId('prop-color')).toHaveValue('blue');
  expect(await selectedOnCanvas(page)).toEqual(['main']);

  await pressRedo(page);

  expect((await colorsOf(page)).slice(0, 3)).toEqual(['btn-red', 'btn-red', 'btn-red']);
  await expect(page.getByTestId('prop-color')).toHaveValue('red');
  expect(await selectedOnCanvas(page)).toEqual(['main']);
});

test('QA-20 Meta+Z · Meta+Shift+Z(맥의 Cmd)도 QA-19와 같다', async ({ page }) => {
  await makeMainRed(page);

  await pressMetaUndo(page);
  expect((await colorsOf(page)).slice(0, 3)).toEqual(['btn-blue', 'btn-blue', 'btn-blue']);
  await expect(page.getByTestId('prop-color')).toHaveValue('blue');

  await pressMetaRedo(page);
  expect((await colorsOf(page)).slice(0, 3)).toEqual(['btn-red', 'btn-red', 'btn-red']);
  await expect(page.getByTestId('prop-color')).toHaveValue('red');
  expect(await selectedOnCanvas(page)).toEqual(['main']);
});

test('QA-21 b3 라벨을 한 글자씩 입력해도 Ctrl+Z 한 번에 `삭제`로 돌아가고(묶음 시작 직전), 한 번 더는 아무 일 없고, Ctrl+Shift+Z는 `지우기`로 간다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'b3');
  const input = page.getByTestId('prop-label');
  await input.fill('');
  await input.pressSequentially('지우기');
  expect((await canvasLabels(page))[3]).toBe('지우기');
  // [AI Note]: 다른 것을 골랐다 돌아오면 입력칸 값이 프로그램으로 다시 쓰여 브라우저의 글자 되돌리기(네이티브 Undo) 기록이 비워진다.
  // (고르기는 Undo 묶음을 끝내지 않으므로 앱 입장에서는 같은 묶음이다.) 그래야 아래 되돌리기가 앱 Undo의 결과라는 것이 분명하다.
  await selectOnCanvas(page, 'b2');
  await selectOnCanvas(page, 'b3');

  await pressUndo(page);
  expect((await canvasLabels(page))[3], '중간 글자가 아니라 묶음 시작 직전').toBe('삭제');
  await expect(input).toHaveValue('삭제');

  await pressUndo(page);
  expect(await canvasLabels(page)).toEqual(['버튼', '버튼', '취소', '삭제']);

  await pressRedo(page);
  expect((await canvasLabels(page))[3]).toBe('지우기');
  await expect(input).toHaveValue('지우기');
});

test('QA-22 서로 다른 묶음 8개를 쌓고 Ctrl+Z를 8번 누르면 매번 정확히 한 단계씩만 되돌아가고 9번째는 아무 일 없다', async ({ page }) => {
  await page.goto(URL);
  const labelInput = page.getByTestId('prop-label');
  /** 화면 상태 한 줄: 캔버스 순서 · 글자 · b1이 크기 S인가 */
  const snap = async (): Promise<string> => {
    const order = await canvasOrder(page);
    const labels = await canvasLabels(page);
    const b1Small = order.includes('b1') ? (await classOf(page, 'b1')).includes('btn-S') : false;
    return `${order.join(',')} | ${labels.join(',')} | b1S=${b1Small}`;
  };
  const states: string[] = [await snap()];

  // 1) b1 라벨 가  2) b1 크기 S  3) b1 라벨 나  4) b2 라벨 다  5) [+ 인스턴스]  6) b4 [↑]  7) b1 라벨 ↻  8) b4 삭제
  await selectOnCanvas(page, 'b1');
  await labelInput.fill('가');
  states.push(await snap());
  await page.getByTestId('prop-size').selectOption('S');
  states.push(await snap());
  await labelInput.fill('나');
  states.push(await snap());
  await selectOnCanvas(page, 'b2');
  await labelInput.fill('다');
  states.push(await snap());
  await page.getByTestId('add-instance').click();
  states.push(await snap());
  await moveInLayer(page, 'b4', 'up');
  states.push(await snap());
  await selectOnCanvas(page, 'b1');
  await page.locator(inRow('label', 'prop-reset')).click();
  states.push(await snap());
  await selectOnCanvas(page, 'b4');
  await page.getByTestId('delete-instance').click();
  states.push(await snap());

  expect(states).toHaveLength(9);
  expect(new Set(states).size, '각 단계가 서로 다른 모습').toBe(9);
  expect(states[8]).toBe('b1,b2,b3 | 버튼,버튼,다,삭제 | b1S=true');

  // Ctrl+Z 8번: 삭제 → ↻ → 순서 → 추가 → b2 라벨 → b1 라벨 나 → 크기 → 라벨 가 (매번 states[7 - i]와 같음)
  for (let i = 1; i <= 8; i += 1) {
    await pressUndo(page);
    expect(await snap(), `Ctrl+Z ${i}번째`).toBe(states[8 - i]);
  }
  expect(await snap()).toBe(states[0]);
  // 9번째는 아무 일 없음
  await pressUndo(page);
  expect(await snap(), 'Ctrl+Z 9번째').toBe(states[0]);
});

test('QA-23 새 수정을 하면 다시 하기가 버려진다 (Undo 두 번 → 라벨 `새` → Ctrl+Shift+Z는 아무 일 없음, Ctrl+Z는 `새`만 되돌림)', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');
  await page.getByTestId('prop-color').selectOption({ label: '빨강' });
  await page.getByTestId('prop-size').selectOption('L');

  await pressUndo(page);
  await pressUndo(page);
  const afterUndo = await classOf(page, 'main');
  expect(afterUndo).toContain('btn-M');
  expect(afterUndo).toContain('btn-blue');

  await page.getByTestId('prop-label').fill('새');
  await pressRedo(page);

  // 다시 하기가 버려져서 색 파랑 · 크기 M 그대로, 라벨 `새`
  const main = await classOf(page, 'main');
  expect(main).toContain('btn-blue');
  expect(main).toContain('btn-M');
  expect((await canvasLabels(page))[0]).toBe('새');

  await pressUndo(page);
  expect((await canvasLabels(page))[0]).toBe('버튼');
  expect(await classOf(page, 'main')).toContain('btn-blue');
});

test('QA-24 추가를 Undo하면 b4가 사라지고 선택이 풀리며, 고르기는 기록에 없어서 다음 Undo는 색 수정 한 단계만 되돌린다', async ({ page }) => {
  await page.goto(URL);
  await page.getByTestId('add-instance').click();
  await selectOnCanvas(page, 'b4');
  expect(await selectedOnCanvas(page)).toEqual(['b4']);

  await pressUndo(page);

  expect(await canvasOrder(page)).toEqual(['b1', 'b2', 'b3']);
  expect(await layerOrder(page)).toEqual(['b1', 'b2', 'b3']);
  await expect(page.getByTestId('property-empty')).toHaveCount(1);
  expect(await selectedOnCanvas(page)).toEqual([]);

  // b2 색을 바꾼 뒤 b1 · b3를 차례로 고르고(고르기만) Undo
  await selectOnCanvas(page, 'b2');
  await page.getByTestId('prop-color').selectOption({ label: '초록' });
  expect(await classOf(page, 'b2')).toContain('btn-green');
  await selectOnCanvas(page, 'b1');
  await selectOnCanvas(page, 'b3');

  await pressUndo(page);

  expect(await classOf(page, 'b2')).toContain('btn-blue');
  // 고르기는 기록에 없으므로 고른 것은 b3 그대로 (b1으로 돌아가지 않음)
  expect(await selectedOnCanvas(page)).toEqual(['b3']);
  expect(await selectedInLayer(page)).toEqual(['b3']);
});

test('QA-25 b2를 고르고 Delete, b3를 고르고 Backspace로 지우고 Ctrl+Z하면 b3가 원래 자리(b1 뒤)로 돌아오고 선택은 풀린 채다', async ({ page }) => {
  await page.goto(URL);
  await holdNodes(page, { btn1: buttonSel('b1') });

  await selectOnCanvas(page, 'b2');
  await page.keyboard.press('Delete');
  expect(await canvasOrder(page)).toEqual(['b1', 'b3']);
  expect(await layerOrder(page)).toEqual(['b1', 'b3']);
  await expect(page.getByTestId('property-empty')).toHaveCount(1);

  await selectOnCanvas(page, 'b3');
  await page.keyboard.press('Backspace');
  expect(await canvasOrder(page)).toEqual(['b1']);
  expect(await layerOrder(page)).toEqual(['b1']);
  await expect(page.getByTestId('property-empty')).toHaveCount(1);

  await pressUndo(page);

  expect(await canvasOrder(page)).toEqual(['b1', 'b3']);
  expect(await layerOrder(page)).toEqual(['b1', 'b3']);
  await expect(page.getByTestId('property-empty')).toHaveCount(1);
  expect(await selectedOnCanvas(page)).toEqual([]);
  expect(await sameNode(page, 'btn1', buttonSel('b1'))).toBe(true);
});
