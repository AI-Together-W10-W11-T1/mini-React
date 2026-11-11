# qa_todo_result: phase1

- 시나리오: `qa_todo.md`
- 실행 명령: `npx playwright test e2e/phase1-render e2e/phase1-patch e2e/phase1-guard e2e/phase1-history e2e/phase1-roundtrip e2e/phase1-attack e2e/phase1-visual --reporter=list`
- 실행 시각: 2026-11-11T04:18
- 캡처용 서버: 서버 남음: 5199 · `npx vite --port 5199 --strictPort` (node.exe PID 46868). TaskStop으로 작업은 중단했으나 vite 자식 프로세스가 계속 응답한다(HTTP 200). 규칙상 포트 · PID로 프로세스를 죽이지 않았으므로 마스터 · 사용자가 정리해야 한다

## 요약

| 프로젝트 | 통과 | 실패 | 건너뜀 |
| --- | --- | --- | --- |
| desktop (1280x800) | 48 | 0 | 0 |
| mobile (375x812) | 48 | 0 | 0 |

총 96 passed (11.8s) = 프로젝트당 48건. QA-1 ~ QA-33 · QA-A1 ~ QA-A12 45개 시나리오가 번호별로 desktop 1건 · mobile 1건씩 ok이고, 나머지 3건은 `phase1-render.spec.ts`의 번호 없는 보조 테스트(`페이지를 연다 (콘솔 오류 · 경고 없음)` · `새로고침` · `가로 스크롤이 없다`, QA-1 · QA-A4 범위)다. 실패 · 건너뜀 0.

## 시나리오 결과

모든 시나리오가 desktop · mobile에서 각각 ok 1건. 캡처 열은 필수 캡처가 붙은 행만 채움 (스펙 통과가 근거, 캡처는 화면 확인용).

| QA | PRD | desktop | mobile | 캡처 |
| --- | --- | --- | --- | --- |
| QA-1 | P1-19 · P1-20 · P1-21 · P1-22 | PASS | PASS | `screenshot_01_desktop.png` · `screenshot_01_mobile.png` |
| QA-2 | P1-06 · P1-17 · D-01 · T-03 · T-06 · T-07 · B1 · B7 | PASS | PASS | `screenshot_02_desktop.png` · `screenshot_02_mobile.png` |
| QA-3 | P1-07~09 · D-02 · T-03 · T-07 · A4 | PASS | PASS | - |
| QA-4 | P1-10 · D-03 · T-03 · T-07 | PASS | PASS | - |
| QA-5 | P1-11 · P1-16 · D-04 · T-03 · T-05 · T-07 · A2 | PASS | PASS | - |
| QA-6 | P1-12 · D-05 · T-03 · T-07 · A3 | PASS | PASS | - |
| QA-7 | P1-14~16 · T-05 · T-07 | PASS | PASS | - |
| QA-8 | P1-13 · T-04 · §3.3 | PASS | PASS | - |
| QA-9 | P1-17 · P1-18 · T-06 · B2 | PASS | PASS | - |
| QA-10 | P1-25 · T-07 | PASS | PASS | - |
| QA-11 | P1-26 · P1-28~30 · T-06 · T-08 · B3 | PASS | PASS | `screenshot_03_desktop.png` · `screenshot_03_mobile.png` |
| QA-12 | P1-28 · P1-29 · §3.3 경계 | PASS | PASS | - |
| QA-13 | P1-26 · §3.3 undo 뒤 새 변경 | PASS | PASS | - |
| QA-14 | P1-30 · §3.3 미저장 편집 | PASS | PASS | - |
| QA-15 | P1-27 · T-08 | PASS | PASS | - |
| QA-16 | §5 실행 가능한 HTML · 오류 | PASS | PASS | - |
| QA-17 | §5 HTML 편집 · 오류 | PASS | PASS | `screenshot_04_desktop.png` · `screenshot_04_mobile.png` |
| QA-18 | §5 HTML 편집 · 오류 | PASS | PASS | - |
| QA-19 | §5 SVG 범위 | PASS | PASS | - |
| QA-20 | §5 오류 | PASS | PASS | - |
| QA-21 | §5 실행 가능한 HTML (미리보기) | PASS | PASS | - |
| QA-22 | Diff 시각화(확장) · A1 | PASS | PASS | `screenshot_05_desktop.png` · `screenshot_05_mobile.png` |
| QA-23 | P1-13 · P1-23 · T-04 · B4 | PASS | PASS | - |
| QA-24 | P1-13 · T-04 · B5 | PASS | PASS | - |
| QA-25 | P1-23 · T-07 · B6 | PASS | PASS | - |
| QA-26 | P1-07~11 · §5 · B8 | PASS | PASS | - |
| QA-27 | P1-02 · P1-12 · P1-18 · B9 | PASS | PASS | - |
| QA-28 | P1-10 · P1-14 · §5 · B10 · C1 | PASS | PASS | - |
| QA-29 | §5 · B11 · C3 | PASS | PASS | - |
| QA-30 | §5 · B12 | PASS | PASS | - |
| QA-31 | §5 · P1-19 · B13 · C4 | PASS | PASS | - |
| QA-32 | §5 · C5 | PASS | PASS | - |
| QA-33 | P1-28 · P1-29 · §5 · C2 | PASS | PASS | - |
| QA-A1 | P1-02 · T-01 · T-07 | PASS | PASS | - |
| QA-A2 | P1-25 · P1-28 · P1-29 | PASS | PASS | - |
| QA-A3 | §5 빈 입력 · P1-30 | PASS | PASS | - |
| QA-A4 | P1-20 · §3.3 | PASS | PASS | - |
| QA-A5 | §5 공백 · P1-06 · P1-18 | PASS | PASS | - |
| QA-A6 | §5 주석 · P1-06 · P1-10 · P1-11 | PASS | PASS | - |
| QA-A7 | §5 복수 루트 · P1-12 · P1-14 | PASS | PASS | - |
| QA-A8 | §5 boolean · P1-08 · P1-09 · T-06 | PASS | PASS | - |
| QA-A9 | §5 style · P1-08 · P1-09 · T-06 · A4 | PASS | PASS | - |
| QA-A10 | §5 오류 복구 · §6.2 | PASS | PASS | - |
| QA-A11 | §3.3 경계 · 미저장 편집 | PASS | PASS | - |
| QA-A12 | §5 오류 · 복구 · C2 · B22 | PASS | PASS | - |

