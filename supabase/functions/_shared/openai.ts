// OpenAI Responses API + strict JSON Schema 호출.

type Options = { model: string; reasoningEffort: string; maxOutputTokens: number };

type ResponsesPayload = {
  output?: { content?: { type?: string; text?: string }[] }[];
  error?: { message?: string };
};

export async function createStructured<T>(
  input: string,
  schemaName: string,
  schema: Record<string, unknown>,
  options: Options
): Promise<{ data: T; ms: number }> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY 가 설정되지 않았습니다.');

  const startedAt = performance.now();
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: options.model,
      input,
      max_output_tokens: options.maxOutputTokens,
      reasoning: { effort: options.reasoningEffort },
      text: { format: { type: 'json_schema', name: schemaName, strict: true, schema } },
    }),
  });
  const payload = (await res.json()) as ResponsesPayload;
  const ms = Math.round(performance.now() - startedAt);
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${payload.error?.message ?? 'unknown'}`);

  // REST 응답에는 SDK 의 output_text 편의 필드가 없어 output[].content[] 를 직접 모은다.
  const text = (payload.output ?? [])
    .flatMap(item => item.content ?? [])
    .filter(content => content.type === 'output_text' && content.text)
    .map(content => content.text)
    .join('');
  if (!text) throw new Error('OpenAI 응답에 텍스트가 없습니다.');
  return { data: JSON.parse(text) as T, ms };
}

export const env = (key: string, fallback: string) => Deno.env.get(key) ?? fallback;
