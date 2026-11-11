import type { Page } from '@playwright/test';
import {
  test,
  expect,
  URL,
  holdNodes,
  sameNode,
  watchApp,
  selectOnCanvas,
  noHorizontalScroll,
  canvasLabels,
  canvasOrder,
  layerOrder,
  buttonSel,
  layerSel,
  inRow,
  moveInLayer,
  selectedOnCanvas,
  selectedInLayer,
  blurFocus,
  pressUndo,
  pressRedo,
  installKeydownCounter,
  keydownListenerCount,
} from './mini-figma-helpers';

// [AI Note]: 공격적 시나리오 모음. 앞 Dev에서 채울 수 있는 것은 그 Dev에서 쓴다 (qa_todo 「Dev」 열): A1 · A2 = Dev-7, A3 ~ A5 = Dev-8.
// 이 스펙의 테스트는 desktop · mobile 두 프로젝트에서 모두 돈다.

test('QA-A1 특수문자 라벨: 마크업이 아니라 글자 그대로 그려지고 onerror가 실행되지 않는다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');
  const input = page.getByTestId('prop-label');

  const first = '<b>굵게</b> &amp; 😀';
  await input.fill(first);
  await expect(input).toHaveValue(first);
  expect((await canvasLabels(page))[0]).toBe(first);
  expect((await canvasLabels(page))[1]).toBe(first);

  const second = '<img src=x onerror="window.__pwned=1">';
  await input.fill(second);
  await expect(input).toHaveValue(second);
  expect((await canvasLabels(page))[0]).toBe(second);
  // 레이어 행 이름(b1은 메인을 따름)도 글자 그대로
  expect(await page.locator('[data-testid="layer-item"][data-id="b1"] [data-testid="layer-name"]').textContent()).toBe(second);

  // <b> · <img> 요소가 생기지 않았고 onerror도 실행되지 않았다
  await expect(page.locator('[data-testid="app-root"] b, [data-testid="app-root"] img')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
});

test('QA-A2 아주 긴 글자: 공백 없는 200자를 넣어도 가로 스크롤이 없고 버튼이 영역 밖으로 삐져나가지 않는다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');
  const long = 'A'.repeat(200);

  await page.getByTestId('prop-label').fill(long);

  expect((await canvasLabels(page))[0]).toBe(long);
  expect(await noHorizontalScroll(page)).toBe(true);
  // 모든 버튼의 오른쪽 끝이 캔버스 오른쪽 끝을 넘지 않는다
  const canvas = await page.getByTestId('canvas').boundingBox();
  if (canvas === null) throw new Error('캔버스가 안 보인다');
  const rights = await page.getByTestId('figma-button').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().right));
  for (const right of rights) expect(right).toBeLessThanOrEqual(canvas.x + canvas.width + 0.5);
  // 입력 한 번이 한 단계라 Ctrl+Z 한 번에 `버튼`으로 돌아온다 (포커스는 pressUndo가 입력칸 밖으로 뺌)
  // [AI Note]: 다른 것을 골랐다 돌아오면 입력칸 값이 프로그램으로 다시 쓰여 브라우저의 글자 되돌리기(네이티브 Undo) 기록이 비워진다 —
  // 그래야 아래 되돌리기가 브라우저가 아니라 앱 Undo의 결과라는 것이 분명하다.
  await selectOnCanvas(page, 'b1');
  await selectOnCanvas(page, 'main');
  await pressUndo(page);
  expect((await canvasLabels(page))[0]).toBe('버튼');
  expect(await noHorizontalScroll(page)).toBe(true);
});

// ---------------------------------------------------------------------------
// Dev-8: override 경계 (A3 · A4 · A5)
// ---------------------------------------------------------------------------

