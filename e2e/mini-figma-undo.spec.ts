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
  rgb,
  bgOf,
  colorsOf,
  pickColor,
} from './mini-figma-helpers';

// [AI Note]: QA-19 ~ QA-25 (키보드 Undo · Redo · Delete, Dev-11). 이 스펙의 테스트는 desktop · mobile 두 프로젝트에서 모두 돈다.
// Undo · Redo를 누르기 전에는 도우미(pressUndo · pressRedo)가 포커스를 라벨 글자 칸 밖으로 뺀다 — 라벨 글자 칸 안의 키는 앱이 무시하기 때문이다.

/** 캔버스 버튼 하나의 class 글 */
async function classOf(page: Page, id: string): Promise<string[]> {
  return ((await page.locator(buttonSel(id)).getAttribute('class')) ?? '').split(' ');
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
  await pickColor(page, '#cf202f');
  expect(await colorsOf(page)).toEqual([rgb('#cf202f'), rgb('#cf202f'), rgb('#cf202f'), rgb('#cf202f')]);
}

test('QA-19 메인 색을 빨강으로 바꾼 뒤 Ctrl+Z는 파랑으로, Ctrl+Shift+Z는 다시 빨강으로 되돌리고 고르기는 그대로다', async ({ page }) => {
  await makeMainRed(page);
  // b3는 처음부터 빨강(override)이라 메인 색을 바꿔도 그대로, 비교는 메인 · b1 · b2
  await pressUndo(page);

  expect((await colorsOf(page)).slice(0, 3)).toEqual([rgb('#0052ff'), rgb('#0052ff'), rgb('#0052ff')]);
  await expect(page.getByTestId('prop-color')).toHaveValue('#0052ff');
  expect(await selectedOnCanvas(page)).toEqual(['main']);

  await pressRedo(page);

  expect((await colorsOf(page)).slice(0, 3)).toEqual([rgb('#cf202f'), rgb('#cf202f'), rgb('#cf202f')]);
  await expect(page.getByTestId('prop-color')).toHaveValue('#cf202f');
  expect(await selectedOnCanvas(page)).toEqual(['main']);
});

test('QA-20 Meta+Z · Meta+Shift+Z(맥의 Cmd)도 QA-19와 같다', async ({ page }) => {
  await makeMainRed(page);

  await pressMetaUndo(page);
  expect((await colorsOf(page)).slice(0, 3)).toEqual([rgb('#0052ff'), rgb('#0052ff'), rgb('#0052ff')]);
  await expect(page.getByTestId('prop-color')).toHaveValue('#0052ff');

  await pressMetaRedo(page);
  expect((await colorsOf(page)).slice(0, 3)).toEqual([rgb('#cf202f'), rgb('#cf202f'), rgb('#cf202f')]);
  await expect(page.getByTestId('prop-color')).toHaveValue('#cf202f');
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
  await pickColor(page, '#cf202f');
  await page.getByTestId('prop-size').selectOption('L');

  await pressUndo(page);
  await pressUndo(page);
  expect(await classOf(page, 'main')).toContain('btn-M');
  expect(await bgOf(page, 'main')).toBe(rgb('#0052ff'));

  await page.getByTestId('prop-label').fill('새');
  await pressRedo(page);

  // 다시 하기가 버려져서 색 파랑 · 크기 M 그대로, 라벨 `새`
  expect(await bgOf(page, 'main')).toBe(rgb('#0052ff'));
  expect(await classOf(page, 'main')).toContain('btn-M');
  expect((await canvasLabels(page))[0]).toBe('새');

  await pressUndo(page);
  expect((await canvasLabels(page))[0]).toBe('버튼');
  expect(await bgOf(page, 'main')).toBe(rgb('#0052ff'));
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
  await pickColor(page, '#05b169');
  expect(await bgOf(page, 'b2')).toBe(rgb('#05b169'));
  await selectOnCanvas(page, 'b1');
  await selectOnCanvas(page, 'b3');

  await pressUndo(page);

  expect(await bgOf(page, 'b2')).toBe(rgb('#0052ff'));
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

test('QA-29 메인 라벨 `새` 입력 후 색을 빨강으로 바꾸고 Ctrl+Z하면 색만 한 단계 되돌아가고(브라우저 기본 Undo와 겹치지 않음), Redo · Undo도 한 단계씩이다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');
  await page.getByTestId('prop-label').fill('새');
  await pickColor(page, '#cf202f');
  expect((await canvasLabels(page))[0]).toBe('새');
  expect(await bgOf(page, 'main')).toBe(rgb('#cf202f'));
  // [AI Note]: 위에서 다른 것을 다시 고르지 않는다 — 라벨 입력칸 값이 프로그램으로 다시 쓰이지 않아 브라우저 기본 글자 되돌리기 기록이 남은 채로 Ctrl+Z가 겹치는지 보려는 것

  await pressUndo(page);
  expect((await canvasLabels(page))[0], '색만 되돌아가고 글자는 그대로').toBe('새');
  expect(await bgOf(page, 'main')).toBe(rgb('#0052ff'));

  await pressRedo(page);
  expect(await bgOf(page, 'main')).toBe(rgb('#cf202f'));
  expect((await canvasLabels(page))[0]).toBe('새');

  await pressUndo(page);
  expect(await bgOf(page, 'main')).toBe(rgb('#0052ff'));
  expect((await canvasLabels(page))[0], '한 단계만').toBe('새');

  await pressUndo(page);
  expect((await canvasLabels(page))[0]).toBe('버튼');
});

test('QA-30 선택 상자 · 체크박스에 포커스가 남은 채 Ctrl+Z · Ctrl+Shift+Z도 앱 Undo · Redo이고 라벨 칸 글자는 건드리지 않는다 (Q18 ②)', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');
  await page.getByTestId('prop-label').fill('새');
  const size = page.getByTestId('prop-size');
  await size.selectOption('L');
  await size.focus(); // 포커스를 선택 상자에 둔 채로 키를 누른다 (blurFocus를 안 부름)
  expect(await classOf(page, 'main')).toContain('btn-L');

  await page.keyboard.press('Control+KeyZ');
  expect(await classOf(page, 'main'), '크기 되돌아감').toContain('btn-M');
  expect((await canvasLabels(page))[0], '글자는 그대로').toBe('새');
  await expect(page.getByTestId('prop-label')).toHaveValue('새');

  await page.keyboard.press('Control+Shift+KeyZ');
  expect(await classOf(page, 'main'), '다시 L').toContain('btn-L');
  expect((await canvasLabels(page))[0]).toBe('새');

  // 체크박스: 아이콘 보이기를 켜고 (포커스가 체크박스에 남음) Ctrl+Z → 꺼짐, Ctrl+Shift+Z → 켜짐
  const hasIcon = page.getByTestId('prop-hasicon');
  await hasIcon.click();
  await hasIcon.focus();
  await expect(page.locator(`${buttonSel('main')} .btn-icon`)).toHaveCount(1);
  await page.keyboard.press('Control+KeyZ');
  await expect(page.locator(`${buttonSel('main')} .btn-icon`)).toHaveCount(0);
  expect((await canvasLabels(page))[0]).toBe('새');
  expect(await classOf(page, 'main')).toContain('btn-L');
  await page.keyboard.press('Control+Shift+KeyZ');
  await expect(page.locator(`${buttonSel('main')} .btn-icon`)).toHaveCount(1);
  expect((await canvasLabels(page))[0]).toBe('새');
});
