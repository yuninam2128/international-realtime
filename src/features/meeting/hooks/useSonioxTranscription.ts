import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchSonioxKey } from '../api/meetingApi';

const SONIOX_URL = 'wss://stt-rt.soniox.com/transcribe-websocket';
const MODEL = 'stt-rt-preview';
// MediaRecorder 가 이 간격마다 webm 조각을 내보낸다. 짧을수록 전사가 빨리 오지만 메시지가 많아진다.
const CHUNK_MS = 250;
// <end> 가 오지 않을 때를 대비한 안전망. 마지막 확정 토큰 뒤로 이만큼 조용하면 강제로 확정한다.
const IDLE_FLUSH_MS = 5_000;

type SonioxToken = { text: string; is_final: boolean; speaker?: string; language?: string };
type SonioxResponse = {
  tokens?: SonioxToken[];
  finished?: boolean;
  error_code?: number;
  error_message?: string;
};

type Options = {
  onFinal: (
    text: string,
    finalizedAt: number,
    speaker: string,
    language: string | undefined
  ) => void;
};

/**
 * 대면 회의용 STT. 한 기기가 방 전체 소리를 Soniox 로 보내고, 화자 분리로 누가 말했는지 나눈다.
 * 토큰 조립 규칙은 백엔드 SonioxTokenBuffer 와 같다: final 은 누적, interim 은 프레임마다 교체,
 * <end> 에서 확정. 여기에 화자가 바뀌면 그 앞까지를 한 발화로 끊는 규칙을 더했다.
 */
export default function useSonioxTranscription({ onFinal }: Options) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const onFinalRef = useRef(onFinal);
  const finalTextRef = useRef('');
  const speakerRef = useRef<string | null>(null);
  // 한 발화 안에서 언어별 확정 글자 수. 가장 많이 나온 언어를 그 발화의 언어로 본다.
  const languageCountRef = useRef(new Map<string, number>());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  const flush = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = null;
    const text = finalTextRef.current.trim();
    const language = [...languageCountRef.current].sort((a, b) => b[1] - a[1])[0]?.[0];
    finalTextRef.current = '';
    languageCountRef.current.clear();
    if (text) {
      onFinalRef.current(text, performance.now(), speakerLabel(speakerRef.current), language);
    }
  }, []);

  const accept = useCallback(
    (tokens: SonioxToken[]) => {
      let pending = '';
      for (const token of tokens) {
        if (token.text === '<end>') {
          flush();
          continue;
        }
        if (token.text === '<fin>') continue;
        if (!token.is_final) {
          pending += token.text;
          continue;
        }
        if (token.speaker && speakerRef.current && token.speaker !== speakerRef.current) flush();
        if (token.speaker) speakerRef.current = token.speaker;
        finalTextRef.current += token.text;
        if (token.language) {
          const counts = languageCountRef.current;
          counts.set(token.language, (counts.get(token.language) ?? 0) + token.text.length);
        }
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(flush, IDLE_FLUSH_MS);
      }
      setInterim((finalTextRef.current + pending).trim());
    },
    [flush]
  );

  const cleanup = useCallback(() => {
    recorderRef.current?.stream.getTracks().forEach(track => track.stop());
    recorderRef.current = null;
    socketRef.current = null;
    flush();
    setInterim('');
    setListening(false);
  }, [flush]);

  const start = useCallback(async () => {
    setError(null);
    try {
      const [apiKey, stream] = await Promise.all([
        fetchSonioxKey(),
        navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        }),
      ]);

      const socket = new WebSocket(SONIOX_URL);
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      socketRef.current = socket;
      recorderRef.current = recorder;

      socket.onopen = () => {
        socket.send(
          JSON.stringify({
            api_key: apiKey,
            model: MODEL,
            audio_format: 'auto',
            language_hints: ['ko', 'en'],
            enable_speaker_diarization: true,
            enable_language_identification: true,
            enable_endpoint_detection: true,
          })
        );
        recorder.start(CHUNK_MS);
        setListening(true);
      };
      recorder.ondataavailable = event => {
        if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) socket.send(event.data);
      };
      // 녹음을 멈추면 마지막 조각을 보낸 뒤 빈 메시지로 끝을 알린다. Soniox 가 남은 토큰을 보내고 닫는다.
      recorder.onstop = () => {
        if (socket.readyState === WebSocket.OPEN) socket.send('');
      };
      socket.onmessage = event => {
        const response = JSON.parse(event.data as string) as SonioxResponse;
        if (response.error_code) {
          setError(`Soniox ${response.error_code}: ${response.error_message ?? ''}`);
          return;
        }
        if (response.tokens?.length) accept(response.tokens);
      };
      socket.onerror = () => setError('Soniox 연결 오류');
      socket.onclose = () => {
        if (recorder.state !== 'inactive') recorder.stop();
        cleanup();
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      cleanup();
    }
  }, [accept, cleanup]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    } else {
      socketRef.current?.close();
    }
  }, []);

  useEffect(
    () => () => {
      recorderRef.current?.stream.getTracks().forEach(track => track.stop());
      socketRef.current?.close();
    },
    []
  );

  return { supported: Boolean(window.MediaRecorder), listening, interim, error, start, stop };
}

function speakerLabel(speaker: string | null) {
  return speaker ? `화자 ${speaker}` : '';
}
