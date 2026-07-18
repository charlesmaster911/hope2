# HOPE 2 — The Evidence · Global Fan Hub

나홍진 감독의 영화 **'호프'(HOPE, 2026)** 속편을 바라는 팬들의 비공식·비영리 허브.
정적 사이트(프레임워크 없음) · 5개 국어(KO/EN/ES/FR/JA) · GitHub Pages 무료 배포 · 운영비 0원.

> **믿음은 바라는 것들의 증거. 우리의 관람이 그 증거다.** — `#WeWantHOPE2`

---

## 구조

```
hope2-fanpage/
├── index.html          # 루트 언어 선택 게이트 (x-default)
├── 404.html            # → 언어 선택으로
├── ko/ en/ es/ fr/ ja/ # 언어별 팬 허브 (각 index.html)
├── assets/
│   ├── css/hope.css    # 디자인 시스템 (딥씨 '가라앉은 별' 다크 테마)
│   ├── js/hope.js      # 공유 인터랙션 (콘텐츠 무관, JSON 데이터 구동)
│   └── img/            # (원본 스틸 재호스팅 금지 — 공식 소스 링크/임베드만)
├── robots.txt · sitemap.xml
└── README.md
```

각 언어 페이지의 위젯(타임라인·인물 관계도·떡밥 보드·카운터·UI 문구)은
페이지 하단의 `<script type="application/json" id="hope-data">` 한 곳에서 구동됩니다.
**콘텐츠 갱신은 이 JSON만 고치면 됩니다.**

---

## 배포 (GitHub Pages, 무료)

1. GitHub에 저장소 생성 (예: `charlesmaster911/hope2`).
2. **배포 전 1회 — 도메인 치환.** 모든 `__BASE__` 플레이스홀더를 실제 사이트 주소로 교체:
   ```bash
   # 예) 프로젝트 페이지: https://charlesmaster911.github.io/hope2
   BASE="https://charlesmaster911.github.io/hope2"
   grep -rl '__BASE__' . | xargs sed -i '' "s#__BASE__#${BASE}#g"   # macOS
   # Linux면 sed -i "s#...#...#g"
   ```
   (`__BASE__`는 hreflang·canonical·sitemap·robots에만 쓰입니다. 사람이 클릭하는 링크는 상대경로라 치환 없이도 정상 작동합니다.)
3. `main` 브랜치 루트를 Pages 소스로 지정 → 배포.
4. 배포 후 [hreflang validator](https://technicalseo.com/tools/hreflang/)로 5개 언어 클러스터 1회 검증 (오류 1개 = 클러스터 전체 무효).

> **커스텀 도메인**을 쓸 경우 `CNAME` 파일 추가 + `BASE`를 그 도메인으로.

---

## "TO 7 MILLION" 관객 트래커 갱신

손익분기점 700만을 향한 실관객 카운터입니다. KOBIS 누적 관객수로 **수동 갱신**:
각 언어 `index.html`의 `hope-data` → `"counter": { "boxOffice": 1000000, ... }` 숫자만 교체.
(모든 언어 동일 값으로 맞추세요. 날짜 문구는 `.counter-note`에서 수정.)

---

## 서명 카운터 — 실시간 공용 집계 (기본 ON)

**기본값:** 무가입·무키 공용 카운터 **CounterAPI**(`api.counterapi.dev/v1/wewanthope2/signatures`)로 전 세계 서명이 실시간 합산됩니다. 서비스가 불통이면 자동으로 브라우저(localStorage) 폴백 — 버튼은 절대 깨지지 않음. `hope.js`의 `COUNTER_URL` 또는 `window.HOPE_COUNTER_URL`로 네임스페이스 변경 가능. 중복 서명은 localStorage 플래그로 1인 1회 억제(베스트에포트).

> **장기 내구성 업그레이드(선택):** CounterAPI는 무료 호비 서비스라 장기 존속 보장이 없습니다. 더 견고하게 가려면 무료 **Firebase Spark**(무활동 정지 없음)를 붙여 `window.HOPE_SIGN`으로 오버라이드하세요:

1. Firebase 프로젝트 생성 → Firestore(Native) 활성화.
2. 보안 규칙: 문서 하나(`meta/petition`)에 **increment만 허용**하도록 제한.
3. 사이트에 `assets/js/config.js` 추가하고 아래 형태로 `window.HOPE_SIGN` 정의:
   ```js
   // config.js (예시 골격 — 실제 SDK 로드/초기화는 Firebase 문서 참고)
   window.HOPE_SIGN = async function () {
     // Firestore: meta/petition.count 를 +1 (increment)
   };
   // 표시용 실시간 합계를 쓰려면 hope.js의 petitionCount()가 읽을 값을 주입하도록 확장.
   ```
4. 각 `index.html`의 `<script src="../assets/js/hope.js">` **앞에** `config.js`를 로드.

> `hope.js`는 `window.HOPE_SIGN`이 있으면 서명 시 호출하고, 없으면 조용히 localStorage로 폴백합니다(graceful degradation).

---

## Discord / 참여 채널

- 참여 섹션의 `[data-discord]` 링크 `href="#"`를 실제 Discord 초대 링크로 교체.
- 사이트 내 위젯을 원하면 서버 설정 → 위젯 활성화 후 `<iframe src="https://discord.com/widget?id=서버ID&theme=dark">` 삽입.

---

## 콘텐츠 갱신 치트시트

| 바꿀 것 | 위치 |
|---|---|
| 관객수 | `hope-data` → `counter.boxOffice` (전 언어) |
| 타임라인 항목 | `hope-data` → `timeline[]` |
| 인물/관계 | `hope-data` → `characters[]` (`links`로 관계선) |
| 이번 주 떡밥 | `hope-data` → `theories[]` (`status`: `ok`/`pending`/`refuted`) |
| 예고편 | 각 페이지 `.video .frame[data-yt="YOUTUBE_ID"]` |
| 연락 이메일 | 푸터 disclaimer의 `fan@wewanthope2` |

---

## 저작권 · 운영 원칙 (반드시 준수)

- **원본 이미지/영상 재호스팅 금지.** 공식 소스(플러스엠 유튜브·SNS·보도자료) 링크/임베드만.
- 예고편은 **공식 채널 embed만** (youtube-nocookie). 본편 영상 사용 금지.
- 팬 시나리오·팬아트는 **비영리 유지** (유료화·광고·후원 금지), "비공식 팬 창작물" 표기.
- 푸터 disclaimer 4요소(비제휴·저작권 귀속·비영리·연락처)를 전 언어 유지.
- 권리자 요청 수신 시 **24~48시간 내 삭제·회신**.

---

*비공식 비영리 팬 프로젝트 · 영화 '호프' 제작진·배급사와 무관 · #WeWantHOPE2*
