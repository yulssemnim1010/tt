# Sulwhasoo Scroll Scene Design System

## 1. Atmosphere & Identity

따뜻한 한방 원료와 호박빛 유리의 깊이를 전면에 둔 조용한 시네마틱 제품 장면이다. 시그니처는 스크롤에 따라 함께 회전하는 입체 용기와 절차형 꽃·잎·인삼 어셈블리가 만드는 원형 구도다.

## 2. Color

| 역할 | 토큰 | 값 | 사용 |
|---|---|---|---|
| 배경 | `--bg` | `#f6efe6` | 페이지와 로딩 화면 |
| 기본 글자 | `--ink` | `#2a1d12` | 제목과 본문 |
| 강조 | `--accent` | `#a8703a` | 오버라인과 스크롤 안내 |

- 장식 색은 제품 재질과 `img/a.png`–`img/d.png` 다각도 원본에서 가져온다.
- UI 색을 추가해야 할 때는 이 표에 먼저 등록한다.

## 3. Typography

| 단계 | 크기 | 굵기 | 행간 | 사용 |
|---|---|---|---|---|
| Display | `clamp(2rem, 4.4vw, 3.6rem)` | 400 | 1.25 | `h1`, `h2` |
| Body | `clamp(.9rem, 1.1vw, 1.05rem)` | 400 | 2 | 본문 |
| Overline | `11px` | 400 | 1.3 | 영문 오버라인 |
| Hint | `10px` | 400 | 1.3 | 스크롤 안내 |

- 서체: `"Nanum Myeongjo", "Apple SD Gothic Neo", "Malgun Gothic", serif`.
- 제목은 3줄을 넘기지 않으며 한국어 어절을 부자연스럽게 고립시키지 않는다.

## 4. Spacing & Layout

- 기본 단위는 4px이다.
- 각 스크롤 장면은 `100dvh`, 좌우 여백은 데스크톱 `8vw`, 모바일 `24px`을 사용한다.
- 카피 최대 폭은 데스크톱 `--copy_measure: 26rem`, 좁은 화면 `30ch`이며 홀수 장면은 왼쪽, 짝수 장면은 오른쪽에 둔다.
- Three.js 캔버스는 뷰포트에 고정하고 문서 섹션이 스크롤 길이를 만든다.
- 기준 뷰포트는 375px, 768px, 1280px이다.

## 5. Components

### Product Scene

- 구조: 고정 `canvas#scene` 안의 `cream-jar`, `botanical-assembly`, 조명, 접지 그림자.
- `img/a.png`–`img/d.png`는 꽃과 용기가 결합된 앞·옆·뒤 형상 참고 자료다. 각 시점에서 확인한 꽃잎 겹침, 이삭 곡률, 흰 꽃 군집을 실제 메시로 재구성한다.
- `img/i.png`는 중앙 홀과 정면 배치를 확인하는 참고 자료로만 사용하며 런타임 텍스처로 로드하지 않는다.
- 상태: 로딩, 준비.
- 접근성: 캔버스는 장식으로 숨기고 동일한 의미를 본문 카피로 제공한다.
- 모션: 용기와 식물 어셈블리는 동일한 제품 루트에서 스크롤에 따라 함께 회전·이동한다.

### Story Section

- 구조: `section > .copy > .eyebrow + heading + p`.
- 상태: 기본, `is_visible`.
- 접근성: 문서 순서와 제목 위계를 유지한다.
- 모션: 교차 관찰 시 `opacity`와 `transform`만 전환한다.

### Loading Screen / Scroll Hint

- 구조: 상태 텍스트와 스크롤 방향선.
- 상태: 기본, `is_hidden`.
- 접근성: 로딩 상태는 상태 메시지로 알리고 완료 후 접근성 트리에서 제외한다.
- 모션: 강조 전환만 사용하며 동작 줄이기 환경에서는 반복 애니메이션을 끈다.

## 6. Motion & Interaction

- 스크롤 값은 목표 상태에 매핑하고 렌더 루프에서 감쇠해 추종한다.
- 전체 제품 어셈블리는 전체 구간에서 1.6회 회전하며 좌우로 이동한다.
- 꽃잎과 잎은 `ExtrudeGeometry`, 줄기와 이삭 축은 `TubeGeometry`/`CylinderGeometry`를 사용해 측면에서도 두께가 유지된다.
- 애니메이션은 `transform`, `opacity`, WebGL 행렬만 사용한다.
- `prefers-reduced-motion: reduce`에서는 부유·반복 효과와 감쇠를 제거하고 스크롤 위치에 즉시 맞춘다.

## 7. Depth & Surface

- 전략: 전체 절차형 3D.
- 용기는 실제 Three.js 지오메트리, PBR 재질, 환경광과 접지 그림자로 깊이를 만든다.
- 식물은 여덟 개의 이름 있는 파트와 225개 메시로 구성한다. 꽃잎·꽃술·포엽·잎·줄기의 앞뒤 배치를 실제 Z축 깊이로 만든다.
- 텍스트 UI에는 별도 카드, 테두리, 그림자를 만들지 않는다.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- WCAG 2.1 AA를 목표로 한다.
- 의미 있는 콘텐츠는 DOM에 남기고 WebGL 장면에만 의존하지 않는다.
- 키보드 탐색을 방해하는 포인터 캡처를 만들지 않는다.
- 동작 줄이기 설정과 모바일 동적 뷰포트를 지원한다.

### Accepted Debt

| 항목 | 위치 | 수용 이유 | 종료 조건 |
|---|---|---|---|
| Three.js CDN 의존 | `index.html` import map | 기존 단일 HTML 구조와 요청 범위를 보존 | 로컬 빌드 파이프라인 도입 시 번들링 |
| 꽃 표면의 미세 결 | `index.html` | 단일 HTML 실시간 렌더 성능을 위해 사진 수준의 잎맥·주름 대신 PBR 색과 입체 실루엣을 우선 | 전용 GLB 에셋 또는 베이크 텍스처 도입 시 |
