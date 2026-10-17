# IT 시스템 장애·트러블슈팅 기록 게시판

개발자와 시스템 운영자가 서버 오류·장애의 발생 환경, 증상, 원인 분석, 해결 방법을 기록하고 공유하는 게시판이다. 목록과 상세는 로그인 없이 조회한다. 로그인한 계정으로 글을 작성하고 본인 글을 수정·삭제한다. 타인 글 변경은 `AuthService.assertOwner()`에서 거부하며 응답은 `403 FORBIDDEN`이다.

- 학번: 202313746
- 이름: 인숙영
- GitHub 저장소 URL: https://github.com/abc202313746/JWT-Assignment.git
- 테스트 기준 코드 커밋 SHA: 6ec886435f5909b0d8073be0e2b405cfef25b615

## 보고서와 테스트 증거

- [구현 보고서 PDF](docs/report.pdf): 01~06절, T01~T17 결과는 04절
- [편집용 Word 보고서](docs/report.docx)
- [직접 촬영한 테스트 캡처와 공식 검사 로그](docs/evidence/manual/)
- [최종 코드 기준 공식 일반 검사 로그](docs/evidence/manual/M24-check-api-final.log)
- [최종 코드 기준 공식 만료 포함 검사 로그](docs/evidence/manual/M25-check-api-expiry.log)

## 기술 조합과 실행 환경

선택한 폴더는 `frontend-react/`와 `backend-spring/`이다. 의존성 버전은 `package.json`, `package-lock.json`, `pom.xml`, Maven Wrapper 설정을 기준으로 기록했다.

| 구분 | 기술·버전 |
|---|---|
| 프론트엔드 | React·React DOM 19.3.0, Vite 8.3.4, React 플러그인 6.1.2, Pretendard 1.3.9 |
| 백엔드 | Spring Boot 3.5.16, Java 소스·타깃 17 |
| 데이터 저장 | SQLite 파일 DB, SQLite JDBC 3.51.3.0 |
| JWT | JJWT 0.13.0, HS256 |
| 빌드 도구 | Maven 3.9.11, Maven Wrapper 3.3.4 |
| 직접 실행한 환경 | Windows 11 25H2, OS 빌드 26200.9457, Windows PowerShell 5.1 |
| 런타임 | Node.js 24.11.1, npm 11.6.2, Java 17.0.20.1 |
| 화면 확인 | Google Chrome의 Network 탭과 반응형 화면 |

## 프로젝트 구조

```text
JWT-Assignment/
├── README.md
├── .gitignore
├── frontend-react/
│   ├── src/
│   │   ├── api.js
│   │   ├── main.jsx
│   │   └── style.css
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
├── backend-spring/
│   ├── .mvn/wrapper/maven-wrapper.properties
│   ├── src/main/java/edu/classroom/board/
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── schema.sql
│   ├── env.example.txt
│   ├── mvnw
│   ├── mvnw.cmd
│   └── pom.xml
├── tools/
│   └── check_api.py
└── docs/
    ├── 01_과제공지.docx
    ├── 01_과제공지.md
    ├── 01_과제공지.pdf
    ├── 02_API명세.md
    ├── 03_구현체크리스트.md
    ├── 04_보고서양식.docx
    ├── 04_보고서양식.md
    ├── 05_테스트시나리오.md
    ├── 06_제출용_README.md
    ├── 07_로컬실행안내.md
    ├── report.docx
    ├── report.pdf
    └── evidence/
        └── manual/
```

실행 시 생성되는 `node_modules/`, `dist/`, `target/`, `backend-spring/data/board.sqlite`와 실제 환경변수 파일은 `.gitignore`로 Git 추적에서 제외한다. 의존성 lock 파일과 Maven Wrapper는 저장소에 포함한다. 위 트리는 소스와 제출 문서를 기준으로 정리했다.

## 설치와 실행

아래 명령은 Windows PowerShell 기준이다. Node.js, JDK, Git을 설치한 환경에서 실행한다. 공식 API 검사에는 Python 3와 `py` 명령을 사용한다. 최초 의존성 다운로드에는 인터넷 연결이 필요하다.