## 캡처 목록 (fixtures/phase1-vdom-playground, Playwright MCP로 재현)

| 파일 | 보여 주는 것 |
| --- | --- |
| `screenshot_01_desktop.png` · `screenshot_01_mobile.png` | ① 초기 화면: "실제 영역" · "테스트 영역" 이름표, Patch · 뒤로 · 앞으로 · 시각화 스위치, 편집창에 샘플 HTML, 두 영역 같은 모양. mobile은 두 영역이 위아래로 쌓이고 가로 스크롤 없음 |
| `screenshot_02_desktop.png` · `screenshot_02_mobile.png` | ② D-01: `안녕`을 `반가워`로 고치고 Patch한 뒤. 실제 영역 · 미리보기 둘 다 `반가워`(붉은 글자 · 나머지 그대로), 편집창 글은 친 그대로 |
| `screenshot_03_desktop_before.png` · `screenshot_03_mobile_before.png` | ③의 뒤로 누르기 전: Patch 2회(글자 변경 → `<li>넷</li>` 추가) 직후, 목록에 `넷` 있음 |
| `screenshot_03_desktop.png` · `screenshot_03_mobile.png` | ③ 뒤로 뒤(세 칸 일치): `넷`이 사라지고 `반가워` 상태(S1)로 돌아옴. 편집창 · 미리보기 · 실제 영역이 모두 같은 상태 |
| `screenshot_04_desktop.png` · `screenshot_04_mobile.png` | ④ Patch 때 검사 alert 직후: 편집창에서 `</ul>`을 지우고 Patch → `[태그 짝] <ul> 태그가 닫히지 않았습니다 … 다시 작성해 주세요.` alert가 떴고(MCP 로그로 확인) 확인을 누른 뒤. 실제 영역은 그대로(`하나 둘 셋`), 편집창은 친 글(닫는 태그 없음) 그대로. alert가 떠 있는 동안은 Playwright가 스크린샷을 못 찍어 확인 직후 상태를 캡처함. 미리보기는 브라우저가 고쳐 읽어 `잠김` 버튼 위치가 어긋나 보임(미리보기에서 정상) |
| `screenshot_05_desktop.png` · `screenshot_05_mobile.png` | ⑤ 시각화 켜고 Patch 직후(약 120ms): 실제 영역 `또 만나요` 글자 둘레에 주황 깜빡임 상자(오버레이)가 보이고 다른 노드엔 없음 |

## 실패 보고

없음.

## 그 밖에 본 것

- 캡처용 vite 서버를 TaskStop으로 중단했는데 자식 node 프로세스(PID 46868, 포트 5199)가 남아 계속 응답한다. 다음 `npx playwright test`는 `reuseExistingServer: false`라 이 서버가 남아 있으면 포트 충돌로 실패할 수 있다. 정리 후 재실행 필요
- 캡처 ④의 미리보기: 닫는 `</ul>`이 없는 글을 브라우저가 고쳐 읽어 `잠김` 버튼이 목록 안으로 들어가 보인다. 의도된 미리보기 동작으로 보이며 Patch는 막혔다
- 스크립트로 캡처할 때 `page.on('dialog')`와 MCP 자체 dialog 처리가 겹쳐 MCP 응답에 alert 상태가 남았고 반환값(깜빡임 개수 등)이 응답에 안 실렸다. 캡처 파일 자체는 모두 생성됨. 깜빡임 개수 숫자는 QA-22 스펙 통과로 확인

## 사람 확인

- [x] 캡처를 직접 열어 확인함 (확인한 사람: ryuuuu5618, 시각: 2026-11-11T04:27) — 사용자 말 (원문): "캡처 확인했는데 모두 잘 적상 작동해"
- 서버 정리: QA가 남긴 5199 vite(node.exe PID 46868)를 사용자 승인 후 마스터가 종료, LISTEN 없음 확인
