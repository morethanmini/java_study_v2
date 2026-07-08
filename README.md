# Java 자동채점 학습 v2

개인 학습용 자바 문법 자동채점 프로젝트입니다. 5개 챕터를 탭으로 전환하며 학습하고, 스페이스드 리피티션 기반의 데일리 모드로 매일 10문제씩 복습할 수 있습니다.

> **v1과의 차이**: 이 버전은 Node.js 로컬 서버를 통해 코드를 실제 Java로 컴파일·실행하여 채점합니다. 정규식 기반인 v1보다 정확한 실행 결과로 검증합니다.

## 요구 사항

- Node.js
- JDK (`javac`, `java` 명령어가 PATH에 있어야 합니다)

## 시작 방법

### Mac / Linux

```bash
./open.sh
```

서버(포트 3000)를 백그라운드로 띄운 뒤 `index.html`을 브라우저로 엽니다. 서버가 이미 실행 중이면 바로 브라우저만 엽니다.

| 동작 | 명령어 |
| ---- | ------ |
| 서버만 실행 (콘솔에 로그 표시) | `node server/server.js` |
| 서버 상태 확인 | `lsof -i :3000` |
| 서버 종료 | `pkill -f "server.js"` |

### Windows

`index.html`을 열기 전에 서버를 먼저 띄워야 합니다.

| 동작 | 명령어 |
| ---- | ------ |
| 서버 시작 / 재시작 (창 없이 백그라운드) | `restart-server.bat` 더블클릭 (또는 `.\restart-server.bat`) |
| 서버 상태 확인 | `netstat -ano \| findstr :3000` |
| 콘솔 창을 띄운 채로 직접 실행 (디버깅용) | `node server\server.js` (종료는 `Ctrl+C`) |

`restart-server.bat`은 켜져 있든 꺼져 있든 상관없이 실행하면 됩니다 — 실행 중이면 종료 후 재시작하고, 꺼져 있으면 바로 새로 시작합니다. 내부적으로 `server/start-server-hidden.vbs`를 통해 `node server.js`를 창 없이 실행하며, 서버 로그는 `server/server-startup.log`에 쌓입니다.

## 채점 방식

코드 제출 시 로컬 서버(`http://localhost:3000/run`)로 전송하고, 서버에서 임시 파일을 생성해 `javac` → `java` 순으로 실행합니다. 실제 출력값과 기대 출력값을 비교하여 채점합니다.

서버가 꺼져 있으면 자동으로 정규식(regex) 폴백 채점으로 전환됩니다. 현재 채점 모드는 화면 상단 배지로 확인할 수 있습니다.

> Windows 환경 중에는 `java` 프로세스의 표준 출력이 `\r\n` 개행과 로캘 기본 인코딩(MS949)으로 나오는 경우가 있어, 서버에서 이를 UTF-8 · `\n`으로 정규화해서 비교합니다. 한글 출력이나 채점 결과가 이상하면 먼저 `restart-server.bat`으로 서버를 재시작해서 최신 코드가 반영됐는지 확인하세요.

## 챕터 구성

총 **231문제**. 각 챕터는 사이드바 탭이고, 챕터 안에 여러 "장"(레벨)이 있습니다.

| 챕터 탭 | 주제 | 문항 수 | 장 구성 |
| ---- | ---- | ------- | ------- |
| Ch1 기본 문법 | 형변환, String, 예외처리, 배열 | 62 | 1장 형변환 기초 · 2장 형변환 응용 · 3장 String 비교와 검색 · 4장 String 자르기와 변형 · 5장 예외처리 기초 · 6장 변형 연습 · 7장 제어 흐름과 수학 · 8장 배열 |
| Ch2 OOP 기초 | 클래스, 상속, 인터페이스, Generic, 어노테이션 | 52 | 1장 클래스와 객체 · 2장 상속 · 3장 인터페이스 · 4장 추상화·캡슐화 · 5장 변형 연습 · 6장 Comparator·enum · 7장 접근 제어자·동적 바인딩 · 8장 사용자 정의 예외 · 9장 Generic · 10장 어노테이션 |
| Ch3 컬렉션 | List, Map, Set, 정렬, 집합 연산 | 53 | 1장 선언과 초기화 · 2장 기본 CRUD · 3장 검색·정렬·집합 · 4장 응용과 함정 · 5장 변형 연습 · 6장 유틸리티 심화 |
| Ch4 자료구조 응용 | Stack, Queue, Deque, PriorityQueue | 28 | 1장 Stack · 2장 Queue · 3장 Deque · 4장 PriorityQueue · 5장 변형 연습 |
| Ch5 람다·Stream·IO | 람다식, Stream API, 파일 입출력 | 36 | 1장 람다 표현식 · 2장 Stream API 기초 · 3장 입출력(I/O) · 4장 변형 연습 · 5장 파일 입출력 |

각 챕터의 문제 데이터는 `chN-*/items/questions.js`(문제 본문), 장 구성은 `chN-*/items/levels.js`에 있습니다. 문제를 추가·삭제하면 이 표의 문항 수도 함께 갱신해야 합니다.

## 데일리 모드

사이드바의 **📅 데일리 문제** 버튼으로 진입합니다.

