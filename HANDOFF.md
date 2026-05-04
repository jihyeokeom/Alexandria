# 알렉산드리아 (Alexandria) — 프로젝트 핸드오프

> 기원전 30년 고대 이집트 알렉산드리아를 배경으로 한 오픈월드 3D RPG  
> GitHub: https://github.com/jihyeokeom/Alexandria  
> 배포(GH Pages 예정): https://jihyeokeom.github.io/Alexandria/

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 장르 | 오픈월드 3D RPG |
| 배경 | 기원전 30년, 이집트 알렉산드리아 |
| 플레이 방식 | 1인 / 서버 공유 시 온라인 멀티(미구현) |
| 기술 스택 | 순수 HTML · CSS · JavaScript (Three.js r128 CDN) |
| 빌드 도구 | 없음 — 정적 파일 그대로 배포 |
| 의존성 | Three.js r128 (CDN 단일 스크립트) |

---

## 2. 파일 구조

```
Alexandria/
├── index.html          # 진입점, HTML 구조 + 스크립트 로드 순서
├── css/
│   └── style.css       # 전체 UI/HUD/스크린 스타일
└── js/
    ├── controls.js     # 키보드·마우스 입력, 포인터락 + 드래그 폴백
    ├── camera.js       # 3인칭 궤도 카메라 (야우·피치)
    ├── ui.js           # HUD(HP·ST 바), 로딩·시작 화면 상태 관리
    ├── world.js        # 이집트 세계 전체 생성 (지형·건물·소품·조명)
    ├── player.js       # 캐릭터 메시, 이동·점프·상태·전투·애니메이션
    ├── vfx.js          # 모래바람 파티클, 햇살 광선, 먼지 이펙트
    └── main.js         # 렌더러 초기화, 게임 루프, 부팅 시퀀스
```

> **스크립트 로드 순서가 중요합니다.**  
> `three.min.js → controls → camera → ui → world → player → vfx → main`  
> 전역 객체(`Controls`, `GameCamera`, `World`, `Player`, `VFX`, `UI`)를 순서대로 정의합니다.

---

## 3. 조작 키맵

| 키 | 동작 |
|----|------|
| W / A / S / D | 전후좌우 이동 |
| Shift (홀드) | 달리기 (스태미나 소모) |
| Space | 점프 (서있는 상태에서만) |
| 마우스 드래그 / 포인터락 | 시점 회전 |
| 좌클릭 | 공격 (코펫 검 스윙) |
| 우클릭 (홀드) | 방어 (방패 들기) |
| C | 앉기 / 일어서기 토글 |
| Z | 엎드리기 / 일어서기 토글 |
| ESC | 포인터락 해제 |

---

## 4. 모듈별 상세 설명

### 4-1. `controls.js`
- **`Controls.init()`** — 이벤트 리스너 등록. 이 시점엔 `active = false`라 게임 키는 무시됨.
- **`Controls.enable()`** — 탐험 시작 버튼 클릭 후 호출. 이후부터 키/마우스 입력을 게임에 전달.
- **`Controls.consumeDelta()`** — 프레임마다 `{dx, dy}` 반환 후 누적값 초기화 (카메라용).
- **`Controls.justPressed(code)`** — 한 프레임만 `true`인 엣지 검출 (점프·앉기·엎드리기 토글용).
- 포인터락 실패 시 **마우스 버튼 드래그**로 시점 조작 (폴백 자동 적용).

### 4-2. `camera.js`
- `yaw` (수평) / `pitch` (수직) 두 각도로 플레이어 주변 궤도 회전.
- `camPos.lerp(target, 0.18)` — 부드러운 카메라 추적.
- **`GameCamera.forward()` / `GameCamera.right()`** — 카메라 방향 기반 이동 벡터 제공 (player.js에서 사용).

### 4-3. `player.js`
캐릭터 디자인: 이집트 전사 (짙은 갈색 피부, 흰 킬트, 금 웨세크 칼라, 드레드락).

| 상수 | 값 | 설명 |
|------|----|------|
| `GRAVITY` | −24 | 점프 중력 가속도 |
| `JUMP_FORCE` | 9.5 | 초기 점프 속도 |
| `SPD.WALK` | 4.5 | 기본 이동 속도 |
| `SPD.RUN` | 9.0 | 달리기 속도 |

**상태 머신:** `STAND → CROUCH → PRONE` (C/Z 토글)  
**점프 물리:** `isOnGround` 플래그 + `velY` 속도로 관리. 착지 시 `groundY(x,z)`에 스냅.  
**`groundY(x, z)`** — `world.js`의 지형 공식과 동일하게 유지해야 함 (지형 위를 걷기 위한 핵심).

```javascript
// 지형 높이 공식 — player.js와 world.js에서 반드시 동일하게 유지
function groundY(x, z) {
    return Math.sin(x * 0.05) * 0.45
         + Math.cos(z * 0.07) * 0.32
         + Math.sin((x + z) * 0.03) * 0.14;
}
```

### 4-4. `world.js`
모든 Three.js 메시 생성. 핵심 패턴:

- **`sm(color, roughness, metalness)`** — `flatShading: true`가 기본 포함된 재질 팩토리.
- **`buildPavedPath(ox, oz, length, width)`** — `THREE.InstancedMesh`로 돌바닥 타일 배치 (성능 최적화).
- **`buildStatue(ox, oz, scale)`** — 파라오 석상 배치.
- **`buildMarketStall(ox, oz, awningColor)`** — 포장마차 (기둥·어닝·테이블·상품).

