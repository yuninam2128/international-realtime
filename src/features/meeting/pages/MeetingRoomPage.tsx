import { useMemo } from 'react';
import { MicIcon, StopIcon } from '../../../shared/components/icons';
import LanguageSelect from '../../../shared/components/LanguageSelect';
import LatencyPanel from '../components/LatencyPanel';
import LiveContextCard from '../components/LiveContextCard';
import OpinionPanel from '../components/OpinionPanel';
import TranscriptPanel from '../components/TranscriptPanel';
import useMeetingRoom from '../hooks/useMeetingRoom';
import useSonioxTranscription from '../hooks/useSonioxTranscription';
import useTranslations from '../hooks/useTranslations';
import type { Profile } from '../types';

type MeetingRoomPageProps = {
  profile: Profile;
  onLeave: () => void;
  onChangeLanguage: (language: string) => void;
};

export default function MeetingRoomPage({
  profile,
  onLeave,
  onChangeLanguage,
}: MeetingRoomPageProps) {
  const room = useMeetingRoom(profile);
  const speech = useSonioxTranscription({
    onFinal: (text, finalizedAt, speaker, language) =>
      void room.addUtterance(text, finalizedAt, speaker, language),
  });
  const { segmentTranslations, contextTranslation } = useTranslations(
    profile.language,
    room.segments,
    room.context
  );

  const segmentsById = useMemo(
    () => new Map(room.segments.map(segment => [segment.id, segment])),
    [room.segments]
  );
  const targetSegmentIds = useMemo(
    () => new Set(room.suggestions.map(suggestion => suggestion.segment_id)),
    [room.suggestions]
  );

  return (
    <div className="flex h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-[1280px] items-center gap-4 px-[clamp(20px,4vw,32px)] py-3">
          <h1 className="heading-06 text-gray-900">Nuncheet</h1>
          <span className="rounded-2 bg-gray-50 px-2.5 py-1 body-04 text-gray-600">
            {profile.meetingId}
          </span>
          <span className="hidden body-04 text-gray-500 sm:inline">
            {profile.name}
            {profile.role && ` · ${profile.role}`}
          </span>
          <span className="flex items-center gap-1.5 label-01 text-gray-500">
            <span
              className={`size-1.5 rounded-full ${room.connected ? 'bg-primary-500' : 'bg-gray-300'}`}
            />
            {room.connected ? '실시간 연결됨' : '연결 중'}
          </span>

          <div className="ml-auto flex items-center gap-2.5">
            <LanguageSelect
              aria-label="내 언어"
              value={profile.language}
              onChange={onChangeLanguage}
              className="h-10"
            />
            <button
              type="button"
              onClick={onLeave}
              className="h-10 rounded-2 bg-gray-100 px-4 title-03 text-gray-600 transition-colors hover:bg-gray-200"
            >
              나가기
            </button>
            {speech.listening ? (
              <button
                type="button"
                onClick={speech.stop}
                className="flex h-10 items-center gap-1.5 rounded-2 bg-gray-100 px-4 title-03 text-gray-700 transition-colors hover:bg-gray-200"
              >
                <span className="size-2 animate-pulse rounded-full bg-primary-500" />
                <StopIcon className="size-icon-xs" />
                녹음 중지
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void speech.start()}
                disabled={!speech.supported}
                title={
                  speech.supported
                    ? '이 기기로 회의실 전체 소리를 녹음합니다. 한 방에서는 한 기기만 켜 주세요.'
                    : '이 브라우저는 녹음을 지원하지 않습니다'
                }
                className="flex h-10 items-center gap-1.5 rounded-2 bg-primary-500 px-4 title-03 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MicIcon className="size-icon-xs" />
                녹음 시작
              </button>
            )}
          </div>
        </div>
      </header>

      {(room.error || speech.error) && (
        <div className="mx-auto mt-3 flex w-full max-w-[1280px] px-[clamp(20px,4vw,32px)]">
          <div className="flex w-full items-center gap-3 rounded-full border border-red-100 bg-red-50 px-4 py-2">
            <span className="min-w-0 flex-1 truncate body-04 text-red-600">
              {room.error ?? `음성 인식 오류: ${speech.error}`}
            </span>
            {room.error && (
              <button
                type="button"
                onClick={room.clearError}
                className="shrink-0 label-01 text-red-600 underline"
              >
                닫기
              </button>
            )}
          </div>
        </div>
      )}

      <main className="mx-auto grid min-h-0 w-full max-w-[1280px] flex-1 grid-cols-1 gap-4 px-[clamp(20px,4vw,32px)] py-4 lg:grid-cols-12">
        <div className="min-h-[420px] lg:col-span-7 lg:min-h-0">
          <TranscriptPanel
            segments={room.segments}
            translations={segmentTranslations}
            interim={speech.interim}
            targetSegmentIds={targetSegmentIds}
            generatingSegmentIds={room.generatingSegmentIds}
            onSuggest={segmentId => void room.requestSuggestion(segmentId, 'manual')}
            onType={text => void room.addUtterance(text)}
          />
        </div>
        <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto scrollbar-hide lg:col-span-5">
          <OpinionPanel
            suggestions={room.suggestions}
            segmentsById={segmentsById}
            generating={room.generatingSegmentIds.length > 0}
          />
          <LiveContextCard
            context={room.context}
            translation={contextTranslation}
            onRefresh={room.refreshNow}
          />
          <LatencyPanel latencies={room.latencies} />
        </aside>
      </main>
    </div>
  );
}