### 1. 저장소 복제

저장소를 복제한 뒤 생성된 폴더로 이동한다.

```powershell
$repositoryUrl = 'https://github.com/abc202313746/JWT-Assignment.git'
git clone $repositoryUrl JWT-Assignment
Set-Location -LiteralPath '.\JWT-Assignment'
```

### 2. 백엔드 빌드·환경변수 설정·실행

터미널 A의 프로젝트 루트에서 실행한다. `mvnw.cmd package`가 Maven과 의존성을 내려받고 실행 JAR를 생성한다.

```powershell
Set-Location -LiteralPath '.\backend-spring'
.\mvnw.cmd clean package

$env:JWT_SECRET = node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
$env:JWT_ISSUER = 'webservice-class'
$env:JWT_AUDIENCE = 'board-api'
$env:TOKEN_TTL = '90'
$env:PORT = '8000'
$env:DB_FILE = 'data/board.sqlite'

java -jar target\jwt-board-1.0.0.jar
```

`JWT_SECRET`은 32바이트 난수를 표현한 64자리 16진수다. 실제 값은 파일이나 보고서에 기록하지 않는다. 설정 예시는 [env.example.txt](backend-spring/env.example.txt)에 있다. Spring Boot는 이 파일이나 `.env`를 자동으로 읽지 않으므로 환경변수를 설정한 터미널에서 JAR를 실행한다.

백엔드 주소는 `http://127.0.0.1:8000`이다. 별도 PowerShell에서 다음 명령으로 확인한다. 정상 JSON의 `status`는 `ok`, HTTP 상태는 `200`이다.

```powershell
Invoke-WebRequest -Uri 'http://127.0.0.1:8000/api/health' -UseBasicParsing
```

### 3. 프론트엔드 설치·빌드·preview 실행

백엔드를 실행한 상태에서 터미널 B를 열고 프로젝트 루트에서 실행한다.

```powershell
Set-Location -LiteralPath '.\frontend-react'
npm.cmd ci
npm.cmd run build
npm.cmd run preview
```

접속 주소는 `http://127.0.0.1:4173`이다. `vite.config.js`의 `preview.proxy`가 `/api` 요청을 `http://127.0.0.1:8000`으로 전달한다. 포트 변경이 필요하면 백엔드의 `PORT`와 Vite의 프록시 대상을 함께 수정한다. 제출·테스트 기준은 프론트 4173번과 백엔드 8000번이다.

개발 중에는 `frontend-react/`에서 `npm.cmd run dev`를 실행해 `http://127.0.0.1:5173`에 접속한다.

### 4. 종료와 코드 변경 후 재실행

프론트와 백엔드를 실행한 각 터미널에서 `Ctrl+C`로 종료한다. npm 종료 확인이 나오면 `Y`를 입력한다.

프론트 소스를 변경하면 `frontend-react/`에서 `npm.cmd run build` 후 `npm.cmd run preview`를 다시 실행한다. 백엔드 소스를 변경하면 `backend-spring/`에서 `.\mvnw.cmd clean package` 후 `java -jar target\jwt-board-1.0.0.jar`를 다시 실행한다. 새 터미널을 사용하면 백엔드 환경변수도 다시 설정한다.

## 테스트 계정과 DB

| 계정 | ID | 이메일 | 과제용 비밀번호 |
|---|---:|---|---|
| Alice | 1 | alice@class.test | Classroom!2026 |
| Bob | 2 | bob@class.test | Classroom!2026 |

계정과 PBKDF2 비밀번호 검증은 제공된 `Users.java`를 유지했다. 계정은 SQLite에 저장하지 않는다. 게시글은 `backend-spring/`에서 실행할 때 `backend-spring/data/board.sqlite`에 저장한다. DB 파일이 없으면 `DatabaseConfig.dataSource()`가 폴더를 만들고 `schema.sql`이 빈 `posts` 테이블을 생성한다.

