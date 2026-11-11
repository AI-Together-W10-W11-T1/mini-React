import { render } from '@mini-react/react-dom';
import { App } from './App';
import { counts } from './counts';

// [AI Note]: 엔진 로직 없음. 영역 상자(app-root)에 루트 App을 그리는 연결 코드다. 이후 상태가 바뀌면 엔진이 알아서 diff → patch한다.
const root = document.querySelector('[data-testid="app-root"]');
if (root === null) throw new Error('data-testid="app-root" 요소가 없습니다');

// 임시(Dev-17 ~ Dev-20): e2e가 렌더 · memo 횟수를 읽을 수 있게 바깥 변수를 노출한다. Dev-21에서 기록판 칸으로 대체하고 지운다.
Object.defineProperty(window, '__renderCount', { get: () => counts.renderRuns });
Object.defineProperty(window, '__memoCount', { get: () => counts.memoRuns });

render(App, root);
