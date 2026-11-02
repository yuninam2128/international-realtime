// Gemini generateContent + responseJsonSchema 로 openai.ts 와 같은 구조화 출력을 받는다.

type Options = { model: string; thinking: string; maxOutputTokens: number };

type GeminiPayload = {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  error?: { message?: string };
};

export async function createStructuredGemini<T>(
  input: string,
  schema: Record<string, unknown>,
  options: Options
): Promise<{ data: T; ms: number }> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY 가 설정되지 않았습니다.');

  // 숫자면 thinkingBudget(2.5 계열, 0 이면 생각 끔), low/high 같은 단어면 thinkingLevel(3 계열).
  const thinkingConfig = /^-?\d+$/.test(options.thinking)
    ? { thinkingBudget: Number(options.thinking) }
    : { thinkingLevel: options.thinking };

  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: input }] }],
    generationConfig: {
      maxOutputTokens: options.maxOutputTokens,
      responseMimeType: 'application/json',
      responseJsonSchema: schema,
      thinkingConfig,
    },
  });

  // 과부하(429/503)는 흔하고 금방 풀려서 한 번 재시도하고, 그래도 안 되면 대체 모델로 넘긴다.
  // ms 는 재시도까지 포함한 실제 대기 시간이다.
  const fallback = Deno.env.get('GEMINI_FALLBACK_MODEL') ?? 'gemini-3.5-flash-lite';
  const models = [options.model, options.model, fallback];
  const startedAt = performance.now();
  let res!: Response;
  let payload!: GeminiPayload;
  for (const [attempt, model] of models.entries()) {
    if (attempt > 0) await new Promise(resolve => setTimeout(resolve, 400 * attempt));
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
        body,
      }
    );
    payload = (await res.json()) as GeminiPayload;
    if (res.status !== 429 && res.status !== 503) break;
  }
  const ms = Math.round(performance.now() - startedAt);
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${payload.error?.message ?? 'unknown'}`);

  const candidate = payload.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .filter(part => !part.thought && part.text)
    .map(part => part.text)
    .join('');
  if (!text) throw new Error(`Gemini 응답에 텍스트가 없습니다. (${candidate?.finishReason ?? 'no candidate'})`);
  return { data: JSON.parse(text) as T, ms };
}
