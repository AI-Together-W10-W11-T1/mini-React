import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:5199' },
  // 화면 크기는 두 개만 (desktop · mobile)
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { browserName: 'chromium', viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
  ],
  // 테스트 전용 포트 5199 (개발 서버 기본 5173과 분리). 포트가 이미 쓰이면 남의 서버로 테스트하지 않고 바로 실패한다
  webServer: {
    command: 'npx vite --port 5199 --strictPort',
    url: 'http://localhost:5199/phase1-vdom-playground/',
    reuseExistingServer: false,
  },
});
