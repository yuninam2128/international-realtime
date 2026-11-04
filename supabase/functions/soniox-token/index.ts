// 브라우저가 Soniox 에 직접 스트리밍할 수 있게 짧게 사는 임시 키를 발급한다. 원래 키는 서버에만 둔다.
import { corsHeaders, json, requireUser } from '../_shared/http.ts';

const EXPIRES_IN_SECONDS = 60;

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!(await requireUser(req))) return json({ error: 'unauthorized' }, 401);

  const apiKey = Deno.env.get('SONIOX_API_KEY');
  if (!apiKey) return json({ error: 'SONIOX_API_KEY 가 설정되지 않았습니다.' }, 500);

  // 웹소켓 연결은 키 만료 전에 열기만 하면 이후로도 유지된다.
  const res = await fetch('https://api.soniox.com/v1/auth/temporary-api-key', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      usage_type: 'transcribe_websocket',
      expires_in_seconds: EXPIRES_IN_SECONDS,
    }),
  });
  const payload = (await res.json()) as { api_key?: string; message?: string };
  if (!res.ok || !payload.api_key) {
    return json({ error: `Soniox ${res.status}: ${payload.message ?? 'unknown'}` }, 502);
  }
  return json({ apiKey: payload.api_key });
});
