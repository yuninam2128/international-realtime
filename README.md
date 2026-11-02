# Nuncheet (눈치트)

외국인 유학생을 위한 실시간 회의 도구입니다. 빠르게 흘러가는 한국어 회의를 실시간으로 전사하고
지금 무슨 이야기를 하는지(요약·주제·키워드)를 보여주며, 의견을 낼 만한 순간이 오면
그 자리에서 바로 말할 수 있는 **동의 / 반대 / 다른 의견** 세 문장을 추천해 눈치를 대신 봐 줍니다.

**프론트 + Supabase** 만으로 동작합니다.

```
브라우저 STT(Web Speech) ─ final ─▶ rpc append_segment ─▶ transcript_segments
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
   npx supabase secrets set OPENAI_API_KEY=sk-...
   npx supabase functions deploy live-context suggest-opinions
   ```
   모델은 `OPENAI_LIVE_CONTEXT_MODEL`(기본 `gpt-5.6-luna`), `OPENAI_OPINION_MODEL`(기본 `gpt-5.6-terra`),
   reasoning effort 는 `OPENAI_LIVE_CONTEXT_EFFORT` / `OPENAI_OPINION_EFFORT`(기본 `low`) 시크릿으로 바꿀 수 있습니다.

   **Gemini 로 돌리려면** OpenAI 키 대신 아래처럼 설정합니다.
   ```bash
   npx supabase secrets set AI_PROVIDER=gemini GEMINI_API_KEY=AIza...
   ```
   모델은 `GEMINI_LIVE_CONTEXT_MODEL` / `GEMINI_OPINION_MODEL`(기본 `gemini-3.5-flash-lite` / `gemini-3.5-flash`),
   생각 설정은 `GEMINI_LIVE_CONTEXT_THINKING` / `GEMINI_OPINION_THINKING` 입니다.
   기본 `low` 는 thinkingLevel 로, 숫자를 넣으면 thinkingBudget 으로 보냅니다.
3. 프론트를 켭니다.
   ```bash
   cp .env.example .env.local   # URL 과 publishable(anon) key 입력
   npm install
   npm run dev                  # http://localhost:5174
   ```
4. **Chrome** 에서 같은 방 코드로 탭을 두 개 열고(이름·역할은 다르게), 한쪽에서 녹음하거나 발화를 입력합니다.

## 볼 것

- **지연 측정** 패널: 발화 저장 / 맥락 갱신 / 자동 추천 각각의 시간과 그중 AI 호출 시간.
  맥락·자동 추천은 서버 시각끼리 비교해서 기기 간 시계 차이가 끼지 않습니다.
- 다른 탭에서도 전사·키워드가 같이 바뀌는지, 자동 추천이 탭마다 역할에 맞게 다르게 나오는지.
- 발화에 마우스를 올리면 나오는 "의견 추천"으로 아무 발화에나 직접 요청할 수 있습니다.

## 실험용이라 단순화한 것

- STT 는 Soniox 대신 브라우저 Web Speech API(Chrome)이고 화자 분리가 없습니다. 화자는 입력한 사람 이름입니다.
- 방 코드만 알면 누구나 읽을 수 있는 RLS 입니다. 추천은 본인 것만 보입니다.
- RAG(참고자료 검색)는 뺐습니다.
