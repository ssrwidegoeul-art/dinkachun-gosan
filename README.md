# 🍱 돈카춘 광주고산점 관리 앱

매출 기록 · 근무표 · 직원 관리 · 사진 보관을 하나로 관리하는 웹앱입니다.
모바일과 랩탑에서 같은 데이터를 공유합니다.

---

## 배포 순서 (약 20분, 전부 무료)

### 1단계. Supabase 설정 (데이터베이스 + 사진 저장소)

1. https://supabase.com 접속 → 회원가입 (GitHub 계정 추천)
2. **New Project** 클릭
   - Name: `donkachun`
   - Database Password: 아무거나 강력하게 (메모해두세요)
   - Region: `Northeast Asia (Seoul)`
3. 프로젝트 생성 완료 후 좌측 메뉴 **SQL Editor** 클릭
4. 이 폴더의 `schema.sql` 파일 내용을 전부 복사 → 붙여넣기 → **Run**
5. 좌측 메뉴 **Project Settings → API** 에서 두 값을 복사:
   - `Project URL` (https://xxxxx.supabase.co)
   - `anon public` 키 (eyJ로 시작하는 긴 문자열)

### 2단계. GitHub에 코드 올리기

1. https://github.com 회원가입 → **New repository** → 이름 `donkachun-app` → Private 추천
2. 이 폴더 전체를 업로드 (웹에서 "uploading an existing file" 링크로 드래그&드롭 가능)

### 3단계. Vercel 배포 (호스팅)

1. https://vercel.com 접속 → GitHub 계정으로 로그인
2. **Add New → Project** → `donkachun-app` 저장소 선택 → Import
3. **Environment Variables** 에 아래 2개 추가 (1단계에서 복사한 값):
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = anon public 키
4. **Deploy** 클릭 → 1~2분 뒤 완료
5. `https://donkachun-app.vercel.app` 같은 주소가 생깁니다

### 4단계. 모바일 홈 화면에 추가

- **아이폰**: Safari로 접속 → 공유 버튼 → "홈 화면에 추가"
- **안드로이드**: Chrome으로 접속 → 메뉴(⋮) → "홈 화면에 추가"
- **랩탑**: 북마크 등록

이제 앱 아이콘처럼 사용 가능하고, 어느 기기에서 입력해도 실시간 공유됩니다.

---

## ⚠️ 보안 안내

이 앱은 로그인 없이 링크만 알면 접속 가능한 구조입니다 (1인 운영 기준 단순화).
- **주소를 외부에 공유하지 마세요**
- GitHub 저장소는 반드시 **Private**으로
- 나중에 직원용 계정이 필요해지면 Supabase Auth 로그인을 추가할 수 있습니다

## 로컬에서 테스트하려면

```bash
npm install
cp .env.example .env   # .env 파일에 Supabase 키 입력
npm run dev
```

## 데이터 백업

앱 홈 화면 하단 "전체 데이터 백업" 버튼으로 JSON 파일을 수시로 내려받아 두세요.
