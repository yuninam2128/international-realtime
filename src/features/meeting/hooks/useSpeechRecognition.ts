import { useCallback, useEffect, useRef, useState } from 'react';

// Web Speech API 는 TS DOM 타입에 없어 쓰는 부분만 선언한다.
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognitionConstructor = new () => Recognition;

const RecognitionImpl: RecognitionConstructor | undefined =
  (window as unknown as { SpeechRecognition?: RecognitionConstructor }).SpeechRecognition ??
  (window as unknown as { webkitSpeechRecognition?: RecognitionConstructor })
    .webkitSpeechRecognition;

// Chrome 은 숨 쉬는 틈마다 final 을 끊어 보내서, 이 시간만큼 말이 없을 때 모아서 한 발화로 저장한다.
const PAUSE_MS = 1_200;
// 쉬지 않고 길게 말해도 이 길이를 넘으면 끊어서 저장한다.
const MAX_CHARS = 120;

type Options = {
  onFinal: (text: string, finalizedAt: number) => void;
  lang?: string;
};

/**
 * 실험용 STT. 실제 서비스의 Soniox 확정 세그먼트 자리를 브라우저 음성 인식의 final 결과가 대신한다.
 * Chrome 은 침묵이 이어지면 인식을 스스로 끝내므로, 사용자가 멈추기 전까지 다시 시작한다.
 * 이때 확정되지 못한 interim 은 버려지므로 final 로 취급해 살린다.
 */
export default function useSpeechRecognition({ onFinal, lang = 'ko-KR' }: Options) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const wantListeningRef = useRef(false);
  const onFinalRef = useRef(onFinal);
  const bufferRef = useRef<string[]>([]);
  const interimRef = useRef('');
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  const flush = useCallback(() => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = null;
    const text = bufferRef.current.join(' ').trim();
    bufferRef.current = [];
    if (text) onFinalRef.current(text, performance.now());
  }, []);

  const start = useCallback(() => {
    if (!RecognitionImpl) return;
    const recognition = new RecognitionImpl();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = event => {
      let pending = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript.trim();
        if (result.isFinal) {
          if (text) bufferRef.current.push(text);
        } else {
          pending += text;
        }
      }
      interimRef.current = pending;
      setInterim([...bufferRef.current, pending].join(' ').trim());

      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      if (bufferRef.current.join(' ').length >= MAX_CHARS) {
        flush();
      } else if (!pending) {
        flushTimerRef.current = setTimeout(() => {
          flush();
          setInterim('');
        }, PAUSE_MS);
      }
    };
    recognition.onerror = event => {
      // no-speech / aborted 는 침묵·재시작 중에 흔히 오는 정상 흐름이다.
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      setError(event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        wantListeningRef.current = false;
      }
    };
    recognition.onend = () => {
      if (interimRef.current) bufferRef.current.push(interimRef.current);
      interimRef.current = '';
      flush();
      setInterim('');
      if (wantListeningRef.current) {
        recognition.start();
      } else {
        setListening(false);
      }
    };

    wantListeningRef.current = true;
    recognitionRef.current = recognition;
    setError(null);
    recognition.start();
    setListening(true);
  }, [lang, flush]);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    recognitionRef.current?.stop();
  }, []);

  useEffect(() => stop, [stop]);

  return { supported: Boolean(RecognitionImpl), listening, interim, error, start, stop };
}
