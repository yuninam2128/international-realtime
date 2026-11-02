// AI_PROVIDER 시크릿(openai | gemini)으로 구조화 출력 호출을 고른다. 모델은 작업별 시크릿으로 바꿀 수 있다.
import { createStructuredGemini } from './gemini.ts';
import { createStructured as createStructuredOpenAi, env } from './openai.ts';

type Task = 'LIVE_CONTEXT' | 'OPINION';

const DEFAULTS: Record<Task, { openai: string; gemini: string }> = {
  LIVE_CONTEXT: { openai: 'gpt-5.6-luna', gemini: 'gemini-3.5-flash-lite' },
  OPINION: { openai: 'gpt-5.6-terra', gemini: 'gemini-3.5-flash' },
};

export function createStructured<T>(
  input: string,
  schemaName: string,
  schema: Record<string, unknown>,
  task: Task,
  maxOutputTokens: number
): Promise<{ data: T; ms: number }> {
  if (env('AI_PROVIDER', 'openai') === 'gemini') {
    return createStructuredGemini<T>(input, schema, {
      model: env(`GEMINI_${task}_MODEL`, DEFAULTS[task].gemini),
      thinking: env(`GEMINI_${task}_THINKING`, 'low'),
      maxOutputTokens,
    });
  }
  return createStructuredOpenAi<T>(input, schemaName, schema, {
    model: env(`OPENAI_${task}_MODEL`, DEFAULTS[task].openai),
    reasoningEffort: env(`OPENAI_${task}_EFFORT`, 'low'),
    maxOutputTokens,
  });
}

export { env };