같은 DB 파일을 사용하는 서버 재시작에서는 게시글이 유지된다. 2026년 10월 17일 새 폴더에서 서버를 종료하고 다시 실행한 뒤, 4173번을 통한 목록 조회에서 `200`과 게시글 2건을 확인했다. 재시작 전후 JSON 전체를 비교한 결과 ID·제목·본문·작성자·생성 시각·수정 시각이 일치했다. 증거는 [서버 재시작 로그](docs/evidence/manual/M28-1-restart-log.png), [재시작 전후 데이터 비교](docs/evidence/manual/M28-2-restart-data.png), [재시작 후 4173번 상세 조회](docs/evidence/manual/M28-3-restart-preview.png)다. DB 파일은 저장소에 포함하지 않으므로 새로 clone한 폴더에 DB가 없으면 게시글 0건으로 시작한다.

DB를 초기화하려면 백엔드를 `Ctrl+C`로 종료한 뒤 프로젝트 루트에서 실행한다. 이 명령은 저장한 게시글을 삭제한다.

```powershell
if (Test-Path -LiteralPath '.\backend-spring\data\board.sqlite') {
    Remove-Item -LiteralPath '.\backend-spring\data\board.sqlite'
}
```

## 구현 완료 범위

| 기능 | 완료 여부 | 주요 파일·동작 |
|---|---|---|
| 공개 목록·상세 | 완료 | `BoardController.list()`·`get()`, 정상 `200` |
| 로그인·JWT 발급 | 완료 | `Users.verify()`와 `AuthService.issueToken()`, HS256, 기본 TTL 90초, 성공 `200` |
| JWT 검증·내 정보 | 완료 | `AuthService.currentUserId()`·`verifiedUserId()`, 정상 `200`, 인증 실패 `401` |
| 글 작성·작성자 저장 | 완료 | `BoardController.create()`가 검증된 계정 ID를 `PostStore.create()`에 전달, 성공 `201` |
| 본인 글 수정·삭제 | 완료 | `AuthService.assertOwner()`로 작성자 비교, 성공 `200`·`204`, 타인 변경 `403 FORBIDDEN` |
| 만료·로그아웃·새로고침 | 완료 | `api.js`의 모듈 변수 `session` 사용, `clearSession()`으로 토큰과 계정 정보 초기화 |
| 입력·오류 처리 | 완료 | `fields()`가 제목 1~100자·본문 1~5000자와 허용 필드를 검사한다. 비밀번호는 공백을 제거하지 않은 원문으로 1~128자를 검사하며 입력 오류는 `400 BAD_INPUT`이다. |
| 게시글 데이터 유지 | 완료 | SQLite 파일 저장, 새로고침·서버 재시작 후 기존 글 조회 `200` |

기능 테스트에서 확인된 오류와 미완성 기능: 없음. 추가 시험의 미실행·미확인 사항은 아래와 보고서 04·05절에 구분했다.

## 테스트 방법과 결과

2026년 10월 17일 원래 작업 폴더 바깥의 `JWT-Assignment-final-check`에 저장소를 clone하고 설치·빌드·실행과 추가 검증을 직접 수행했다. 테스트한 checkout은 `cb012af257d7b9c53c076c374e2494d775060e0a`다. 해당 커밋의 `backend-spring/`, `frontend-react/`, `tools/check_api.py`는 위에 기록한 테스트 기준 코드 커밋 `6ec886435f5909b0d8073be0e2b405cfef25b615`와 동일하다.

`M01`~`M13`은 2026년 10월 15~16일의 비밀번호 빈 값 검사 수정 전 증거다. `M14`~`M28`은 비밀번호 빈 값 검사를 `checked.isEmpty()`로 수정한 최종 코드 기준의 10월 17일 증거다. 이전 캡처는 로그인·버튼 표시·새로고침·로그아웃 등 해당 화면 동작의 증거로 구분했다. T01~T17의 절차·실제 HTTP와 JSON `code`·판정·증거는 보고서 04절에 기록했다.

일반 검사는 `TOKEN_TTL=90`인 백엔드를 실행한 뒤 별도 터미널의 프로젝트 루트에서 수행한다.

```powershell
py -u tools/check_api.py --mode final
```

만료 검사는 백엔드를 `Ctrl+C`로 종료하고 같은 백엔드 터미널의 `backend-spring/`에서 TTL을 바꿔 재시작한다. 비밀 키와 DB 경로는 유지한다.

