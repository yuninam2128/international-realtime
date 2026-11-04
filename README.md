# Nuncheet (눈치트)

외국인 유학생을 위한 실시간 회의 도구입니다. 빠르게 흘러가는 한국어 회의를 실시간으로 전사하고
지금 무슨 이야기를 하는지(요약·주제·키워드)를 보여주며, 의견을 낼 만한 순간이 오면
그 자리에서 바로 말할 수 있는 **동의 / 반대 / 다른 의견** 세 문장을 추천해 눈치를 대신 봐 줍니다.

**프론트 + Supabase** 만으로 동작합니다.

```
녹음 기기 마이크 ─ webm ─▶ Soniox(화자 분리) ─ <end>·화자 전환 ─▶ rpc append_segment ─▶ transcript_segments
        (임시 키는 Edge Function soniox-token 이 발급)
        (2개 또는 10초 배치) ─▶ Edge Function live-context
            claim_live_context(lease) → OpenAI/Gemini(요약·주제·키워드·suggestDecision) → live_context 갱신
        Realtime(live_context UPDATE) ─▶ 모든 참여자 화면
            importance ≥ 60 이면 각 참여자가 Edge Function suggest-opinions 호출 → 동의/반대/다른 의견
```

## 실행

1. Supabase 프로젝트를 만들고 **Authentication > Sign In / Providers > Anonymous sign-ins** 를 켭니다.
2. DB와 함수를 배포합니다.
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   npx supabase secrets set OPENAI_API_KEY=sk-... SONIOX_API_KEY=snx_...
   npx supabase functions deploy live-context suggest-opinions soniox-token translate --use-api
   ```
   모델은 `OPENAI_LIVE_CONTEXT_MODEL`(기본 `gpt-5.6-luna`), `OPENAI_OPINION_MODEL`(기본 `gpt-5.6-terra`),
   reasoning effort 는 `OPENAI_LIVE_CONTEXT_EFFORT` / `OPENAI_OPINION_EFFORT`(기본 `low`) 시크릿으로 바꿀 수 있습니다.

   **Gemini 로 돌리려면** OpenAI 키 대신 아래처럼 설정합니다.
   ```bash
   npx supabase secrets set AI_PROVIDER=gemini GEMINI_API_KEY=AIza...
   ```
   모델은 `GEMINI_LIVE_CONTEXT_MODEL` / `GEMINI_OPINION_MODEL`, `GEMINI_TRANSLATE_MODEL`(기본 모두 `gemini-3.1-flash-lite`),
   생각 설정은 `GEMINI_<작업>_THINKING` 입니다. 과부하면 `GEMINI_FALLBACK_MODEL`(기본 `gemini-3.5-flash-lite`)로 넘어갑니다.
   기본 `minimal` 은 thinkingLevel 로, 숫자를 넣으면 thinkingBudget 으로 보냅니다.
3. 프론트를 켭니다.
   ```bash
   cp .env.example .env.local   # URL 과 publishable(anon) key 입력
   npm install
   npm run dev                  # http://localhost:5174
   ```
4. 같은 방 코드로 참여자마다 접속합니다(이름·역할은 다르게). 대면 회의이므로 **녹음은 한 기기에서만** 켭니다.
   여러 기기가 녹음하면 같은 말이 기기 수만큼 전사됩니다. 나머지 참여자는 화면만 보고 추천을 받습니다.

## 볼 것

- **지연 측정** 패널: 발화 저장 / 맥락 갱신 / 자동 추천 각각의 시간과 그중 AI 호출 시간.
  맥락·자동 추천은 서버 시각끼리 비교해서 기기 간 시계 차이가 끼지 않습니다.
- 다른 탭에서도 전사·키워드가 같이 바뀌는지, 자동 추천이 탭마다 역할에 맞게 다르게 나오는지.
- 발화에 마우스를 올리면 나오는 "의견 추천"으로 아무 발화에나 직접 요청할 수 있습니다.

## 실험용이라 단순화한 것

- 화자는 Soniox 화자 분리 번호("화자 1", "화자 2")로만 표시합니다. 번호를 참여자 이름과 연결하지 않습니다.
- 한 방에서 녹음 기기가 하나인지 강제하지 않습니다.
- 방 코드만 알면 누구나 읽을 수 있는 RLS 입니다. 추천은 본인 것만 보입니다.
- RAG(참고자료 검색)는 뺐습니다.
