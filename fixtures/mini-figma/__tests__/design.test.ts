/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import indexHtml from '../index.html?raw';

// [AI Note]: 디자인 개편(FD-05 · FD-07) 소스 확인. 소스를 글(?raw)로 읽어 검사한다.
// 값이 실제 화면에 적용되는지(computed style)는 e2e(mini-figma-design.spec.ts)가 증명하고, 여기서는 「글자가 있는지」만 본다.
// 앱 소스는 테스트 파일을 뺀 fixtures/mini-figma/*.ts · components/*.ts (테스트 · e2e 파일에는 검사 글자 자체가 들어 있어서 뺀다).

const topLevel = import.meta.glob<string>('../*.ts', { query: '?raw', import: 'default', eager: true });
const components = import.meta.glob<string>('../components/*.ts', { query: '?raw', import: 'default', eager: true });
const sources: [string, string][] = [...Object.entries(topLevel), ...Object.entries(components)];

describe('브랜드 없음 (FD-07)', () => {
  it('앱 소스 파일이 모두 모였다 (검사 대상이 비어 있지 않음)', () => {
    expect(sources.length).toBeGreaterThanOrEqual(10);
  });

  it('index.html과 앱 소스에 디자인 문서 회사 이름(coinbase)이 한 건도 없다 (대소문자 무관)', () => {
    expect(indexHtml.toLowerCase()).not.toContain('coinbase');
    for (const [path, source] of sources) expect(source.toLowerCase(), path).not.toContain('coinbase');
  });

  it('앱 이름은 mini-figma다 (<title>)', () => {
    expect(indexHtml).toContain('<title>mini-figma</title>');
  });
});

describe('외부 글꼴 · 외부 요청 없음 (FD-05)', () => {
  it('index.html에 @import · @font-face · http:// · https://가 없다', () => {
    for (const banned of ['@import', '@font-face', 'http://', 'https://']) expect(indexHtml, banned).not.toContain(banned);
  });

  it('글꼴 목록은 Inter로 시작하는 시스템 글꼴 순서이고 숫자 · 색 값은 고정폭 글꼴이다', () => {
    expect(indexHtml).toMatch(/font-family:\s*Inter,\s*system-ui,\s*-apple-system,\s*"Segoe UI",\s*Roboto,\s*Helvetica,\s*Arial,\s*sans-serif/);
    expect(indexHtml).toMatch(/ui-monospace,\s*"JetBrains Mono",\s*"Geist Mono",\s*monospace/);
  });

  it('앱 소스는 fetch · XMLHttpRequest · 이미지(<img>) · SVG를 쓰지 않는다', () => {
    for (const [path, source] of sources) {
      expect(/\bfetch\s*\(/.test(source), `${path}의 fetch`).toBe(false);
      expect(/XMLHttpRequest/.test(source), `${path}의 XMLHttpRequest`).toBe(false);
      expect(/h\(\s*'(img|svg)'/.test(source), `${path}의 img · svg`).toBe(false);
    }
  });
});

describe('색 변수 (FD-01 · 03) — 문서 값이 변수로 정의돼 있다', () => {
  it.each<[string, string]>([
    ['--bg', '#0a0b0d'],
    ['--card', '#16181c'],
    ['--ink-soft', '#a8acb3'],
    ['--accent', '#0052ff'],
  ])('%s = %s', (name, value) => {
    expect(indexHtml).toMatch(new RegExp(String.raw`${name}:\s*${value}\b`, 'i'));
  });

  it('주황 선택 색(#f6ad55 · #fffaf0)이 남아 있지 않다 (FD-03)', () => {
    expect(indexHtml.toLowerCase()).not.toContain('#f6ad55');
    expect(indexHtml.toLowerCase()).not.toContain('#fffaf0');
  });

  it('그림자를 쓰지 않는다 (box-shadow가 none이 아닌 값 없음)', () => {
    const shadows = Array.from(indexHtml.matchAll(/box-shadow:\s*([^;}]+)/g)).map((m) => m[1].trim());
    for (const value of shadows) expect(value).toBe('none');
  });
});