- 매일 5개 챕터에서 **10문제**를 라운드로빈 + 셔플로 자동 선택
- **스페이스드 리피티션(SRS)** 적용: 틀린 문제 → 1일 후, 첫 정답 → 3일 후, 반복 정답 → 7 → 14 → 30일 간격
- 같은 날 새로고침해도 **동일 세트 유지**, 풀었던 위치·코드·결과도 복원
- 챕터 학습과 완전히 분리 운영 (데일리에서 푼 입력이 챕터로 넘어가지 않음)
- 모든 문제를 풀면 **결과 요약** 화면(PASS/FAIL + 다음 등장일) 표시

### SRS 간격 기준

| 상태 | 다음 등장 |
| ---- | --------- |
| 틀림 | 1일 후 |
| 첫 정답 | 3일 후 |
| 2회 연속 정답 | 7일 후 |
| 3회 연속 정답 | 14일 후 |
| 4회 이상 | 30일 후 |

## 그 외 기능

- **☆ 즐겨찾기**: 문제별로 즐겨찾기 표시 후 사이드바에서 즐겨찾기만 모아 풀 수 있습니다.
- **📌 오답노트**: 챕터 안에서 틀린 문제만 모아 복습 모드로 다시 풉니다.
- **📊 오답 통계**: 전체 챕터를 통틀어 틀린 문제 이력을 모아 보여줍니다.
- **학습 잔디**: GitHub 잔디 스타일로 날짜별 학습량을 시각화합니다.
- **📝 메모**: 문제별로 개인 메모를 남겨 저장할 수 있습니다.
- **데이터 내보내기 / 가져오기**: 진행 상황·즐겨찾기·SRS 이력·메모 등 모든 localStorage 데이터를 JSON 파일로 백업/복원합니다. (기기 이동 시 유용)
- **전체 초기화**: 모든 챕터의 진행 상황을 리셋합니다.

## 단축키

| 키 | 동작 |
| ---- | ---- |
| `Ctrl/Cmd` + `Enter` | 채점 |
| `←` / `→` | 이전 / 다음 문제 |
| `↑` / `↓` | 이전 / 다음 장(레벨) 이동 |
| `Enter` | 입력창 포커스 |
| `Esc` | 입력창 빠져나오기 |
| `R` | 정답 보기 / 숨기기 |
| `Tab` / `Shift+Tab` | 들여쓰기 / 내어쓰기 |

## 문제 추가 방법

문제 데이터는 각 챕터 폴더의 `items/*.js`에 있습니다.

1. 해당 챕터의 `items/questions.js`에 문제 블록 추가
2. 새 레벨(장)이 필요하면 `items/levels.js`에도 추가
3. `index.html`을 다시 열면 바로 반영 — 별도 빌드 불필요
4. 이 README의 [챕터 구성](#챕터-구성) 표 문항 수도 함께 수정

**`questions.js` 문제 블록 형식:**

```js
{
  id: '고유ID', level: 레벨번호, title: '문제 제목',
  concept: '개념 설명',
  before: ['// 주어지는 코드'],
  placeholder: ['// TODO: ...'],
  after: ['System.out.println(result);'],
  expected: '기대 출력값',
  answer: ['정답 코드'],
  note: '추가 설명',
  regex: [/정답을_검증하는_정규식/]
}
```

> `regex` 필드는 서버 오프라인 시 폴백 채점에 사용되므로 반드시 포함해야 합니다.

## localStorage 키 목록

| 키 | 내용 |
| -- | ---- |
| `ds_quiz_progress_v1_basic` ~ `v5_lambda` | 챕터별 문제 풀이 진행 상황 |
| `ds_quiz_bookmarks_v1_basic` ~ `v5_lambda` | 챕터별 즐겨찾기 |
| `ds_quiz_progress_v1_basic_daily` ~ `v5_lambda_daily` | 데일리 모드에서의 챕터별 진행 이력(라운드로빈 선택용) |
| `java_study_pos` | 마지막 위치 (챕터/개요/데일리) |
| `java_daily_history` | SRS 이력 (문제별 마지막 풀이일, 정오답, 간격) |
| `java_daily_set` | 오늘의 데일리 세트 (날짜 기반 캐시) |
| `java_study_grass` | 학습 잔디 데이터 (날짜별 학습량) |
| `java_study_grass_seen` | 학습 잔디 중복 집계 방지용 (당일 처리한 문제 목록) |
| `java_wrong_log` | 오답 통계 로그 |
| `java_study_memo` | 문제별 메모 |
| `sidebar_pinned` | 사이드바 고정 여부 |

모든 키는 사이드바의 **데이터 내보내기 / 가져오기**로 한 번에 백업·복원됩니다. (`client/app.js`의 `EXPORT_KEYS` 참고)

## 프로젝트 구조

```
java_study_v2/
├── index.html                  # 메인 UI (진입점)
├── open.sh                     # (Mac) 서버 시작 + 브라우저 열기
├── restart-server.bat          # (Windows) 서버 시작/재시작
├── client/
│   ├── app.js                  # 앱 로직 (채점, 렌더링, 데일리 모드 등)
│   └── style.css                # 스타일
├── server/
│   ├── server.js                # 로컬 Java 채점 서버 (Node.js)
│   └── start-server-hidden.vbs  # (Windows) 콘솔 창 없이 node 실행하는 런처
├── ch1-basic-syntax/items/
├── ch2-oop/items/
├── ch3-collections/items/
├── ch4-data-structures/items/
└── ch5-lambda-stream-io/items/
```
