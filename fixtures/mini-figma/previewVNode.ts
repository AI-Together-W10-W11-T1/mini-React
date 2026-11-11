import { COMMENT_NODE, TEXT_NODE } from '@mini-react/shared';
import type { AreaChildren, Props, VNode } from '@mini-react/shared';

// [AI Note]: 실제 영역에 넣기 전에 테스트 영역에서 읽은 VNode를 정리하는 순수 함수 (PP-05). DOM · Hook · 엔진을 모른다.
// 정리 세 가지: ① 테스트 영역 제목(test-area-title)을 최상위에서 뺀다 ② 고르기 표시(`selected` 클래스 토큰)를 뺀다 — 고르기는 실제 영역과 상관없다
// ③ data-testid 앞에 `real-`을 붙인다 — 테스트 영역 testid(figma-button 등)가 실제 영역에 남으면 두 영역이 같은 이름을 가져 구분이 안 된다.
// 입력은 고치지 않고 새 객체를 돌려준다. 글자 · 주석 노드와 그 밖의 속성(style · data-id · type)은 그대로 둔다.

const TITLE_TESTID = 'test-area-title';
const REAL_PREFIX = 'real-';

function cleanProps(props: Props): Props {
  const next: { [name: string]: unknown } = { ...props };
  const cls = next.class;
  if (typeof cls === 'string') {
    // 토큰 단위로만 지운다: `unselected` · `not-selected` 같은 비슷한 이름은 그대로
    const tokens = cls.split(/\s+/).filter((token) => token !== '' && token !== 'selected');
    if (tokens.length === 0) delete next.class;
    else next.class = tokens.join(' ');
  }
  const testid = next['data-testid'];
  if (typeof testid === 'string') next['data-testid'] = `${REAL_PREFIX}${testid}`;
  return next;
}

function cleanNode(node: VNode): VNode {
  // DOM에서 읽은 VNode만 들어오므로 요소는 type이 태그 이름(문자열)이다. 글자 · 주석은 그대로
  if (node.type === TEXT_NODE || node.type === COMMENT_NODE) return node;
  return { ...node, props: cleanProps(node.props), children: node.children.map(cleanNode) } as VNode;
}

export function toRealVNodes(children: AreaChildren): AreaChildren {
  return children
    .filter((node) => (node.props as Props)['data-testid'] !== TITLE_TESTID)
    .map(cleanNode);
}
