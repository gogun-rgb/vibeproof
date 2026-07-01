# VibeProof

[![CI](https://github.com/gogun-rgb/vibeproof/actions/workflows/ci.yml/badge.svg)](https://github.com/gogun-rgb/vibeproof/actions/workflows/ci.yml)
![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)
![Node.js >=22](https://img.shields.io/badge/node-%3E%3D22-339933.svg)

**AI가 실행하기 전에 먼저 스캔하세요.**

VibeProof는 공개 GitHub 저장소와 로컬 폴더를 위한 정적 사전 점검 스캐너입니다. 저장소 코드를 실행하기 전에 위험한 설치 훅, 에이전트 지시문, MCP 권한, 컨테이너 설정, 직접 의존성, 비밀 정보처럼 보이는 텍스트를 찾아 줍니다.

VibeProof는 저장소가 안전하다고 보장하지 않습니다. 실제 파일과 줄 번호에 연결된 증거 기반 finding을 제공해 사람이 다음 점검 대상을 판단할 수 있게 합니다.

## Quick Start

npm 패키지가 공개된 뒤에는 CLI를 `npx`로 실행합니다.

```powershell
npx vibeproof scan https://github.com/owner/repository
```

기본 스캔은 정적 모드이며 저장소 코드를 실행하지 않습니다.

## CLI 데모

아래 이미지는 risky postinstall fixture를 스캔한 실제 CLI 출력으로 렌더링했습니다.

![VibeProof CLI output](docs/terminal-demo.svg)

이 fixture는 의도적으로 `BLOCK`을 반환하므로 명령 종료 코드는 `2`입니다.

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

기본 스캔 모드는 `--no-ai`입니다. 정적 finding, 점수, verdict는 결정적으로 계산됩니다. 선택적 GPT 설명은 검증된 정적 finding과 분리되며 v0.1.0에서는 기본적으로 비활성화되어 있습니다.

종료 코드:

| Verdict | 기본 종료 코드 |
| --- | --- |
| ALLOW | 0 |
| WARN | 1 |
| BLOCK | 2 |
| 내부 오류 또는 verifier 오류 | 3 |

`--fail-on block`은 ALLOW와 WARN에서 0을 반환하고, BLOCK에서 2를 반환합니다.

## VibeProof가 확인하는 항목

- `package.json` lifecycle 설치 훅과 원격 실행 패턴.
- 안전 절차 우회를 요구하는 README와 AI 에이전트 지시 파일.
- 넓은 filesystem 또는 shell 권한을 가진 MCP 설정.
- privileged mode와 Docker socket mount 같은 Docker 및 Compose 설정.
- 마스킹된 증거로 표시되는 비밀 정보 유사 텍스트.
- 직접 URL 또는 Git 의존성.

모든 finding에는 다음 항목이 포함됩니다.

- Rule ID
- Severity
- 파일 경로
- 줄 번호
- 마스킹된 증거
- 설명
- 해결 방향
- 점수 기여도

## 구조

```text
TARGET_VALIDATION
SOURCE_ACQUISITION
FILE_DISCOVERY
STATIC_SCAN
EVIDENCE_AGGREGATION
DETERMINISTIC_SCORING
GPT_SECURITY_REVIEW
CODE_VERIFICATION
REPORT_GENERATION
COMPLETED
FAILED
```

모노레포 구성:

```text
apps/web               Next.js App Router UI
packages/cli           CLI 진입점 및 npm 패키지
packages/core          공통 타입과 증거 헬퍼
packages/orchestrator  스캔 상태 머신
packages/scanners      정적 스캐너와 소스 탐색
packages/rules         규칙 데이터
packages/verifier      Zod 스키마와 증거 검증
packages/report        Terminal, JSON, Markdown 출력
packages/ai-providers  선택적 GPT 리뷰 경계
fixtures               안전/위험 테스트 fixture
```

## Web UI

```powershell
npm run dev -w @vibeproof/web
```

브라우저에서 `http://localhost:3000`을 엽니다.

Web UI는 공개 `https://github.com/owner/repo` URL을 입력받고 같은 스캔 엔진을 호출합니다. 진행 단계, finding, 증거를 표시하고 JSON 또는 Markdown 보고서를 다운로드할 수 있습니다. 임의의 서버 로컬 경로는 받지 않습니다.

## Development

로컬에서 빌드하거나 기여할 때만 저장소를 clone합니다.

```powershell
git clone https://github.com/gogun-rgb/vibeproof.git
cd vibeproof
npm install
npm run build
npm run scan -- ./fixtures/risky-postinstall
```

개발 중에는 관련 테스트만 실행합니다. 릴리스 승인 전에는 다음을 실행합니다.

```powershell
npm run verify
```

GitHub Actions는 Windows, Ubuntu, macOS에서 같은 핵심 검증을 실행합니다.

## 보안 경계

- VibeProof는 기본 스캔 중 대상 저장소 코드를 실행하지 않습니다.
- VibeProof는 대상 저장소의 `npm install`, `pip install`, setup, build, test 명령을 실행하지 않습니다.
- API key는 서버 측에서만 사용합니다.
- 비밀 정보 유사 증거는 마스킹합니다.
- GPT는 점수나 verdict를 결정하지 않습니다.
- VibeProof는 안전을 보장하지 않으며 정적 증거를 보고합니다.

## 환경 변수

선택적 provider가 필요할 때 `.env.example`을 복사합니다.

```text
OPENAI_API_KEY=
GITHUB_TOKEN=
```

CLI와 핵심 스캐너는 API key 없이 동작합니다.
