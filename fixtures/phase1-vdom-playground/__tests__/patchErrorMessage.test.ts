import { describe, it, expect } from 'vitest';
import { patchErrorMessage } from '../patchErrorMessage';

describe('patchErrorMessage — Patch 오류 알림 글 (검수 2회차 NB-2)', () => {
  it('복구에 성공했으면 마지막 기록 상태로 되돌렸다고 알린다', () => {
    const message = patchErrorMessage(new Error('경로 없음'), 'Patch를 적용하는 중');
    expect(message).toBe('Patch를 적용하는 중 오류가 났습니다 (경로 없음). 실제 영역을 마지막 기록 상태로 되돌렸습니다. 다시 작성해 주세요.');
  });

  it('복구까지 실패해 recoveryError가 붙은 예외는 되돌렸다고 하지 않고 새로고침을 안내한다', () => {
    const error = Object.assign(new Error('경로 없음'), { recoveryError: new Error('복구 그리기 실패') });
    const message = patchErrorMessage(error, '뒤로 이동하는 중');
    expect(message).toContain('뒤로 이동하는 중 오류가 났습니다 (경로 없음)');
    expect(message).toContain('실제 영역을 되돌리지 못했습니다. 새로고침해 주세요.');
    expect(message).not.toContain('되돌렸습니다');
  });

  it('Error가 아닌 값도 글로 바꿔 알린다', () => {
    expect(patchErrorMessage('문자열 예외', 'Patch를 적용하는 중')).toContain('(문자열 예외)');
  });
});