test('QA-A3 빈 라벨 override: b1 라벨을 비우면 메인으로 돌아가지 않고 글자 없는 버튼이 보이며, 레이어 행 이름은 id `b1`이다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'b1');

  await page.getByTestId('prop-label').fill('');

  expect(await canvasLabels(page)).toEqual(['버튼', '', '취소', '삭제']);
  // 글자 없이 배경 색만 있는 버튼이 화면에 보인다 (크기 > 0)
  const box = await page.locator(buttonSel('b1')).boundingBox();
  expect(box === null ? 0 : box.width).toBeGreaterThan(0);
  expect(box === null ? 0 : box.height).toBeGreaterThan(0);
  await expect(page.locator(inRow('label', 'prop-reset'))).toHaveCount(1);
  // 레이어 행 · 패널 머리는 빈 글자 대신 id
  await expect(page.locator(`${layerSel('b1')} [data-testid="layer-name"]`)).toHaveText('b1');
  await expect(page.getByTestId('property-title')).toHaveText('인스턴스 · b1');

  // 메인을 바꿔도 b1은 '' 그대로
  await selectOnCanvas(page, 'main');
  await page.getByTestId('prop-label').fill('저장');
  expect(await canvasLabels(page)).toEqual(['저장', '', '취소', '삭제']);

  // ↻를 누르면 저장
  await selectOnCanvas(page, 'b1');
  await page.locator(inRow('label', 'prop-reset')).click();
  expect(await canvasLabels(page)).toEqual(['저장', '저장', '취소', '삭제']);
});

test('QA-A4 메인과 같은 값 override: b1 라벨을 `버튼x` → `버튼`으로 입력하면 값이 같아도 override로 남고 메인을 바꿔도 `버튼` 그대로다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'b1');
  await page.getByTestId('prop-label').fill('버튼x');
  await page.getByTestId('prop-label').fill('버튼');

  expect(await canvasLabels(page)).toEqual(['버튼', '버튼', '취소', '삭제']);
  await expect(page.locator(inRow('label', 'prop-reset'))).toHaveCount(1);

  await selectOnCanvas(page, 'main');
  await page.getByTestId('prop-label').fill('저장');

  expect(await canvasLabels(page)).toEqual(['저장', '버튼', '취소', '삭제']);
  await selectOnCanvas(page, 'b1');
  await expect(page.locator(inRow('label', 'prop-reset'))).toHaveCount(1);
});

test('QA-A5 ↻ 뒤 메인 변경: b3가 메인을 다시 따라가고 `undefined`가 안 나온다. 메인을 비우면 메인 · b3가 같이 빈 글자다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'b3');
  await page.locator(inRow('color', 'prop-reset')).click();
  await selectOnCanvas(page, 'main');
  await page.getByTestId('prop-color').selectOption({ label: '초록' });

  const b3Class = (await page.locator(buttonSel('b3')).getAttribute('class')) ?? '';
  expect(b3Class.split(' ')).toContain('btn-green');

  await selectOnCanvas(page, 'b3');
  await page.locator(inRow('label', 'prop-reset')).click();
  expect((await canvasLabels(page))[3]).toBe('버튼');
  await selectOnCanvas(page, 'main');
  await page.getByTestId('prop-label').fill('');

  expect(await canvasLabels(page)).toEqual(['', '', '취소', '']);
  const texts = await page.getByTestId('figma-button').evaluateAll((els) => els.map((el) => el.className + '|' + el.textContent));
  for (const t of texts) expect(t).not.toContain('undefined');
});

// ---------------------------------------------------------------------------
// Dev-10: [↑] [↓]가 행의 고르기를 같이 부르지 않는다 (A16, 이벤트 버블링 ④-4)
// ---------------------------------------------------------------------------

test('QA-A16 [↑] · [↓] 버튼이 고르기를 안 바꾼다: b2를 고른 채 b1 행 [↓], b3 행 [↑]를 눌러도 b2가 계속 골라져 있고 b1 · b3에 selected가 안 붙는다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'b2');

  await moveInLayer(page, 'b1', 'down');
  await moveInLayer(page, 'b3', 'up');

  await expect(page.getByTestId('property-title')).toHaveText('인스턴스 · 취소');
  expect(await selectedOnCanvas(page)).toEqual(['b2']);
  expect(await selectedInLayer(page)).toEqual(['b2']);
  await expect(page.locator(`${buttonSel('b1')}.selected, ${buttonSel('b3')}.selected, ${layerSel('b1')}.selected, ${layerSel('b3')}.selected`)).toHaveCount(0);
  // 순서만 바뀜
  expect(await page.locator('[data-testid="layer-item"]').evaluateAll((els) => els.map((el) => el.getAttribute('data-id')))).toEqual(['b2', 'b3', 'b1']);
});

