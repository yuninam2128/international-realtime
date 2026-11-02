import Chip from '../../../shared/components/Chip';
import { RefreshIcon } from '../../../shared/components/icons';
import type { LiveContext } from '../types';

type LiveContextCardProps = {
  context: LiveContext | null;
  onRefresh: () => void;
};

export default function LiveContextCard({ context, onRefresh }: LiveContextCardProps) {
  const updating = Boolean(context?.locked_until);
  const decision = context?.suggest_decision;

  return (
    <section className="flex flex-col gap-4 rounded-4 border border-gray-100 bg-white p-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="heading-06 text-gray-900">회의 맥락</h2>
          {updating && (
            <span className="flex items-center gap-1.5 label-01 text-gray-500">
              <span className="size-1.5 animate-pulse rounded-full bg-primary-500" />
              갱신 중
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          aria-label="맥락 지금 갱신"
          className="flex items-center gap-1 rounded-2 bg-gray-50 px-2.5 py-1 label-01 text-gray-600 hover:bg-gray-100"
        >
          <RefreshIcon />
          지금 갱신
        </button>
      </header>

      {!context || context.last_sequence_index < 0 ? (
        <p className="body-03 text-gray-400">발화가 2개 쌓이거나 10초가 지나면 맥락이 잡혀요.</p>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <span className="label-01 text-gray-500">현재 주제</span>
            <p className="title-02 text-gray-900">{context.current_topic ?? '주제 파악 중'}</p>
          </div>

          {context.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {context.keywords.map(keyword => (
                <Chip
                  key={keyword}
                  label={keyword}
                  className="animate-[fade-up_0.25s_ease-out] bg-gray-50 py-1"
                />
              ))}
            </div>
          )}

          <p className="body-03 text-gray-700">{context.rolling_summary}</p>

          {context.open_questions.length > 0 && (
            <div className="flex flex-col gap-1.5 rounded-3 bg-gray-20 p-3">
              <span className="label-01 text-gray-500">미해결 질문</span>
              <ul className="flex flex-col gap-1">
                {context.open_questions.map(question => (
                  <li key={question} className="body-04 text-gray-700">
                    · {question}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {decision && (
            <p className="label-01 text-gray-400">
              최근 판단:{' '}
              {decision.shouldSuggest
                ? `의견 지점 (중요도 ${decision.importance})`
                : '의견 지점 아님'}
              {decision.reason && ` · ${decision.reason}`}
            </p>
          )}
        </>
      )}
    </section>
  );
}
