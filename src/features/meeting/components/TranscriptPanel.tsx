import { useEffect, useRef, useState, type FormEvent } from 'react';
import { twMerge } from 'tailwind-merge';
import type { Segment } from '../types';

type TranscriptPanelProps = {
  segments: Segment[];
  interim: string;
  targetSegmentIds: Set<number>;
  generatingSegmentIds: number[];
  onSuggest: (segmentId: number) => void;
  onType: (text: string) => void;
};

const timeFormat = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export default function TranscriptPanel({
  segments,
  interim,
  targetSegmentIds,
  generatingSegmentIds,
  onSuggest,
  onType,
}: TranscriptPanelProps) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  // 새 발화가 들어오면 바닥에 붙여 둔다. 위로 스크롤해 읽는 중이면 건드리지 않는다.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 120;
    if (nearBottom) list.scrollTop = list.scrollHeight;
  }, [segments.length, interim]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onType(text);
    setDraft('');
  };

  return (
    <section className="flex h-full min-h-0 flex-col rounded-4 border border-gray-100 bg-white">
      <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h2 className="heading-06 text-gray-900">실시간 전사</h2>
        <span className="label-01 text-gray-400">{segments.length}개 발화</span>
      </header>

      <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
        {segments.length === 0 && !interim && (
          <p className="px-2 py-10 text-center body-03 text-gray-400">
            녹음을 시작하거나 아래에 발화를 직접 입력해 보세요.
          </p>
        )}
        {segments.map(segment => {
          const isTarget = targetSegmentIds.has(segment.id);
          const isGenerating = generatingSegmentIds.includes(segment.id);
          return (
            <div
              key={segment.id}
              className={twMerge(
                'group flex items-start gap-3 rounded-3 px-3 py-2.5 transition-colors hover:bg-gray-20',
                isTarget && 'bg-primary-50 hover:bg-primary-50'
              )}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="label-01 text-gray-400">
                  {segment.speaker || '알 수 없음'} ·{' '}
                  {timeFormat.format(new Date(segment.created_at))}
                </span>
                <p className="body-03 break-keep text-gray-800">{segment.content}</p>
              </div>
              <button
                type="button"
                onClick={() => onSuggest(segment.id)}
                disabled={isGenerating}
                className={twMerge(
                  'mt-1 shrink-0 rounded-2 bg-gray-50 px-2.5 py-1 label-01 text-gray-600 opacity-0 transition-opacity hover:bg-gray-100 group-hover:opacity-100 disabled:cursor-not-allowed',
                  isGenerating && 'opacity-100'
                )}
              >
                {isGenerating ? '추천 중…' : '의견 추천'}
              </button>
            </div>
          );
        })}
        {interim && <p className="px-3 py-2.5 body-03 text-gray-400">{interim}</p>}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-gray-100 p-3">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="마이크 없이 테스트: 발화를 입력하고 Enter"
          className="h-[45px] min-w-0 flex-1 rounded-2 border border-gray-100 bg-white px-4 body-03 text-gray-900 outline-none placeholder:text-gray-300 hover:bg-gray-50 focus:border-primary-300"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="h-[45px] shrink-0 rounded-2 bg-gray-100 px-4 title-03 text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          추가
        </button>
      </form>
    </section>
  );
}