test('QA-A16 (선택 없음) 아무것도 안 고른 채 [↓]를 눌러도 선택은 계속 없다 (버블링으로 행이 골라지지 않음)', async ({ page }) => {
  await page.goto(URL);

  await moveInLayer(page, 'b1', 'down');

  await expect(page.getByTestId('property-empty')).toHaveCount(1);
  expect(await selectedOnCanvas(page)).toEqual([]);
  expect(await selectedInLayer(page)).toEqual([]);
});

// ---------------------------------------------------------------------------
// Dev-11: 키보드 · Undo/Redo 공격 (A6 · A7 · A8 · A9 · A10 · A11 · A15 · A17 · A18 · A19)
// ---------------------------------------------------------------------------

const instanceCount = (page: Page) => page.getByTestId('layer-item');
const mainColorClass = async (page: Page): Promise<string> => (await page.locator(buttonSel('main')).getAttribute('class')) ?? '';

test('QA-A6 고른 것이 Delete · Undo · Redo로 사라지면 선택이 풀린다: Delete 뒤 풀림, Ctrl+Z로 b2가 돌아와도 풀린 채, 다시 b2를 골라 Ctrl+Shift+Z로 지워지면 또 풀린다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'b2');
  await page.keyboard.press('Delete');
  expect(await canvasOrder(page)).toEqual(['b1', 'b3']);
  await expect(page.getByTestId('property-empty')).toHaveCount(1);
  expect(await selectedOnCanvas(page)).toEqual([]);

  await pressUndo(page);
  // b2가 돌아와도 자동으로 다시 고르지 않는다
  expect(await canvasOrder(page)).toEqual(['b1', 'b2', 'b3']);
  await expect(page.getByTestId('property-empty')).toHaveCount(1);
  expect(await selectedOnCanvas(page)).toEqual([]);
  expect(await selectedInLayer(page)).toEqual([]);

  await selectOnCanvas(page, 'b2');
  await expect(page.getByTestId('property-title')).toHaveText('인스턴스 · 취소');
  await pressRedo(page);
  // Redo로 b2가 다시 지워지면 선택도 다시 풀리고 존재하지 않는 id가 골라진 채 남지 않는다
  expect(await canvasOrder(page)).toEqual(['b1', 'b3']);
  await expect(page.getByTestId('property-empty')).toHaveCount(1);
  await expect(page.getByTestId('property-title')).toHaveCount(0);
  expect(await selectedOnCanvas(page)).toEqual([]);
  expect(await selectedInLayer(page)).toEqual([]);
});

test('QA-A7 메인에서 Delete · Backspace를 각각 5번 연달아 눌러도 아무 일 없다 (DOM 변경 0, 메인이 계속 골라짐)', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');
  const watch = await watchApp(page);

  for (let i = 0; i < 5; i += 1) await page.keyboard.press('Delete');
  for (let i = 0; i < 5; i += 1) await page.keyboard.press('Backspace');

  await expect(page.getByTestId('figma-button')).toHaveCount(4);
  await expect(page.getByTestId('layer-item')).toHaveCount(3);
  expect(await selectedOnCanvas(page)).toEqual(['main']);
  expect(await selectedInLayer(page)).toEqual(['main']);
  expect((await watch.take()).body.total, 'DOM 변경').toBe(0);
});