```powershell
$env:TOKEN_TTL = '3'
java -jar target\jwt-board-1.0.0.jar
```

별도 터미널의 프로젝트 루트에서 실행한다.

```powershell
py -u tools/check_api.py --mode final --expiry
```

검사가 끝나면 백엔드를 종료하고 같은 백엔드 터미널에서 일반값으로 복구해 실행한다.

```powershell
$env:TOKEN_TTL = '90'
java -jar target\jwt-board-1.0.0.jar
```

일반 검사는 `All 40 checks passed (final).`, 만료 포함 검사는 `All 48 checks passed (final).`을 출력했고 두 실행의 종료 코드는 `0`이다. 만료 포함 검사는 앞선 일반 항목을 포함하므로 서로 다른 시험 88건으로 합산하지 않는다. 공식 도구가 생성한 시험용 글은 정상 종료 과정에서 삭제한다. 제출한 M24·M25 로그는 `Out-File -Encoding utf8`로 저장했다.

공식 검사에서는 정상 CRUD, 잘못된 계정, 무토큰·변조·만료 토큰, 타인 글 변경, 추가 작성자 필드, 입력 제한, 없는 글과 거부 후 데이터 불변을 확인했다. 생성 응답의 `201`과 `Location`, 삭제 응답의 `204`와 빈 본문, 보호 API 인증 실패의 `401`과 `WWW-Authenticate: Bearer`도 확인했다. 브라우저 상태 변화와 서버 재시작은 별도로 직접 수행했다.

`403` 이후 로그인 유지 시험에서는 브라우저 Console에서 한 번의 `DELETE /api/posts/2` 요청 대상만 Alice의 `/api/posts/1`로 바꿨다. 실제 서버의 `403 FORBIDDEN` 응답을 기존 `api.js`와 `main.jsx`가 처리하도록 했고 Bob 로그인 유지와 오류 배너를 확인했다. 응답을 만들어 넣거나 제출 소스를 변경하지 않았다. `401` 이후 로그인 해제는 TTL 3초로 로그인하고 만료 후 내 정보 조회를 실행해 확인했다.

추가 시험 중 `iss`·`aud` 불일치, 허용하지 않은 서명 알고리즘, 필수 클레임 누락·형식 오류를 각각 분리한 토큰 요청은 미실행이다. 비밀 키 누락·형식 오류·예시 키에 대한 서버 기동 실패의 실행 결과는 미확인이다. 해당 분기는 코드 확인과 실제 실행 결과를 구분해 보고서에 기록했다.

