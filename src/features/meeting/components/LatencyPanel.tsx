import type { LatencyEntry, LatencyStage } from '../types';

type LatencyPanelProps = {
  latencies: LatencyEntry[];
};

const STAGE_LABEL: Record<LatencyStage, string> = {
  stt: '발화 저장',
  context: '맥락 갱신',
  suggest: '의견 추천',
};

const STAGES: LatencyStage[] = ['stt', 'context', 'suggest'];

const seconds = (ms: number) => `${(ms / 1000).toFixed(ms < 1000 ? 2 : 1)}s`;

export default function LatencyPanel({ latencies }: LatencyPanelProps) {
  const averages = STAGES.map(stage => {
    const entries = latencies.filter(entry => entry.stage === stage);
    const avg = entries.length
      ? entries.reduce((sum, entry) => sum + entry.totalMs, 0) / entries.length
      : null;
    return { stage, avg, count: entries.length };
  });

  return (
    <section className="flex flex-col gap-4 rounded-4 border border-gray-100 bg-white p-5">
      <header className="flex flex-col gap-1">
        <h2 className="heading-06 text-gray-900">지연 측정</h2>
        <p className="label-01 text-gray-400">
          맥락·자동 추천은 발화가 DB에 저장된 시각부터 결과가 저장된 시각까지예요. 괄호는 그중 AI
          호출 시간.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-2">
        {averages.map(({ stage, avg, count }) => (
          <div key={stage} className="flex flex-col gap-0.5 rounded-3 bg-gray-50 px-3 py-2.5">
            <span className="label-01 text-gray-500">{STAGE_LABEL[stage]}</span>
            <span className="title-05 text-gray-900">{avg === null ? '–' : seconds(avg)}</span>
            <span className="label-02 text-gray-400">평균 · {count}회</span>
          </div>
        ))}
      </div>

      {latencies.length > 0 && (
        <ul className="flex max-h-48 flex-col overflow-y-auto scrollbar-hide">
          {latencies.map(entry => (
            <li
              key={entry.id}
              className="flex items-center gap-2 border-b border-gray-50 py-1.5 last:border-b-0"
            >
              <span className="w-16 shrink-0 label-01 text-gray-500">
                {STAGE_LABEL[entry.stage]}
              </span>
              <span className="w-24 shrink-0 body-05 text-gray-800">
                {seconds(entry.totalMs)}
                {entry.aiMs !== null && (
                  <span className="text-gray-400"> ({seconds(entry.aiMs)})</span>
                )}
              </span>
              <span className="min-w-0 truncate label-01 text-gray-400">{entry.note}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