test('QA-A8 입력칸 · 선택 상자 · 체크박스 안의 키는 앱 동작을 안 일으킨다 (Delete · Backspace로 안 지워지고 Ctrl+Z · Meta+Z로 앱 Undo가 안 일어남)', async ({ page }) => {
  await page.goto(URL);
  // Undo 한 단계: 메인 색 빨강 (앱 Undo가 잘못 돌면 이 색이 파랑으로 돌아간다)
  await selectOnCanvas(page, 'main');
  await page.getByTestId('prop-color').selectOption({ label: '빨강' });
  await selectOnCanvas(page, 'b2');

  const appUntouched = async (where: string): Promise<void> => {
    expect(await mainColorClass(page), `${where}: 메인 색`).toContain('btn-red');
    await expect(page.getByTestId('figma-button'), `${where}: 버튼`).toHaveCount(4);
    await expect(instanceCount(page), `${where}: 레이어 행`).toHaveCount(3);
    expect(await selectedOnCanvas(page), `${where}: 선택`).toEqual(['b2']);
  };

  // ① 라벨 칸(글자 `취소`)
  const label = page.getByTestId('prop-label');
  await label.click();
  await page.keyboard.press('End');
  await page.keyboard.press('Backspace');
  // 브라우저 기본: 입력칸 글자만 한 글자 지워지고 그 결과가 b2 라벨로 반영됨
  await expect(label).toHaveValue('취');
  expect((await canvasLabels(page))[2]).toBe('취');
  await page.keyboard.press('Delete');
  await page.keyboard.press('Control+KeyZ');
  await page.keyboard.press('Meta+KeyZ');
  await appUntouched('라벨 칸');

  // ② 크기 선택 상자
  await page.getByTestId('prop-size').focus();
  for (const key of ['Delete', 'Backspace', 'Control+KeyZ', 'Control+KeyZ']) await page.keyboard.press(key);
  await appUntouched('선택 상자');

  // ③ 체크박스 (눌러서 바꾸지 않고 포커스만)
  await page.getByTestId('prop-hasicon').focus();
  for (const key of ['Delete', 'Backspace', 'Control+KeyZ', 'Control+KeyZ']) await page.keyboard.press(key);
  await appUntouched('체크박스');
});

test('QA-A9 Undo 한도: [+ 인스턴스]를 50번 누르면 처음 모습이 빠져 Ctrl+Z 49번에 b1 b2 b3 b4에서 멈추고 50번째는 아무 일 없다. Ctrl+Shift+Z 49번이면 b1~b53', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(URL);
  const add = page.getByTestId('add-instance');
  for (let i = 0; i < 50; i += 1) await add.click();
  await expect(instanceCount(page)).toHaveCount(53);

  for (let k = 1; k <= 49; k += 1) {
    await pressUndo(page);
    await expect(instanceCount(page), `Ctrl+Z ${k}번째 뒤 행 수`).toHaveCount(53 - k);
  }
  expect(await layerOrder(page)).toEqual(['b1', 'b2', 'b3', 'b4']);
  // 50번째: 처음 모습 b1 b2 b3로는 못 돌아간다
  await pressUndo(page);
  expect(await layerOrder(page)).toEqual(['b1', 'b2', 'b3', 'b4']);
  expect(await canvasOrder(page)).toEqual(['b1', 'b2', 'b3', 'b4']);

  for (let k = 1; k <= 49; k += 1) await pressRedo(page);
  const expected = Array.from({ length: 53 }, (_, i) => `b${i + 1}`);
  expect(await layerOrder(page)).toEqual(expected);
  expect(await canvasOrder(page)).toEqual(expected);
});

test('QA-A19 Undo 한도 경계: [+ 인스턴스] 49번 뒤 Ctrl+Z 49번이면 처음 모습 b1 b2 b3로 돌아오고 50번째는 아무 일 없다. Ctrl+Shift+Z 49번이면 b1~b52', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(URL);
  const add = page.getByTestId('add-instance');
  for (let i = 0; i < 49; i += 1) await add.click();
  await expect(instanceCount(page)).toHaveCount(52);

  for (let k = 1; k <= 49; k += 1) await pressUndo(page);
  expect(await layerOrder(page)).toEqual(['b1', 'b2', 'b3']);
  await pressUndo(page);
  expect(await layerOrder(page)).toEqual(['b1', 'b2', 'b3']);
  expect(await canvasOrder(page)).toEqual(['b1', 'b2', 'b3']);

  for (let k = 1; k <= 49; k += 1) await pressRedo(page);
  const expected = Array.from({ length: 52 }, (_, i) => `b${i + 1}`);
  expect(await layerOrder(page)).toEqual(expected);
  expect(await canvasOrder(page)).toEqual(expected);
});

