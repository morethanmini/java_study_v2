# Java 자동채점 학습 v2

개인 학습용 자바 문법 자동채점 프로젝트입니다. 5개 챕터를 탭으로 전환하며 학습하고, 스페이스드 리피티션 기반의 데일리 모드로 매일 10문제씩 복습할 수 있습니다.

> **v1과의 차이**: 이 버전은 Node.js 로컬 서버를 통해 코드를 실제 Java로 컴파일·실행하여 채점합니다. 정규식 기반인 v1보다 정확한 실행 결과로 검증합니다.

## 요구 사항

- Node.js
- JDK (javac, java 명령어가 PATH에 있어야 합니다)

## 시작 방법

```bash
./open.sh
```

`open.sh`를 실행하면 로컬 채점 서버(포트 3000)를 백그라운드로 띄운 뒤 `index.html`을 브라우저로 엽니다. 서버가 이미 실행 중이면 바로 브라우저만 엽니다.

수동으로 서버만 띄우려면:

```bash
node server.js
```

서버 상태 확인:

```bash
lsof -i :3000
```

서버 종료:

```bash
pkill -f "server.js"
```

## 채점 방식

코드 제출 시 로컬 서버(`http://localhost:3000/run`)로 전송하고, 서버에서 임시 파일을 생성해 `javac` → `java` 순으로 실행합니다. 실제 출력값과 기대 출력값을 비교하여 채점합니다.

서버가 꺼져 있으면 자동으로 정규식(regex) 폴백 채점으로 전환됩니다. 현재 채점 모드는 화면 상단 배지로 확인할 수 있습니다.

## 챕터 구성

총 **231문제** (챕터당 평균 46문제)

| 챕터 | 주제 | 문항 수 |
| ---- | ---- | ------- |
| Ch1 | 자바 기본 문법 — 형변환, String, 예외처리, 배열 | 62 |
| Ch2 | OOP — 클래스, 상속, 인터페이스, Generic, 어노테이션 | 52 |
| Ch3 | 컬렉션 — List, Map, Set, 정렬, 집합 연산 | 53 |
| Ch4 | 자료구조 — Stack, Queue, Deque, PriorityQueue | 28 |
| Ch5 | 람다·Stream·IO — 람다식, Stream API, 파일 입출력 | 36 |

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

## 단축키

| 키 | 동작 |
| ---- | ---- |
| `Ctrl/Cmd` + `Enter` | 채점 |
| `←` / `→` | 이전 / 다음 문제 |
| `Enter` | 입력창 포커스 |
| `Esc` | 입력창 빠져나오기 |
| `R` | 정답 보기 / 숨기기 |
| `Tab` / `Shift+Tab` | 들여쓰기 / 내어쓰기 |

## 문제 추가 방법

문제 데이터는 각 챕터 폴더의 `items/*.js`에 있습니다.

1. 해당 챕터의 `items/questions.js`에 문제 블록 추가
2. 새 레벨(장)이 필요하면 `items/levels.js`에도 추가
3. `index.html`을 다시 열면 바로 반영 — 별도 빌드 불필요

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
| `java_study_progress_ch*` | 챕터별 문제 풀이 진행 상황 |
| `java_study_bookmarks_ch*` | 챕터별 즐겨찾기 |
| `java_study_pos` | 마지막 위치 (챕터/개요/데일리) |
| `java_daily_history` | SRS 이력 (문제별 마지막 풀이일, 정오답, 간격) |
| `java_daily_set` | 오늘의 데일리 세트 (날짜 기반 캐시) |
| `sidebar_pinned` | 사이드바 고정 여부 |

## 프로젝트 구조

```
Java_study_v2/
├── index.html                  # 메인 UI
├── app.js                      # 앱 로직 (채점, 렌더링, 데일리 모드 등)
├── style.css                   # 스타일
├── server.js                   # 로컬 Java 채점 서버 (Node.js)
├── open.sh                     # 서버 시작 + 브라우저 열기
├── ch1-basic-syntax/items/
├── ch2-oop/items/
├── ch3-collections/items/
├── ch4-data-structures/items/
└── ch5-lambda-stream-io/items/
```