| 직접 확인한 결과 | 증거 |
|---|---|
| 새 폴더 백엔드·프론트 설치와 빌드, 종료 코드 `0`, 4173번 공개 API `200` | [M14-clone-backend-build.png](docs/evidence/manual/M14-clone-backend-build.png), [M15-clone-backend-start.png](docs/evidence/manual/M15-clone-backend-start.png), [M16-clone-frontend-build.png](docs/evidence/manual/M16-clone-frontend-build.png), [M17-clone-preview-api.png](docs/evidence/manual/M17-clone-preview-api.png) |
| 비밀번호 빈 문자열 `400 BAD_INPUT`, 공백 한 글자·정상 비밀번호 앞뒤 공백 `401 INVALID_CREDENTIALS`, 정상 입력 `200`·`expiresIn=90` | [M18-password-inputs.png](docs/evidence/manual/M18-password-inputs.png) |
| `Authorization: Basic abc` 형식 오류 `401 TOKEN_REQUIRED`, `WWW-Authenticate: Bearer` | [M19-auth-header-format.png](docs/evidence/manual/M19-auth-header-format.png) |
| 없는 글 수정: 무토큰 `401 TOKEN_REQUIRED`, 정상 토큰 `404 NOT_FOUND` | [M20-1-missing-no-token-401.png](docs/evidence/manual/M20-1-missing-no-token-401.png), [M20-2-missing-valid-token-404.png](docs/evidence/manual/M20-2-missing-valid-token-404.png) |
| Alice 글 등록 `201`, `Location: /api/posts/1`, `authorId=1` | [M21-0-alice-post-create.png](docs/evidence/manual/M21-0-alice-post-create.png) |
| 공백 제목 수정: Bob의 타인 글 `403 FORBIDDEN`, Alice의 본인 글 `400 BAD_INPUT`; 재조회 `200`, 데이터 일치 | [M21-1-bob-blank-title-403.png](docs/evidence/manual/M21-1-bob-blank-title-403.png), [M21-2-alice-blank-title-400.png](docs/evidence/manual/M21-2-alice-blank-title-400.png) |
| Bob의 타인 글 수정·삭제 `403 FORBIDDEN`; 거부 후 재조회 `200`, 데이터 일치 | [M22-1-bob-update-403.png](docs/evidence/manual/M22-1-bob-update-403.png), [M22-2-bob-delete-403.png](docs/evidence/manual/M22-2-bob-delete-403.png) |
| 화면에서 실제 `403 FORBIDDEN` 처리 후 Bob 로그인과 본인 글 수정·삭제 버튼 유지 | [M23-1-forbidden-session.png](docs/evidence/manual/M23-1-forbidden-session.png) |
| 공식 일반 검사 40건 통과, 종료 코드 `0` | [M24-check-api-final.log](docs/evidence/manual/M24-check-api-final.log), [M24-check-api-final.png](docs/evidence/manual/M24-check-api-final.png) |
| 공식 만료 포함 검사 48건 통과, 종료 코드 `0`; 보호 API 4종 `401 TOKEN_EXPIRED` | [M25-check-api-expiry.log](docs/evidence/manual/M25-check-api-expiry.log), [M25-check-api-expiry.png](docs/evidence/manual/M25-check-api-expiry.png) |
| 만료된 Bob 토큰으로 Alice 글 수정 `401 TOKEN_EXPIRED`; 재조회 `200`, 데이터 일치 | [M26-expired-bob-edit-401.png](docs/evidence/manual/M26-expired-bob-edit-401.png) |
| 내 정보 요청의 `401 TOKEN_EXPIRED`·`WWW-Authenticate: Bearer`, 화면 로그인 해제 | [M27-expired-session-cleared.png](docs/evidence/manual/M27-expired-session-cleared.png) |
| TTL 90초 복구 후 서버 재시작, 게시글 2건과 모든 필드 유지, 4173번 상세 조회 `200` | [M28-1-restart-log.png](docs/evidence/manual/M28-1-restart-log.png), [M28-2-restart-data.png](docs/evidence/manual/M28-2-restart-data.png), [M28-3-restart-preview.png](docs/evidence/manual/M28-3-restart-preview.png) |
| 로그인 `200`과 Bearer 요청 헤더, 토큰 마스킹 | [M01-login-response-masked.png](docs/evidence/manual/M01-login-response-masked.png), [M01-1-bearer-request-masked.png](docs/evidence/manual/M01-1-bearer-request-masked.png) |
| 본인 글 수정 `200`, 삭제 `204`·빈 본문·목록 갱신 | [M02-1-owner-update.png](docs/evidence/manual/M02-1-owner-update.png), [M04-2-bob-update.png](docs/evidence/manual/M04-2-bob-update.png), [M04-3-bob-delete.png](docs/evidence/manual/M04-3-bob-delete.png) |
| 입력 오류 `400 BAD_INPUT` 화면과 타인 글 수정·삭제 버튼 숨김 | [M03-input-400.png](docs/evidence/manual/M03-input-400.png), [M04-bob-no-actions.png](docs/evidence/manual/M04-bob-no-actions.png) |
| 새로고침으로 로그인 해제 후 게시글 유지, 로그아웃 후 무토큰 요청 `401 TOKEN_REQUIRED` | [M05-refresh.png](docs/evidence/manual/M05-refresh.png), [M13-1-logout-headers.png](docs/evidence/manual/M13-1-logout-headers.png), [M13-1-logout-response.png](docs/evidence/manual/M13-1-logout-response.png) |
| 너비 900px·390px 화면 | [M09-responsive-900.png](docs/evidence/manual/M09-responsive-900.png), [M10-responsive-mobile.png](docs/evidence/manual/M10-responsive-mobile.png) |