test('QA-A10 옛 state를 보는 키 핸들러 · 리스너 정리: Delete는 지금 고른 것, Ctrl+Z는 가장 최근 단계, 상태가 20번 넘게 바뀌어도 keydown 리스너는 1개로 유지된다', async ({ page }) => {
  await installKeydownCounter(page);
  await page.goto(URL);
  const baseline = await keydownListenerCount(page);
  expect(baseline, '로드 직후 등록된 keydown 리스너').toBe(1);

  // ① b1을 고르고 b2를 고른 뒤 Delete: 지워지는 것은 지금 고른 b2
  await selectOnCanvas(page, 'b1');
  await selectOnCanvas(page, 'b2');
  await page.keyboard.press('Delete');
  expect(await canvasOrder(page)).toEqual(['b1', 'b3']);

  // ② 메인 색 빨강 → 크기 L → Ctrl+Z(한 번): 되돌아가는 것은 가장 최근 단계(크기), 색은 남음
  await selectOnCanvas(page, 'main');
  await page.getByTestId('prop-color').selectOption({ label: '빨강' });
  await page.getByTestId('prop-size').selectOption('L');
  await pressUndo(page);
  const main = (await mainColorClass(page)).split(' ');
  expect(main).toContain('btn-M');
  expect(main).toContain('btn-red');

  // ③ 상태를 20번 넘게 바꾼다 (고르기 · 수정 섞어서): 등록 − 해제는 그대로
  for (let i = 0; i < 6; i += 1) {
    await selectOnCanvas(page, 'b1');
    await page.getByTestId('prop-label').fill(`값${i}`);
    await selectOnCanvas(page, 'main');
    await page.getByTestId('prop-size').selectOption(i % 2 === 0 ? 'S' : 'L');
    await selectOnCanvas(page, 'b3');
  }
  expect(await keydownListenerCount(page), '상태가 20번 넘게 바뀐 뒤 keydown 리스너').toBe(baseline);

  // 보조 확인: Ctrl+Z 한 번 = 한 단계만
  await selectOnCanvas(page, 'b3');
  await page.getByTestId('prop-label').fill('마지막');
  await pressUndo(page);
  expect((await canvasLabels(page))[2]).toBe('삭제');
  expect((await canvasLabels(page))[1]).toBe('값5');
  expect(await keydownListenerCount(page)).toBe(baseline);
});

test('QA-A11 정해진 키 밖 · 수정키 조합은 아무 일도 안 한다 (Ctrl+Y · Escape · z · Alt+Z · Shift+Delete · Ctrl+Backspace · Alt+Backspace · Meta+Backspace), 수정키 없는 Delete는 b2를 지운다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'main');
  await page.getByTestId('prop-color').selectOption({ label: '빨강' });
  await blurFocus(page);

  const unchanged = async (where: string, selected: string): Promise<void> => {
    expect(await mainColorClass(page), `${where}: 색`).toContain('btn-red');
    await expect(page.getByTestId('figma-button'), `${where}: 버튼`).toHaveCount(4);
    await expect(instanceCount(page), `${where}: 행`).toHaveCount(3);
    expect(await selectedOnCanvas(page), `${where}: 선택`).toEqual([selected]);
  };

  for (const key of ['Control+KeyY', 'Escape', 'KeyZ', 'Alt+KeyZ']) await page.keyboard.press(key);
  await unchanged('메인 선택', 'main');

  await selectOnCanvas(page, 'b2');
  for (const key of ['Control+KeyY', 'Escape', 'KeyZ', 'Alt+KeyZ', 'Shift+Delete', 'Control+Backspace', 'Alt+Backspace', 'Meta+Backspace']) {
    await page.keyboard.press(key);
  }
  await unchanged('b2 선택', 'b2');

  // 대조: 수정키 없는 Delete는 지운다
  await page.keyboard.press('Delete');
  expect(await canvasOrder(page)).toEqual(['b1', 'b3']);
});

