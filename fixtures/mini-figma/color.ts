// [AI Note]: 색 순수 함수 모음. DOM · Hook · 엔진 import가 없다 (rootOnlyHooks.test.ts가 검사).
// 색은 이름('blue')이 아니라 `#rrggbb` 값으로 저장하고(FD-20), 버튼은 클래스가 아니라 `style`로 칠한다(FD-23).

/** 칩 8개 (FD-21). 이 순서대로 팔레트 판에 그려진다 */
export const PALETTE: readonly string[] = ['#0052ff', '#cf202f', '#05b169', '#f4b000', '#0a0b0d', '#5b616e', '#a8acb3', '#eef0f3'];

const WHITE = '#ffffff';
const INK = '#0a0b0d';

/** `#rrggbb` 형식인가 (대소문자 무관, 3자리 · 이름 · 빈 값은 아님) */
export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

/** WCAG 상대 휘도 (0 = 검정, 1 = 흰색). sRGB 한 채널을 선형 값으로 바꿔 가중합한다 */
function luminance(hex: string): number {
  const channel = (offset: number): number => {
    const v = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

const INK_LUMINANCE = luminance(INK);

/**
 * 배경색 위에 올릴 글자색 (FD-24, ④-1 A): 흰색과 먹색(#0a0b0d) 중 WCAG 대비가 큰 쪽.
 * [AI Note]: 대비 = (밝은 쪽 휘도 + 0.05) / (어두운 쪽 휘도 + 0.05). 흰색은 휘도 1이라 분자가 1.05.
 * 같으면(사실상 없음) 흰 글자. 경계는 #777777(흰 글자) / #787878(먹 글자). 형식 밖 값은 방어용으로 흰 글자 (UI에서는 안 나오는 값).
 */
export function textColorFor(bg: string): '#ffffff' | '#0a0b0d' {
  if (!isHexColor(bg)) return WHITE;
  const l = luminance(bg);
  const contrastWithWhite = 1.05 / (l + 0.05);
  const contrastWithInk = (l + 0.05) / (INK_LUMINANCE + 0.05);
  return contrastWithInk > contrastWithWhite ? INK : WHITE;
}

/**
 * 버튼의 `style` 묶음: 배경색 + 글자색. 속성 이름은 kebab 그대로 적는다 — 엔진 diff가 항목 하나당 `SET_STYLE` 한 줄을 만들고
 * 그 `property`가 이 이름이다 (같은 값 항목은 줄이 없음). 배경만 바뀌고 글자색이 같으면 1줄, 밝기 쪽이 바뀌면 2줄.
 */
export function buttonStyle(color: string): { 'background-color': string; color: string } {
  return { 'background-color': color, color: textColorFor(color) };
}
