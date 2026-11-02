export type Profile = {
  meetingId: string;
  name: string;
  role: string;
};

export type Segment = {
  id: number;
  meeting_id: string;
  sequence_index: number;
  speaker: string;
  content: string;
  created_at: string;
};

export type SuggestDecision = {
  shouldSuggest: boolean;
  targetSegmentId: number | null;
  importance: number;
  reason: string;
};

export type LiveContext = {
  meeting_id: string;
  rolling_summary: string;
  current_topic: string | null;
  keywords: string[];
  open_questions: string[];
  suggest_decision: SuggestDecision | null;
  last_sequence_index: number;
  last_segment_created_at: string | null;
  ai_ms: number | null;
  locked_until: string | null;
  updated_at: string;
};

export type OpinionSuggestion = {
  id: number;
  meeting_id: string;
  segment_id: number;
  source: 'auto' | 'manual';
  agree: string;
  disagree: string;
  alternative: string;
  ai_ms: number | null;
  created_at: string;
};

export type LatencyStage = 'stt' | 'context' | 'suggest';

export type LatencyEntry = {
  id: string;
  stage: LatencyStage;
  // 발화 저장 → 결과 저장까지 (서버 시각끼리 비교해 기기 시계 차이가 끼지 않는다)
  totalMs: number;
  aiMs: number | null;
  note: string;
  at: number;
};
