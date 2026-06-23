# Java 자동채점 학습 v2

개인 학습용 자바 문법 자동채점 프로젝트입니다. 5개 챕터를 탭으로 전환하며 학습할 수 있습니다.

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

## 채점 방식

코드 제출 시 로컬 서버(`http://localhost:3000/run`)로 전송하고, 서버에서 임시 파일을 생성해 `javac` → `java` 순으로 실행합니다. 실제 출력값과 기대 출력값을 비교하여 채점합니다.

## 챕터 구성

| 챕터 | 주제 | 문항 수 |
|------|------|--------|
| Ch1 | 자바 기본 문법 — 형변환, String, 예외처리 | 54 |
| Ch2 | OOP 기초 — 클래스, 상속, 인터페이스, 캡슐화 | 33 |
| Ch3 | 컬렉션 — List, Map, Set, 정렬, 집합 연산 | 53 |
| Ch4 | 자료구조 응용 — Stack, Queue, Deque, PriorityQueue | 28 |
| Ch5 | 람다·Stream·IO — 람다식, Stream API, Scanner, BufferedReader | 30 |

## 단축키

| 키 | 동작 |
|----|------|
| `Ctrl/Cmd` + `Enter` | 채점 |
| `←` / `→` | 이전 / 다음 문제 |
| `Enter` | 입력창 포커스 |
| `Esc` | 입력창 빠져나오기 |
| `R` | 정답 보기 / 숨기기 |
| `Tab` / `Shift+Tab` | 들여쓰기 / 내어쓰기 |

## 문제 추가 방법

`index.html`은 뼈대(UI·로직)만 포함하며, 문제 데이터는 각 챕터 폴더의 `items/*.js`에서 불러옵니다.

1. 해당 챕터 폴더의 `items/questions.js`에 문제 블록 추가
2. 새 레벨(장)이 필요하면 `items/levels.js`에도 추가
3. `index.html`을 다시 열면 바로 반영됩니다 — 별도 빌드 불필요

**`questions.js` 문제 블록 형식:**

```js
{id:'고유ID', level:레벨번호, title:'문제 제목',
 concept:'개념 설명',
 before:['// 주어지는 코드'], placeholder:['// TODO: ...'],
 after:['System.out.println(result);'],
 expected:'기대 출력값', answer:['정답 코드'], note:'추가 설명'}
```

> v2는 서버 연결 시 실제 실행 결과와 `expected`를 비교하고, 서버가 꺼져 있으면 자동으로 `regex` 폴백 채점으로 전환됩니다. 현재 채점 모드는 화면 상단 배지로 확인할 수 있습니다.

## 프로젝트 구조

```
Java_study_v2/
├── index.html                  # 메인 학습 파일
├── server.js                   # 로컬 Java 채점 서버 (Node.js)
├── open.sh                     # 서버 시작 + 브라우저 열기 스크립트
├── ch1-basic-syntax/
│   ├── items/
│   │   ├── levels.js          # 장(레벨) 목록
│   │   └── questions.js       # 문제 데이터
├── ch2-oop/
├── ch3-collections/
├── ch4-data-structures/
└── ch5-lambda-stream-io/
```
