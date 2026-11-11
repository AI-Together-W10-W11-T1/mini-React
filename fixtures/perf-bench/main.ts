import { h } from '@mini-react/react';
import { resolveComponents } from '@mini-react/react-reconciler';
import { BenchApp, describeTree, makeState } from './benchApp';
import { COLUMNS, cellsOf } from './format';
import { DEFAULT_ITEM_COUNT, ALL_SCENARIOS, runScenarioById } from './scenarios';
import { DEFAULT_RUNS, DEFAULT_WARMUP } from './runner';

// [AI Note]: 엔진 로직 없음. 시나리오를 차례로 실행하고 결과 표를 그리는 연결 코드다 (fixtures는 DOM을 만질 수 있다).
// 계측 패널(버튼 · 상태 · 표 · 측정 조건)은 측정 영역(bench-area) 밖에 있고, 표 · 상태는 시나리오가 "끝난 뒤"에만 고친다.
// 시나리오 실행 중에는 이 페이지의 DOM을 바꾸지 않는다 → 계측 DOM 변경이 측정에 들어가지 않는다 (PRD §8.2).

function must<T extends Element>(testId: string): T {
  const found = document.querySelector(`[data-testid="${testId}"]`);
  if (found === null) throw new Error(`data-testid="${testId}"가 없습니다`);
  return found as T;
}

const area = must<HTMLElement>('bench-area');
const runButton = must<HTMLButtonElement>('bench-run');
const status = must<HTMLElement>('bench-status');
const table = must<HTMLTableElement>('bench-table');
const head = table.querySelector('thead') as HTMLTableSectionElement;
const body = table.querySelector('tbody') as HTMLTableSectionElement;

// vite dev 서버면 true. 타입 선언 없이(vite/client 없이) 안전하게 읽는다
const isDev = (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true;

function browserText(): string {
  const data = (navigator as unknown as { userAgentData?: { brands?: { brand: string; version: string }[] } }).userAgentData;
  const brands = data?.brands?.map((b) => `${b.brand} ${b.version}`).join(', ');
  return brands === undefined || brands === '' ? navigator.userAgent : `${navigator.userAgent} (${brands})`;
}

// 시계 해상도 추정: performance.now()가 바뀔 때까지 돌려 가장 작은 양의 간격을 잰다. 브라우저는 보안상 시계를 뭉툭하게 만들 수 있어
// (예: 0.1ms 단위) 그보다 짧은 구간은 0으로 보인다 — 값을 읽을 때 알아야 하므로 측정 조건에 적는다.
function estimateClockResolution(): number {
  let smallest = Infinity;
  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    let now = start;
    while (now === start) now = performance.now();
    smallest = Math.min(smallest, now - start);
  }
  return smallest;
}

function fillConditions(): void {
  must('bench-cond-browser').textContent = browserText();
  must('bench-cond-viewport').textContent = `${window.innerWidth} × ${window.innerHeight} (devicePixelRatio ${window.devicePixelRatio})`;
  must('bench-cond-build').textContent = isDev ? 'dev 서버 (Vite dev, 번들 · 최소화 없음)' : '빌드 (production)';
  must('bench-cond-timer').textContent = `performance.now() 해상도 약 ${estimateClockResolution().toFixed(3)}ms (추정). 이보다 짧은 구간은 0.000으로 보일 수 있음`;
  must('bench-cond-reps').textContent = `준비 ${DEFAULT_WARMUP}회 · 측정 ${DEFAULT_RUNS}회 이상 (p50 · p95 요약)`;
  const info = describeTree(resolveComponents(h(BenchApp, { state: makeState(DEFAULT_ITEM_COUNT) })));
  must('bench-cond-fixture').textContent =
    `B-01 ~ B-05 · B-06: 항목 ${DEFAULT_ITEM_COUNT}개 목록 · 노드 ${info.nodes}개(요소 ${info.elements} + 글자 ${info.texts}) · 트리 깊이 ${info.depth}. B-07: 검증 페이지 App (항목 0개에서 시작해 3개로 늘어남). 항목 수와 노드 수를 섞어 쓰지 않습니다.`;
  must('bench-cond-unit').textContent =
    'DOM 작업(M-02) = patch 한 줄(복합 작업 하나) 종류별 개수 / MutationObserver 기록 수 / 추가 · 제거된 노드 수를 따로 기록 (서로 같은 단위가 아님)';
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

function drawHeader(): void {
  const tr = el('tr');
  for (const column of COLUMNS) tr.appendChild(el('th', column.label));
  head.replaceChildren(tr);
}

function setStatus(state: 'idle' | 'running' | 'done' | 'error', text: string): void {
  status.dataset.state = state;
  status.textContent = text;
}

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

async function runAll(): Promise<void> {
  runButton.disabled = true;
  body.replaceChildren();
  fillConditions(); // 실행 시점의 화면 크기를 적는다
  try {
    for (const scenario of ALL_SCENARIOS) {
      setStatus('running', `${scenario.id} 실행 중…`);
      await tick(); // 상태 글을 먼저 그리게 한다 (이 뒤 한 시나리오가 끝날 때까지 계측 패널은 안 건드린다)
      const row = runScenarioById(area, scenario.id);
      const tr = el('tr');
      tr.setAttribute('data-testid', `bench-row-${row.id}`);
      const cells = cellsOf(row);
      for (const column of COLUMNS) {
        const td = el('td', cells[column.key]);
        td.dataset.col = column.key;
        tr.appendChild(td);
      }
      body.appendChild(tr);
    }
    setStatus('done', `완료 (${ALL_SCENARIOS.length}개 시나리오)`);
  } catch (error) {
    // 시나리오 안의 오류는 표에 남지만, 러너 밖에서 터진 오류는 숨기지 않고 상태에 그대로 보여 준다
    setStatus('error', `오류: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  } finally {
    runButton.disabled = false;
  }
}

drawHeader();
fillConditions();
runButton.addEventListener('click', () => {
  void runAll();
});
