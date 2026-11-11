/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

// [AI Note]: T-16 코드 확인 — Hook은 루트 컴포넌트(App.ts)에서만 부른다 (P2-07 · P2-08 · P2-09).
// 자식 컴포넌트(components/*.ts)는 props만 받는 순수 함수라 Hook도 DOM(document · window)도 쓰지 않는다.
// 소스 파일을 글로 읽어 검사한다. 검사기(findViolations)가 정말 위반을 잡는지 일부러 틀린 소스로도 확인한다.

// [AI Note]: 소스를 글(?raw)로 가져온다 — node:fs를 쓰지 않아 @types/node 없이도 타입 검사를 통과한다.
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

  it('주석 · 문자열 안의 단어는 위반으로 세지 않는다', () => {
    expect(findViolations("// useState는 루트에서만\nconst a = 'document';\nconst b = `window ${1}`;")).toEqual([]);
  });
});

describe('T-16 코드 확인 — 루트(App.ts)만 Hook을 쓴다', () => {
  it('자식 컴포넌트 파일이 있다 (CounterPanel · GreetingPanel · TodoPanel · TodoRow · LogPanel)', () => {
    expect([...componentFiles].sort()).toEqual(['CounterPanel.ts', 'GreetingPanel.ts', 'LogPanel.ts', 'TodoPanel.ts', 'TodoRow.ts']);
  });

  for (const name of componentFiles) {
    it(`components/${name}: Hook · DOM 접근 · 엔진 내부 접근이 없다 (props만 받는 순수 함수)`, () => {
      expect(findViolations(sourceOf(components, `../components/${name}`))).toEqual([]);
    });
  }

  it('App.ts가 useState · useEffect · useMemo를 모두 부른다 (루트가 상태 · Hook을 가진다)', () => {
    const app = stripNoise(sourceOf(topLevel, '../App.ts'));
    for (const hook of ['useState', 'useEffect', 'useMemo']) {
      expect(new RegExp(`\\b${hook}\\s*(<[^>(]*>)?\\(`).test(app), `${hook} 호출`).toBe(true);
    }
  });

  it('App.ts 밖의 소스(todoOps · counts · main)는 Hook을 쓰지 않는다', () => {
    for (const file of ['todoOps.ts', 'counts.ts', 'main.ts']) {
      const code = stripNoise(sourceOf(topLevel, `../${file}`));
      for (const hook of ['useState', 'useEffect', 'useMemo']) {
        expect(new RegExp(`\\b${hook}\\b`).test(code), `${file}의 ${hook}`).toBe(false);
      }
    }
  });

  it('상태가 아닌 바깥 변수(counts)로만 횟수를 센다: 자식이 아니라 App.ts만 올린다', () => {
    for (const name of componentFiles) {
      expect(stripNoise(sourceOf(components, `../components/${name}`))).not.toMatch(/counts\.\w+\s*(\+=|\+\+|=[^=])/);
    }
  });
});
