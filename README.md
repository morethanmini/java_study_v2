# Java 자동채점 학습

개인 학습용 자바 문법 자동채점 프로젝트입니다. `main.html` 파일 하나를 브라우저로 열면 5개 챕터를 탭으로 전환하며 학습할 수 있습니다.

## 시작 방법

`main.html`을 브라우저로 열면 바로 사용 가능합니다. 별도 서버 설치가 필요 없습니다.

## 채점 방식

실제 자바 코드를 컴파일하거나 실행하지 않습니다. 정규식으로 핵심 문법 패턴을 검증하는 방식이라, 빠른 반복 학습에 적합합니다. 최종 코드는 IDE나 온라인 컴파일러에서 한 번 더 확인하는 것을 권장합니다.

## 챕터 구성

| 챕터 | 주제 | 문항 수 |
|------|------|--------|
| Ch1 | 자바 기본 문법 — 형변환, String, 예외처리 | 46 |
| Ch2 | OOP 기초 — 클래스, 상속, 인터페이스, 캡슐화 | 29 |
| Ch3 | 컬렉션 — List, Map, Set, 정렬, 집합 연산 | 48 |
| Ch4 | 자료구조 응용 — Stack, Queue, Deque, PriorityQueue | 28 |
| Ch5 | 람다·Stream·IO — 람다식, Stream API, Scanner, BufferedReader | 27 |

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

1. 해당 챕터 폴더의 `items/questions.js`에 문제 블록 추가
2. 아래 스크립트로 `main.html` 재생성

```bash
python3 rebuild.py
```

> `rebuild.py`가 없으면 각 챕터 `items/questions.js` 수정 후 Claude에게 main.html 재생성을 요청하세요.

## 프로젝트 구조

```
Java_study/
├── main.html                  # 메인 학습 파일 (이것만 열면 됨)
├── ch1. 자바 기본 문법/
│   ├── items/
│   │   ├── levels.js          # 장(레벨) 목록
│   │   └── questions.js       # 문제 데이터
│   └── version/               # 구버전 HTML 보관
├── ch2. 자바 OOP 기초/
├── ch3. 자바 컬렉션/
├── ch4. 자바 자료구조 응용/
└── ch5. 람다·Stream·IO/
```
