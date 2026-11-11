/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

// [AI Note]: MF-04 · P2-07 ~ 09 · T-16 코드 확인 — Hook은 루트 컴포넌트(App.ts)에서만 부른다.
// 자식 컴포넌트(components/*.ts)는 props만 받는 순수 함수라 Hook도 DOM(document · window)도 쓰지 않고,
// 순수 모듈(model · undo · keys)도 같다. 검사 방식은 phase2-app의 rootOnlyHooks.test.ts와 같다:
// 소스를 글(?raw)로 읽어 검사하고, 검사기(findViolations)가 정말 위반을 잡는지 일부러 틀린 소스로도 확인한다.
// 주석 · 문자열 안의 단어(keys.ts 주석의 `document · window` 같은 것)는 먼저 지우고 본다.

const topLevel = import.meta.glob<string>('../*.ts', { query: '?raw', import: 'default', eager: true });
const components = import.meta.glob<string>('../components/*.ts', { query: '?raw', import: 'default', eager: true });
const sourceOf = (map: Record<string, string>, file: string): string => {
  const found = map[file];
  if (found === undefined) throw new Error(`${file} 소스를 찾지 못했습니다`);
  return found;
};

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

/** 주석 · 문자열 안의 단어는 호출이 아니므로 먼저 지우고 본다 */
function stripNoise(source: string): string {
  return stripComments(source)
    .replace(/'(?:\\.|[^'\\\n])*'/g, "''")
    .replace(/"(?:\\.|[^"\\\n])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '``');
}

/** Hook 호출 · import, DOM 접근(document · window), 엔진 내부 접근이 있으면 이유 목록을 돌려준다 */
function findViolations(source: string): string[] {
  const code = stripNoise(source);
  const found: string[] = [];
  for (const hook of ['useState', 'useEffect', 'useMemo']) {
    if (new RegExp(`\\b${hook}\\b`).test(code)) found.push(`${hook} 사용`);
  }
  if (/\bdocument\b/.test(code)) found.push('document 접근');
  if (/\bwindow\b/.test(code)) found.push('window 접근');
  if (/\bsetHookDispatcher\b/.test(code)) found.push('setHookDispatcher 접근');
  // import 경로는 문자열이라 주석만 지운 글에서 본다
  if (/@mini-react\/(react-dom|react-dom-bindings|react-reconciler|scheduler)/.test(stripComments(source))) found.push('엔진 패키지 import');
  return found;
}

const componentFiles = Object.keys(components).map((path) => path.replace('../components/', ''));

describe('검사기 자체 확인 — 위반을 잡는다', () => {
  it('Hook 호출 · document · window · 엔진 import를 각각 잡는다', () => {
    expect(findViolations("import { h, useState } from '@mini-react/react';")).toEqual(['useState 사용']);
    expect(findViolations('const x = useEffect(() => {}, []);')).toEqual(['useEffect 사용']);
    expect(findViolations('const y = useMemo(() => 1, []);')).toEqual(['useMemo 사용']);
    expect(findViolations('document.title = "x";')).toEqual(['document 접근']);
    expect(findViolations('window.scrollTo(0, 0);')).toEqual(['window 접근']);
    expect(findViolations("import { render } from '@mini-react/react-dom';")).toEqual(['엔진 패키지 import']);
  });

  it('주석 · 문자열 안의 단어는 위반으로 세지 않는다 (keys.ts 주석의 document · window 같은 경우)', () => {
    expect(findViolations("// useState는 루트에서만\nconst a = 'document';\nconst b = `window ${1}`;")).toEqual([]);
    expect(findViolations('/* document · window를 쓰지 않는다 */\nexport const k = 1;')).toEqual([]);
  });
});

describe('T-16 코드 확인 — 루트(App.ts)만 Hook을 쓴다', () => {
  it('컴포넌트 파일은 정확히 5개다 (Button · Canvas · Icons · LayerPanel · PropertyPanel) — 새 파일이 검사 밖으로 새지 않게', () => {
    expect([...componentFiles].sort()).toEqual(['Button.ts', 'Canvas.ts', 'Icons.ts', 'LayerPanel.ts', 'PropertyPanel.ts']);
  });

  for (const name of componentFiles) {
    it(`components/${name}: Hook · DOM 접근 · 엔진 내부 접근이 없다 (props만 받는 순수 함수)`, () => {
      expect(findViolations(sourceOf(components, `../components/${name}`))).toEqual([]);
    });
  }

  it('App.ts가 useState와 useEffect를 부른다 (루트가 상태 · keydown 등록을 가진다)', () => {
    const app = stripNoise(sourceOf(topLevel, '../App.ts'));
    expect(/\buseState\s*(<[^>(]*>)?\(/.test(app), 'useState 호출').toBe(true);
    expect(/\buseEffect\s*\(/.test(app), 'useEffect 호출').toBe(true);
  });

  it('components/*.ts · model · undo · keys는 useEffect도 부르지 않는다 (keydown 등록은 App.ts 한 곳)', () => {
    const files = [
      ...Object.entries(components).map(([path, source]) => [path, source] as const),
      ...['model.ts', 'undo.ts', 'keys.ts', 'main.ts'].map((file) => [file, sourceOf(topLevel, `../${file}`)] as const),
    ];
    for (const [path, source] of files) {
      expect(/\buseEffect\b/.test(stripNoise(source)), `${path}의 useEffect`).toBe(false);
      expect(/\baddEventListener\b/.test(stripNoise(source)), `${path}의 addEventListener`).toBe(false);
    }
  });

  for (const file of ['model.ts', 'undo.ts', 'keys.ts']) {
    it(`${file}: 순수 모듈이라 Hook · document · window · 엔진 내부 접근이 없다`, () => {
      expect(findViolations(sourceOf(topLevel, `../${file}`))).toEqual([]);
    });
  }

  it('App.ts 밖의 소스(model · undo · keys · main)는 Hook을 쓰지 않는다', () => {
    for (const file of ['model.ts', 'undo.ts', 'keys.ts', 'main.ts']) {
      const code = stripNoise(sourceOf(topLevel, `../${file}`));
      for (const hook of ['useState', 'useEffect', 'useMemo']) {
        expect(new RegExp(`\\b${hook}\\b`).test(code), `${file}의 ${hook}`).toBe(false);
      }
    }
  });
});
