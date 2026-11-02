import { supabase } from '../../../shared/lib/supabase';
import type { LiveContext, OpinionSuggestion, Segment } from '../types';

export async function fetchRoom(meetingId: string) {
  const [segments, context, suggestions] = await Promise.all([
    supabase
      .from('transcript_segments')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('sequence_index', { ascending: false })
      .limit(200),
    supabase.from('live_context').select('*').eq('meeting_id', meetingId).maybeSingle(),
    supabase
      .from('opinion_suggestions')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);
  return {
    segments: ((segments.data ?? []) as Segment[]).reverse(),
    context: (context.data ?? null) as LiveContext | null,
    suggestions: (suggestions.data ?? []) as OpinionSuggestion[],
  };
}

export async function appendSegment(meetingId: string, speaker: string, content: string) {
  const { data, error } = await supabase.rpc('append_segment', {
    p_meeting: meetingId,
    p_speaker: speaker,
    p_content: content,
  });
  if (error) throw error;
  return data as Segment;
}

/** 다른 호출이 lease 를 쥐고 있으면 'busy' */
export async function refreshLiveContext(meetingId: string): Promise<'ok' | 'busy'> {
  const { data, error } = await supabase.functions.invoke<{ status: 'ok' | 'busy' }>(
    'live-context',
    { body: { meetingId } }
  );
  if (error) throw error;
  return data?.status ?? 'ok';
}

export async function suggestOpinions(params: {
  meetingId: string;
  segmentId: number;
  source: 'auto' | 'manual';
  name: string;
  role: string;
}) {
  const { data, error } = await supabase.functions.invoke<OpinionSuggestion>('suggest-opinions', {
    body: params,
  });
  if (error || !data) throw error ?? new Error('빈 응답');
  return data;
}
