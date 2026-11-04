export type Profile = {
  meetingId: string;
  name: string;
  role: string;
  // 전사 번역·추천 뜻을 보여줄 언어 (ISO 코드)
  language: string;
};

export type Segment = {
  id: number;
  meeting_id: string;
  sequence_index: number;
  speaker: string;
  content: string;
  // Soniox 언어 식별 결과. 직접 입력한 발화는 null
  language: string | null;
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
  language: string | null;
  // 사용자 언어로 옮긴 세 문장의 뜻. 한국어 사용자는 null
  gloss: { agree: string; disagree: string; alternative: string } | null;
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
