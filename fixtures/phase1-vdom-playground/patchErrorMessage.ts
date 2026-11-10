// [AI Note]: Patch · 뒤로 · 앞으로 도중 예외(C2)를 알리는 alert 글을 만든다. main.ts가 DOM을 읽으며 시작되는 파일이라
// 글을 만드는 부분만 따로 떼어 단위 테스트한다 (검수 2회차 NB-2).
export function patchErrorMessage(error: unknown, doing: string): string {
  const detail = error instanceof Error ? error.message : String(error);
  // react-dom은 복구 그리기까지 실패하면 원래 예외에 `recoveryError`를 붙여 던진다 (NB-5). 그때는 되돌렸다고 알리면 사실과 다르다.
  if (typeof error === 'object' && error !== null && 'recoveryError' in error) {
    return `${doing} 오류가 났습니다 (${detail}). 실제 영역을 되돌리지 못했습니다. 새로고침해 주세요.`;
  }
  return `${doing} 오류가 났습니다 (${detail}). 실제 영역을 마지막 기록 상태로 되돌렸습니다. 다시 작성해 주세요.`;
}