**주요 랜드마크 좌표:**

| 오브젝트 | 위치 (x, z) |
|----------|-------------|
| 파로스 등대 | (120, −84) |
| 세라피스 신전 | (32, −46) |
| 카노포스 대로 | (0, −54) |
| 스핑크스 | (−80, −112) |
| 피라미드 군 | (−192 ~ −50, −255 ~ −272) |
| 나일강 | z ≈ 152 |

### 4-5. `vfx.js`
- **모래바람:** 4,000개 파티클, CPU 루프에서 `WIND_X = 5.8` 방향으로 드리프트. 플레이어 기준 ±140 유닛에서 래핑.
- **햇살 광선:** `THREE.AdditiveBlending` 반투명 원뿔 4겹 + 태양 디스크.
- **먼지:** 800개 저속 파티클, 플레이어 80유닛 반경 내 순환.
- `update(dt, elapsed, playerPos)` — 매 프레임 `main.js`에서 호출.

### 4-6. `main.js`
부팅 순서:
```
window.load
  → UI.init()
  → setupRenderer()          // Three.js WebGLRenderer 생성
  → World.init(scene)        // 세계 오브젝트 동기 생성
  → Player.init(scene)
  → VFX.init(scene)
  → GameCamera.init(camera)
  → Controls.init()          // 리스너 등록만, 아직 비활성
  → loop() 시작              // 시작 화면 뒤에서 렌더링
  → runLoadingSequence()     // 가짜 로딩 바 애니메이션
  → showStartScreen()        // 로딩 완료 후 시작 화면 표시
      → [버튼 클릭]
          → Controls.enable()
          → requestPointerLock()
          → running = true
```

**게임 루프 (`loop`):**
```
Player.update(dt)
GameCamera.update(playerPos, dx, dy)
World.update(dt, elapsed)
VFX.update(dt, elapsed, playerPos)
UI.update(...)
renderer.render(scene, camera)
```

---

## 5. 렌더러 설정 (성능 최적화 근거)

| 설정 | 값 | 이유 |
|------|----|------|
| `setPixelRatio` | `min(devicePixelRatio, 2)` | 고DPI 기기에서 과부하 방지 |
| `shadowMap.type` | `PCFSoftShadowMap` | 부드러운 그림자, PCF보다 약간 무거움 |
| `shadowMap` 범위 | ±160 유닛 | 플레이어 주변만 그림자 처리 |
| `FogExp2` | density `0.0038` | 사막 아지랑이 + 원거리 컬링 효과 |
| `flatShading: true` | 전체 재질 | 버텍스 노멀 계산 감소, 로우폴리 룩 |
| `dt` clamp | `max 0.05s` | 탭 전환 후 물리 폭발 방지 |
| VFX 파티클 | 4,800개 | CPU 루프 ~15k ops/frame, ≈0.1ms 수준 |

---

## 6. 그래픽 스타일 가이드

- **모든 재질:** `flatShading: true` — 면이 분할되어 보이는 로우폴리 룩 유지.
- **색상 팔레트:** 모래(#d4a860), 대리석(#f4edd8), 금(#ffd060), 짙은 이집트 피부(#3d1a08).
- **조명:** 강한 태양 DirectionalLight (intensity 2.0) + 모래 반사 HemisphereLight.
- **새 오브젝트 추가 시:** 반드시 `sm()` 팩토리 사용 (`flatShading` 자동 포함).

---

## 7. 현재 미구현 / 향후 과제

| 우선순위 | 항목 | 비고 |
|----------|------|------|
| 높음 | 충돌 감지 (건물·벽) | 현재 플레이어가 건물 통과 |
| 높음 | NPC / 적 캐릭터 | 전투 시스템 기반 완성 |
| 중간 | 온라인 멀티플레이 | WebSocket / WebRTC 서버 필요 |
| 중간 | 인벤토리 / 아이템 시스템 | — |
| 중간 | 미니맵 | Canvas 2D 오버레이 |
| 낮음 | 사운드 (Web Audio API) | 발걸음, 전투, 환경음 |
| 낮음 | 낮/밤 사이클 | DirectionalLight 각도 애니메이션 |
| 낮음 | 퀘스트 시스템 | — |

---

## 8. 배포 방법 (GitHub Pages)

1. GitHub 저장소 → **Settings → Pages**
2. Source: `Deploy from a branch` / Branch: `main` / Folder: `/ (root)`
3. **Save** → 수 분 후 `https://jihyeokeom.github.io/Alexandria/` 접속 가능

> 빌드 과정 없이 `index.html`을 직접 서빙하므로 별도 설정 불필요.

---

## 9. 로컬 실행

```bash
# Python 내장 서버 (포인터락은 localhost에서만 동작)
python -m http.server 8080
# → http://localhost:8080 접속
```

> `file://` 프로토콜로 직접 열면 일부 브라우저에서 포인터락이 거부됩니다.  
> 반드시 로컬 서버를 통해 열거나 GitHub Pages URL을 사용하세요.

---

## 10. 커밋 히스토리

| 커밋 | 내용 |
|------|------|
| `f6cebc6` | 그래픽 업그레이드, 점프, 모래바람 VFX, 이집트 전사 캐릭터 |
| `2f87cc1` | 초기 버전: 알렉산드리아 3D RPG 게임 |
