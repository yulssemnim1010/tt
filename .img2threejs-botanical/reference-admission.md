# Reference Admission Evidence

img2threejs `probe_image.py`와 `check_reference_admission.py` 실행 결과다.

| 파일 | 해상도 | foregroundCoverage | largestComponentFraction | admitted |
|---|---:|---:|---:|---|
| `img/a.png` | 3200×3200 | 0.2653 | 1.0 | true |
| `img/b.png` | 3200×3200 | 0.1929 | 1.0 | true |
| `img/c.png` | 3200×3200 | 0.2168 | 1.0 | true |
| `img/d.png` | 3200×3200 | 0.2159 | 1.0 | true |
| `img/i.png` | 3200×3200 | 0.1943 | 1.0 | true |

- 모든 참조는 기술 적합성 `pass`, 경고 없음이다.
- `a–d`는 식물과 용기의 다각도 구조 근거, `i`는 정면 식물 실루엣 근거다.
