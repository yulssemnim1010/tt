# Local Spec Search Evidence

## Query 1

`botanical flower petals leaves stem curve tube instanced cluster`

- `core.topology-intent`: 유기 변형 메시와 인스턴스 클러스터를 topology intent로 구분한다.
- `core.shader-mapping-tubegeometry-straps-cables-belts`: 3D 곡선을 따르는 선형 부품은 `TubeGeometry`로 구성한다.

## Query 2

`branch attachment embedded tube curve parent socket flower`

- `core.attachment-contract`: 자식 파트는 parent socket, local start/end, contact type, embed depth 또는 overlap을 기록한다.
- `core.socket-pivot`: socket은 관련 pivot의 자식 `Object3D`로 둔다.
- `core.shader-mapping-tubegeometry-straps-cables-belts`: 굽은 줄기와 가지는 curve-following tube로 구성한다.

## 적용 결정

- 주 줄기·측면 줄기: `CatmullRomCurve3 + TubeGeometry`.
- 꽃잎·잎: 실제 두께와 곡률을 가진 organic deformed mesh/shape extrude.
- 반복 포엽·흰 꽃송이: 결정적 배열의 instanced/repeated cluster.
- 모든 자식의 뿌리를 부모 줄기 또는 꽃 중심에 겹쳐 공중 부유를 막는다.
