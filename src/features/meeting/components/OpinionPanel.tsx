import { useState } from 'react';
import { SparkIcon } from '../../../shared/components/icons';
import type { OpinionSuggestion, Segment } from '../types';

type OpinionPanelProps = {
  suggestions: OpinionSuggestion[];
  segmentsById: Map<number, Segment>;
  generating: boolean;
};

const STANCES = [
  { key: 'agree', label: '동의' },
  { key: 'disagree', label: '반대' },
  { key: 'alternative', label: '다른 의견' },
] as const;

export default function OpinionPanel({ suggestions, segmentsById, generating }: OpinionPanelProps) {
  const [latest, ...older] = suggestions;

  return (
    <section className="flex flex-col gap-4 rounded-4 border border-gray-100 bg-white p-5">
      <header className="flex items-center justify-between">
        <h2 className="heading-06 text-gray-900">지금 할 말</h2>
        {generating && (
          <span className="flex items-center gap-1.5 label-01 text-gray-500">
            <span className="size-1.5 animate-pulse rounded-full bg-primary-500" />
            추천 만드는 중
          </span>
        )}
      </header>

      {!latest ? (
        <p className="body-03 text-gray-400">
          의견을 낼 만한 발화가 나오면 자동으로 떠요. 전사에서 발화를 골라 직접 요청할 수도 있어요.
        </p>
      ) : (
        <SuggestionCard
          key={latest.id}
          suggestion={latest}
          segment={segmentsById.get(latest.segment_id)}
        />
      )}

      {older.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none label-01 text-gray-500 hover:text-gray-700">
            이전 추천 {older.length}개
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            {older.slice(0, 10).map(suggestion => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                segment={segmentsById.get(suggestion.segment_id)}
                compact
              />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

type SuggestionCardProps = {
  suggestion: OpinionSuggestion;
  segment?: Segment;
  compact?: boolean;
};

function SuggestionCard({ suggestion, segment, compact = false }: SuggestionCardProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(current => (current === key ? null : current)), 1200);
  };

  return (
    <div className="flex animate-[fade-up_0.25s_ease-out] flex-col gap-2">
      <div className="flex items-start gap-1.5 body-04 text-gray-500">
        <SparkIcon className="mt-0.5 size-icon-xs shrink-0 text-primary-500" />
        <span className="line-clamp-2">
          {suggestion.source === 'auto' ? '자동' : '직접'} · “{segment?.content ?? '이전 발화'}”
        </span>
      </div>
      {STANCES.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => void copy(key, suggestion[key])}
          className="flex flex-col items-start gap-1 rounded-3 bg-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-100"
        >
          <span className="label-01 text-gray-500">{copied === key ? '복사했어요' : label}</span>
          <span className={compact ? 'body-04 text-gray-700' : 'body-02 break-keep text-gray-800'}>
            {suggestion[key]}
          </span>
          {suggestion.gloss && (
            <span className="body-04 break-keep text-primary-700">{suggestion.gloss[key]}</span>
          )}
        </button>
      ))}
    </div>
  );
}