test('QA-A15 고르기만 바꿔도 묶음은 안 끝난다: b2 라벨에 `A`, 다른 것을 고르고 다시 b2에 `B`를 입력한 뒤 Ctrl+Z 한 번에 둘 다 `취소`로 돌아간다', async ({ page }) => {
  await page.goto(URL);
  await selectOnCanvas(page, 'b2');
  const label = page.getByTestId('prop-label');
  await label.click();
  await page.keyboard.press('End');
  await page.keyboard.type('A');
  expect((await canvasLabels(page))[2]).toBe('취소A');

  await selectOnCanvas(page, 'b3');
  await selectOnCanvas(page, 'b2');
  await label.click();
  await page.keyboard.press('End');
  await page.keyboard.type('B');
  expect((await canvasLabels(page))[2]).toBe('취소AB');

  await pressUndo(page);

  expect((await canvasLabels(page))[2]).toBe('취소');
  await expect(label).toHaveValue('취소');
});

test('QA-A17 다른 것이 사라지거나 끼어들어도 고른 것은 id로 유지된다: b1 삭제 → b3 고름 → Ctrl+Z(b1이 앞에 끼어듦) → Ctrl+Shift+Z(b1 다시 삭제) 모두 b3가 계속 골라져 있다', async ({ page }) => {
  await page.goto(URL);
  await holdNodes(page, { btn3: buttonSel('b3') });
  await selectOnCanvas(page, 'b1');
  await page.keyboard.press('Delete');
  expect(await canvasOrder(page)).toEqual(['b2', 'b3']);
  await selectOnCanvas(page, 'b3');

  await pressUndo(page);
  expect(await canvasOrder(page)).toEqual(['b1', 'b2', 'b3']);
  await expect(page.getByTestId('property-title')).toHaveText('인스턴스 · 삭제');
  expect(await selectedOnCanvas(page)).toEqual(['b3']);
  expect(await sameNode(page, 'btn3', `${buttonSel('b3')}.selected`)).toBe(true);

  await pressRedo(page);
  expect(await canvasOrder(page)).toEqual(['b2', 'b3']);
  await expect(page.getByTestId('property-title')).toHaveText('인스턴스 · 삭제');
  expect(await selectedOnCanvas(page)).toEqual(['b3']);
  expect(await sameNode(page, 'btn3', `${buttonSel('b3')}.selected`)).toBe(true);
});

test('QA-A18 추가를 Undo한 뒤 다시 추가하면 번호가 이어진다: b4 → Ctrl+Z → 추가는 b5, 이어서 Ctrl+Z → 추가는 b6 (지운 번호를 다시 쓰지 않음)', async ({ page }) => {
  await page.goto(URL);
  const add = page.getByTestId('add-instance');

  await add.click();
  expect(await layerOrder(page)).toEqual(['b1', 'b2', 'b3', 'b4']);
  await pressUndo(page);
  expect(await layerOrder(page)).toEqual(['b1', 'b2', 'b3']);

  await add.click();
  expect(await layerOrder(page)).toEqual(['b1', 'b2', 'b3', 'b5']);
  expect(await canvasOrder(page)).toEqual(['b1', 'b2', 'b3', 'b5']);
  await expect(page.locator(`${buttonSel('b4')}, ${layerSel('b4')}`)).toHaveCount(0);

  await pressUndo(page);
  await add.click();
  expect(await layerOrder(page)).toEqual(['b1', 'b2', 'b3', 'b6']);
  expect(await canvasOrder(page)).toEqual(['b1', 'b2', 'b3', 'b6']);
});
