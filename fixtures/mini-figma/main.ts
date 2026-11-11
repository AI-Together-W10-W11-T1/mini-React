import { render } from '@mini-react/react-dom';
import { App } from './App';

// [AI Note]: 엔진 로직 없음. 영역 상자(app-root)에 루트 App을 그리는 연결 코드다. 이후 상태가 바뀌면 엔진이 알아서 diff → patch한다.
const root = document.querySelector('[data-testid="app-root"]');
if (root === null) throw new Error('data-testid="app-root" 요소가 없습니다');

render(App, root);
