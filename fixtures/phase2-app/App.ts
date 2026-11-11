import { h, useState } from '@mini-react/react';
import type { VNode } from '@mini-react/shared';
import { CounterPanel } from './components/CounterPanel';
import { GreetingPanel } from './components/GreetingPanel';
import { counts } from './counts';

// [AI Note]: 루트 컴포넌트. 모든 useState · useEffect · useMemo는 이 파일에서만 부른다 (P2-07 · P2-08).
// 자식은 props만 받는 순수 함수이고, 버튼을 누르면 루트가 내려 준 함수를 불러 루트가 setter로 상태를 바꾼다 (Lifting State Up).
export function App(): VNode {
  counts.renderRuns += 1;
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');

  return h(
    'main',
    { class: 'app' },
    h('h1', null, 'Phase 2 검증 페이지'),
    h(
      'div',
      { class: 'panels' },
      h(CounterPanel, {
        count,
        // [+1]: 함수형 setter 한 번
        onPlus1: () => setCount((c) => c + 1),
        // [+3]: 함수형 setter 세 번 연달아 → 3 증가, 렌더도 3번 (즉시 동기 정책)
        onPlus3: () => {
          setCount((c) => c + 1);
          setCount((c) => c + 1);
          setCount((c) => c + 1);
        },
        // [그대로]: 지금과 같은 값 → 다시 그리지 않음
        onSame: () => setCount(count),
      }),
      h(GreetingPanel, {
        name,
        onNameInput: (event: Event) => setName((event.target as HTMLInputElement).value),
      }),
    ),
  );
}
