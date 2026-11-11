import { test, expect, noHorizontalScroll } from './phase2-helpers';

// [AI Note]: QA-20 확장 1 성능 대시보드(`/perf-bench/`) 스모크. 숫자 값 자체(ms · 개수)는 기기마다 달라 단언하지 않는다.
// 단언하는 것: 행이 생기는가 · 반복 횟수(준비 5 · 측정 30) · 오류 수 0 · 측정 조건 칸이 채워졌는가 · 계측 패널이 측정 영역 밖에 있는가 · 콘솔 오류 없음.
// (콘솔 error 한 건이라도 있으면 phase1-helpers의 test가 실패시킨다.)

const URL = '/perf-bench/';
const IDS = ['B-01', 'B-02', 'B-03', 'B-04', 'B-05', 'B-06', 'B-07'] as const;

test('QA-20 /perf-bench/에서 시나리오를 실행하면 B-01 ~ B-07 행이 생기고 반복 횟수(준비 5 · 측정 30) · 오류 0 · 측정 조건이 채워지며 계측 패널은 측정 영역 밖에 있다', async ({ page }) => {
  await page.goto(URL);

  // 실행 전: 행이 없고 측정 영역(bench-area)과 계측 패널(표 · 상태 · 버튼)이 따로 있다
  await expect(page.getByTestId('bench-status')).toHaveAttribute('data-state', 'idle');
  await expect(page.getByTestId('bench-table').locator('tbody tr')).toHaveCount(0);
  const area = page.getByTestId('bench-area');
  await expect(area).toHaveCount(1);

  // 계측 패널은 측정 영역 밖: 표 · 상태 · 버튼 · 측정 조건 어느 것도 bench-area 안에 없다 (그 안의 DOM 변경이 측정에 들어가지 않는다)
  for (const id of ['bench-table', 'bench-status', 'bench-run', 'bench-conditions']) {
    expect(await area.locator(`[data-testid="${id}"]`).count(), `${id}가 측정 영역 안에 있다`).toBe(0);
    expect(await page.getByTestId(id).evaluate((el, areaId) => !document.querySelector(`[data-testid="${areaId}"]`)!.contains(el), 'bench-area')).toBe(true);
  }

  await page.getByTestId('bench-run').click();
  await expect(page.getByTestId('bench-status')).toHaveAttribute('data-state', 'done', { timeout: 60_000 });

  // 행 7개: 이름 · 반복 횟수 · 오류 0 · 시간 칸이 있다 (숫자 값은 단언하지 않는다)
  await expect(page.getByTestId('bench-table').locator('tbody tr')).toHaveCount(7);
  for (const id of IDS) {
    const row = page.getByTestId(`bench-row-${id}`);
    await expect(row).toHaveCount(1);
    await expect(row.locator('[data-col="name"]')).toContainText(id);
    await expect(row.locator('[data-col="repeat"]')).toHaveText('준비 5 · 측정 30');
    await expect(row.locator('[data-col="errors"]')).toHaveText('0');
    await expect(row.locator('[data-col="total"]')).toContainText('/'); // p50 / p95 (값은 안 본다)
    await expect(row.locator('[data-col="total"]')).not.toHaveText('—');
    await expect(row.locator('[data-col="dom"]')).not.toBeEmpty();
    await expect(row.locator('[data-col="fixture"]')).toContainText('노드');
  }

  // B-01 ~ B-05는 M-04 ~ M-06 단계 시간이 있고, B-06 · B-07은 엔진 update() 한 덩어리라 "—"로 표시하고 이유를 적는다
  for (const id of IDS.slice(0, 5)) {
    for (const col of ['vnode', 'diff', 'patch']) {
      await expect(page.getByTestId(`bench-row-${id}`).locator(`[data-col="${col}"]`)).toContainText('/');
    }
  }
  for (const id of ['B-06', 'B-07'] as const) {
    for (const col of ['vnode', 'diff', 'patch']) {
      await expect(page.getByTestId(`bench-row-${id}`).locator(`[data-col="${col}"]`)).toHaveText('—');
    }
  }

  // 구조로 확인할 수 있는 내용: 기능 정확성 · 노드 참조 유지 칸이 채워진다 (B-01은 변경 없음 = patch 0줄)
  for (const id of IDS) {
    await expect(page.getByTestId(`bench-row-${id}`).locator('[data-col="correct"]')).toHaveText('일치');
    await expect(page.getByTestId(`bench-row-${id}`).locator('[data-col="preserved"]')).toContainText('/');
  }
  await expect(page.getByTestId('bench-row-B-01').locator('[data-col="dom"]')).toContainText('patch 0줄');

  // 측정 조건 칸이 채워진다 (브라우저 · 화면 크기 · 빌드 모드 · 반복 · 집계 단위). CPU 제한 · 기기 · M-01은 사람이 적는 칸이라 입력창으로 있다
  const cond = page.getByTestId('bench-conditions');
  await expect(cond.getByTestId('bench-cond-browser')).not.toBeEmpty();
  await expect(cond.getByTestId('bench-cond-browser')).toContainText(/chrom/i);
  await expect(cond.getByTestId('bench-cond-viewport')).toContainText('×');
  await expect(cond.getByTestId('bench-cond-build')).not.toBeEmpty();
  await expect(cond.getByTestId('bench-cond-reps')).toContainText('준비 5');
  await expect(cond.getByTestId('bench-cond-reps')).toContainText('측정 30');
  await expect(cond.getByTestId('bench-cond-timer')).toContainText('해상도');
  await expect(cond.getByTestId('bench-cond-unit')).not.toBeEmpty();
  await expect(cond.getByTestId('bench-cond-cpu')).toBeEditable();
  await expect(cond.getByTestId('bench-cond-device')).toBeEditable();
  await expect(page.getByTestId('bench-m01')).toBeEditable();

  // 화면 시간(M-07)이 페인트 완료가 아님을 표에 적었다
  await expect(page.getByTestId('bench-notes')).toContainText('화면 표시');

  expect(await noHorizontalScroll(page)).toBe(true);
});

test('QA-20 다시 실행해도 행이 쌓이지 않고 7개로 바뀐다 (실행 중에는 버튼이 잠긴다)', async ({ page }) => {
  await page.goto(URL);
  await page.getByTestId('bench-run').click();
  await expect(page.getByTestId('bench-run')).toBeDisabled(); // 실행 중에는 잠긴다
  await expect(page.getByTestId('bench-status')).toHaveAttribute('data-state', 'done', { timeout: 60_000 });
  await page.getByTestId('bench-run').click();
  await expect(page.getByTestId('bench-status')).toHaveAttribute('data-state', 'done', { timeout: 60_000 });
  await expect(page.getByTestId('bench-table').locator('tbody tr')).toHaveCount(7);
  await expect(page.getByTestId('bench-run')).toBeEnabled();
});
