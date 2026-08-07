# 브라우저 회귀 테스트 실행

필수 조건은 Node.js 20 이상, Google Chrome, `playwright` 패키지, 그리고 Three.js CDN에 접근 가능한 네트워크다.

프로젝트에 패키지를 남기지 않고 일반 Node 환경에서 실행하려면 다음 명령을 사용한다.

```powershell
npm install --no-save --no-package-lock playwright
node --test tests/botanical_frame.e2e.test.cjs
```

Codex Desktop의 번들 런타임에서는 별도 설치 없이 실행할 수 있다.

```powershell
$runtimeRoot = "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies"
$env:NODE_PATH = "$runtimeRoot\node\node_modules"
& "$runtimeRoot\node\bin\node.exe" --test tests/botanical_frame.e2e.test.cjs
```

테스트는 임시 로컬 HTTP 서버를 열고 실제 Chrome에서 다음을 검증한 뒤 서버와 브라우저를 자동 종료한다.

- 평면 프레임 미사용, 절차형 식물 어셈블리의 실제 Z축 깊이와 80개 이상 메시
- 용기와 여덟 개 식물 파트의 동일 루트 스크롤 회전
- 런타임 파트·소켓·콜라이더·분해 포즈 메타데이터
- 375px·768px 세로 화면의 모델 안전 영역
- 동작 줄이기 환경의 즉시 포즈와 반복 모션 정지
- 데스크톱·태블릿 최종 회전 포즈의 모델 안전 영역
