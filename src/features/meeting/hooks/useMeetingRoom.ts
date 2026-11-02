import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { ensureSignedIn, supabase } from '../../../shared/lib/supabase';
import { appendSegment, fetchRoom, refreshLiveContext, suggestOpinions } from '../api/meetingApi';
import type { LatencyEntry, LiveContext, OpinionSuggestion, Profile, Segment } from '../types';

// 백엔드 ai.live-context.batch 기본값과 같다: 발화 2개가 모이거나 첫 발화 후 10초가 지나면 갱신.
const BATCH_SEGMENT_COUNT = 2;
const BATCH_MAX_DELAY_MS = 10_000;
// lease 를 쥔 호출이 막 끝나는 순간 들어온 발화가 남지 않도록 busy 면 잠시 뒤 다시 두드린다.
const BUSY_RETRY_DELAY_MS = 1_500;
const BUSY_MAX_RETRIES = 3;
const AUTO_SUGGEST_THRESHOLD = Number(import.meta.env.VITE_AUTO_SUGGEST_THRESHOLD ?? 60);
const MAX_LATENCY_ENTRIES = 50;

const toErrorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function useMeetingRoom(profile: Profile) {
  const { meetingId, name, role } = profile;
  const [segments, setSegments] = useState<Segment[]>([]);
  const [context, setContext] = useState<LiveContext | null>(null);
  const [suggestions, setSuggestions] = useState<OpinionSuggestion[]>([]);
  const [generatingSegmentIds, setGeneratingSegmentIds] = useState<number[]>([]);
  const [latencies, setLatencies] = useState<LatencyEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const segmentCreatedAtRef = useRef(new Map<number, string>());
  const handledAutoTargetsRef = useRef(new Set<number>());
  const lastSequenceRef = useRef(-1);
  const batchCountRef = useRef(0);
  const batchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addLatency = useCallback((entry: Omit<LatencyEntry, 'id' | 'at'>) => {
    setLatencies(prev =>
      [{ ...entry, id: crypto.randomUUID(), at: Date.now() }, ...prev].slice(0, MAX_LATENCY_ENTRIES)
    );
  }, []);

  const mergeSegment = useCallback((segment: Segment) => {
    segmentCreatedAtRef.current.set(segment.id, segment.created_at);
    setSegments(prev =>
      prev.some(s => s.id === segment.id)
        ? prev
        : [...prev, segment].sort((a, b) => a.sequence_index - b.sequence_index)
    );
  }, []);

  const requestSuggestion = useCallback(
    async (segmentId: number, source: 'auto' | 'manual') => {
      if (source === 'auto') handledAutoTargetsRef.current.add(segmentId);
      setGeneratingSegmentIds(prev => [...prev, segmentId]);
      const startedAt = performance.now();
      try {
        const suggestion = await suggestOpinions({ meetingId, segmentId, source, name, role });
        setSuggestions(prev => [suggestion, ...prev.filter(s => s.id !== suggestion.id)]);
        const segmentCreatedAt = segmentCreatedAtRef.current.get(segmentId);
        // 자동 추천은 "발화 저장 → 추천 저장" 전체를, 직접 요청은 클릭부터의 왕복을 잰다.
        addLatency(
          source === 'auto' && segmentCreatedAt
            ? {
                stage: 'suggest',
                totalMs: Date.parse(suggestion.created_at) - Date.parse(segmentCreatedAt),
                aiMs: suggestion.ai_ms,
                note: '자동 · 발화 저장부터',
              }
            : {
                stage: 'suggest',
                totalMs: Math.round(performance.now() - startedAt),
                aiMs: suggestion.ai_ms,
                note: '직접 · 클릭부터 왕복',
              }
        );
      } catch (e) {
        setError(`의견 추천 실패: ${toErrorMessage(e)}`);
      } finally {
        setGeneratingSegmentIds(prev => prev.filter(id => id !== segmentId));
      }
    },
    [meetingId, name, role, addLatency]
  );

  const handleContext = useCallback(
    (row: LiveContext) => {
      setContext(row);
      // lease 획득·해제만으로도 UPDATE 이벤트가 오므로 실제로 새 발화가 반영된 경우만 처리한다.
      if (row.last_sequence_index <= lastSequenceRef.current) return;
      lastSequenceRef.current = row.last_sequence_index;

      if (row.last_segment_created_at) {
        addLatency({
          stage: 'context',
          totalMs: Date.parse(row.updated_at) - Date.parse(row.last_segment_created_at),
          aiMs: row.ai_ms,
          note: row.current_topic ?? '',
        });
      }

      const decision = row.suggest_decision;
      if (
        decision?.shouldSuggest &&
        decision.targetSegmentId !== null &&
        decision.importance >= AUTO_SUGGEST_THRESHOLD &&
        !handledAutoTargetsRef.current.has(decision.targetSegmentId)
      ) {
        void requestSuggestion(decision.targetSegmentId, 'auto');
      }
    },
    [addLatency, requestSuggestion]
  );

  const runRefresh = useCallback(
    async (attempt = 0) => {
      try {
        const status = await refreshLiveContext(meetingId);
        if (status === 'busy' && attempt < BUSY_MAX_RETRIES) {
          setTimeout(() => void runRefresh(attempt + 1), BUSY_RETRY_DELAY_MS);
        }
      } catch (e) {
        setError(`맥락 갱신 실패: ${toErrorMessage(e)}`);
      }
    },
    [meetingId]
  );

  const flush = useCallback(() => {
    batchCountRef.current = 0;
    if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
    batchTimerRef.current = null;
    void runRefresh();
  }, [runRefresh]);

  const addUtterance = useCallback(
    async (text: string, finalizedAt?: number) => {
      const startedAt = finalizedAt ?? performance.now();
      try {
        const segment = await appendSegment(meetingId, name, text);
        mergeSegment(segment);
        addLatency({
          stage: 'stt',
          totalMs: Math.round(performance.now() - startedAt),
          aiMs: null,
          note: finalizedAt ? 'STT 확정 → DB 저장' : '입력 → DB 저장',
        });
      } catch (e) {
        setError(`발화 저장 실패: ${toErrorMessage(e)}`);
        return;
      }

      batchCountRef.current += 1;
      if (batchCountRef.current >= BATCH_SEGMENT_COUNT) {
        flush();
      } else if (!batchTimerRef.current) {
        batchTimerRef.current = setTimeout(flush, BATCH_MAX_DELAY_MS);
      }
    },
    [meetingId, name, mergeSegment, addLatency, flush]
  );

  useEffect(() => {
    let cancelled = false;
    // StrictMode 의 두 번째 마운트와 같은 토픽 채널이 겹치지 않도록 초기 로드가 끝난 뒤에 만든다.
    let channel: RealtimeChannel | null = null;

    (async () => {
      try {
        await ensureSignedIn();
        const room = await fetchRoom(meetingId);
        if (cancelled) return;
        room.segments.forEach(mergeSegment);
        room.suggestions
          .filter(s => s.source === 'auto')
          .forEach(s => handledAutoTargetsRef.current.add(s.segment_id));
        setSuggestions(room.suggestions);
        if (room.context) {
          // 입장 전에 쌓인 판단으로 추천을 쏟아내지 않게 현재 순번을 기준점으로 삼는다.
          lastSequenceRef.current = room.context.last_sequence_index;
          setContext(room.context);
        }

        channel = supabase
          .channel(`meeting:${meetingId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'transcript_segments',
              filter: `meeting_id=eq.${meetingId}`,
            },
            payload => mergeSegment(payload.new as Segment)
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'live_context',
              filter: `meeting_id=eq.${meetingId}`,
            },
            payload => {
              if (payload.eventType !== 'DELETE') handleContext(payload.new as LiveContext);
            }
          )
          .subscribe(status => setConnected(status === 'SUBSCRIBED'));
      } catch (e) {
        if (!cancelled) setError(toErrorMessage(e));
      }
    })();

    return () => {
      cancelled = true;
      if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [meetingId, mergeSegment, handleContext]);

  return {
    segments,
    context,
    suggestions,
    generatingSegmentIds,
    latencies,
    connected,
    error,
    clearError: () => setError(null),
    addUtterance,
    refreshNow: flush,
    requestSuggestion,
  };
}
