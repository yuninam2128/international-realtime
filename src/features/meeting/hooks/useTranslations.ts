import { useEffect, useRef, useState } from 'react';
import { translate } from '../api/meetingApi';
import type { LiveContext, Segment } from '../types';

// 발화가 연달아 들어올 때 한 번에 묶어 요청한다.
const DEBOUNCE_MS = 300;
const MAX_BATCH = 30;

export type ContextTranslation = { topic: string | null; summary: string };

/**
 * 내 언어와 다른 발화와 회의 요약을 내 언어로 옮긴다.
 * 발화 번역은 서버가 저장해 같은 언어를 고른 참여자끼리 공유하고, 요약은 갱신될 때마다 다시 번역한다.
 */
export default function useTranslations(
  language: string,
  segments: Segment[],
  context: LiveContext | null
) {
  const [segmentTranslations, setSegmentTranslations] = useState<Map<number, string>>(new Map());
  const [contextTranslation, setContextTranslation] = useState<ContextTranslation | null>(null);
  const requestedRef = useRef(new Set<number>());
  const languageRef = useRef(language);

  // 언어를 바꾸면 이전 언어의 번역은 버리고 처음부터 다시 받는다.
  useEffect(() => {
    languageRef.current = language;
    requestedRef.current = new Set();
    setSegmentTranslations(new Map());
    setContextTranslation(null);
  }, [language]);

  useEffect(() => {
    const pending = segments
      .filter(s => spokenLanguage(s) !== language && !requestedRef.current.has(s.id))
      .map(s => s.id)
      .slice(-MAX_BATCH);
    if (!pending.length) return;

    const timer = setTimeout(() => {
      pending.forEach(id => requestedRef.current.add(id));
      translate({ language, segmentIds: pending })
        .then(result => {
          // 응답이 오기 전에 언어를 바꿨으면 이전 언어 번역이 섞이지 않게 버린다.
          if (languageRef.current !== language) return;
          setSegmentTranslations(prev => {
            const next = new Map(prev);
            for (const [id, text] of Object.entries(result.segments)) next.set(Number(id), text);
            return next;
          });
        })
        // 실패한 발화는 다음 변경 때 다시 시도한다.
        .catch(() => pending.forEach(id => requestedRef.current.delete(id)));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [language, segments]);

  const topic = context?.current_topic ?? null;
  const summary = context?.rolling_summary ?? '';
  useEffect(() => {
    // 회의 요약은 한국어로 만들어지므로 한국어 사용자는 번역할 필요가 없다.
    if (language === 'ko' || !summary) return;
    let cancelled = false;
    translate({ language, texts: topic ? [summary, topic] : [summary] })
      .then(result => {
        if (!cancelled)
          setContextTranslation({ summary: result.texts[0], topic: result.texts[1] ?? null });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [language, topic, summary]);

  return { segmentTranslations, contextTranslation };
}

// 직접 입력한 발화는 언어를 모른다. 한글이 있으면 한국어로 보고, 아니면 번역에 보낸다.
// 이미 내 언어였다면 번역이 원문과 같아 화면에서 숨긴다.
export function spokenLanguage(segment: Segment) {
  return segment.language ?? (/[가-힣]/.test(segment.content) ? 'ko' : null);
}