## 핵심 구현 흐름

`BoardController.login()`이 입력을 검사하고 `Users.verify()`로 계정을 확인한다. `AuthService.issueToken()`이 `sub`, `exp`, `iss`, `aud`를 넣어 HS256으로 서명한다. `frontend-react/src/api.js`의 `login()`이 응답을 모듈 변수 `session`에 저장하고 `authorizationHeaders()`가 요청에 Bearer 헤더를 붙인다.

서버는 요청마다 `currentUserId()`와 `verifiedUserId()`로 토큰을 검사한다. 글 작성자는 검증된 계정 ID로 결정한다. 정상 ID·JSON의 수정 요청은 인증, 글 조회, `assertOwner()`, 입력 검사, DB 반영 순서로 처리한다. 프론트의 `canEdit()`와 별도로 서버가 작성자를 비교하며, 불일치 응답은 `403 FORBIDDEN`이다.

## AI 활용과 참고 자료

AI 사용 여부: 사용. Codex로 JWT 발급·검증과 작성자 권한 검사, 토큰 메모리 관리, HTTP 상태·오류 코드 표시, 반응형 스타일, 최종 검수와 추가 테스트 요청 명령, README·보고서 초안을 작성했다. Claude Code로 게시판 UI 초안을 작성했다. 사용한 세부 모델명과 최초 코드 작성 날짜는 확인되지 않아 추정하지 않았다.

| 도구 | 실제 반영 위치 | 반영 방식과 직접 확인한 내용 |
|---|---|---|
| Codex | `AuthService.java`, `BoardController.java`, `frontend-react/src/api.js`, `main.jsx`, `style.css`, `README.md`, 보고서 02~06절 | 코드와 README는 AI가 작성·수정한 내용을 그대로 반영했다. 최종 검수에서 `fields()`의 비밀번호 빈 값 검사와 추가 테스트 계획을 제안받아 반영했다. 보고서는 초안을 보고 직접 작성·수정한 뒤 수정 후 반영으로 기록했으며 빌드·공식 검사·수동 요청·화면 확인과 캡처는 직접 수행했다. |
| Claude Code | `frontend-react/src/main.jsx`, `style.css`의 게시판 UI 초안 | UI 초안은 Codex로 레이아웃·반응형 스타일·오류 표시를 수정한 뒤 반영했다. 900px·390px 화면은 직접 확인했다. |

제공 코드의 CRUD·SQLite·PBKDF2 검증과 공식 `tools/check_api.py`는 유지했다. 10월 17일 최종 코드의 비밀번호 입력 4건, 헤더 형식 오류, 없는 글 수정의 인증 순서, 작성자 권한과 입력 검사의 순서, 실제 `403` 후 로그인 유지, 만료 `401` 후 로그인 해제, 서버 재시작 후 데이터 유지와 공식 검사 결과를 직접 확인했다. 파일별 작성 출처와 대표 사례 3건은 보고서 02·05절에 기록했다.

- [수업 과제 공지](docs/01_과제공지.md): 필수 기능·제출물·JWT 기준
- [API 명세](docs/02_API명세.md): 경로·JSON·HTTP 상태·응답 헤더
- [구현 체크리스트](docs/03_구현체크리스트.md): 인증·권한·화면 구현 항목
- [보고서 양식](docs/04_보고서양식.docx): 보고서 구성·코드 설명·AI 출처 기록
- [테스트 시나리오](docs/05_테스트시나리오.md): T01~T17과 HTTP 확인 기준
- [제출용 README 양식](docs/06_제출용_README.md): 이 문서의 구성
- [로컬 실행 안내](docs/07_로컬실행안내.md): 설치·환경변수·빌드·실행 절차
- [Pretendard 1.3.9 라이선스](https://github.com/orioncactus/pretendard/blob/v1.3.9/LICENSE): `frontend-react/src/main.jsx`에서 글꼴 CSS를 가져오고 `frontend-react/src/style.css`에서 화면 글꼴로 지정했다. SIL Open Font License 1.1(OFL-1.1).
