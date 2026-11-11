import type { Doc } from './model';
import { INITIAL_NAV, navBack, navForward, navPush } from './previewNav';
import type { PreviewNav } from './previewNav';

// [AI Note]: 실제 영역 기록의 칸마다 "그 칸일 때의 테스트 영역 doc 사본"을 들고 있는 순수 모델 (PP-06 변경, T-08).
// 칸 번호 = nav.index, 불변식 docs.length === nav.size. 칸 수 · 앞쪽 버림 · 한도(HISTORY_LIMIT) 규칙은 새로 만들지 않고
// previewNav의 navPush · navBack · navForward를 그대로 불러 엔진 History와 같은 번호를 얻는다 → docs는 nav.size에 맞춰 같이 잘려 어긋날 수 없다.
// Doc은 불변 값이라 사본 = 참조 하나면 된다 (복사 안 함).
export interface DocTrack {
  readonly nav: PreviewNav;
  readonly docs: readonly Doc[];
}

export function initialTrack(doc: Doc): DocTrack {
  return { nav: INITIAL_NAV, docs: [doc] };
}

/** Patch로 새 기록이 쌓임: 앞쪽 사본을 버리고 이 doc을 붙인 뒤, 한도를 넘으면 맨 앞(가장 오래된 칸)부터 뺀다 */
export function trackPush(track: DocTrack, doc: Doc): DocTrack {
  const nav = navPush(track.nav);
  const docs = [...track.docs.slice(0, track.nav.index + 1), doc];
  return { nav, docs: docs.length > nav.size ? docs.slice(docs.length - nav.size) : docs };
}

/** 처음 칸이면 같은 객체 (경계) */
export function trackBack(track: DocTrack): DocTrack {
  const nav = navBack(track.nav);
  return nav === track.nav ? track : { nav, docs: track.docs };
}

/** 끝 칸이면 같은 객체 (경계) */
export function trackForward(track: DocTrack): DocTrack {
  const nav = navForward(track.nav);
  return nav === track.nav ? track : { nav, docs: track.docs };
}

/** 지금 칸의 doc */
export function trackDoc(track: DocTrack): Doc {
  const doc = track.docs[track.nav.index];
  if (doc === undefined) throw new Error('doc 사본 칸이 기록 칸과 어긋났습니다');
  return doc;
}
