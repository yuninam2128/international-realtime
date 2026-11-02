import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && key);

// 설정이 비어 있어도 화면은 떠서 안내 문구를 보여줄 수 있게 placeholder 로 만든다.
export const supabase = createClient(url || 'http://localhost', key || 'missing-key');

// 실험용이라 회원가입 없이 익명 로그인으로 RLS·Edge Function 인증을 통과한다.
export async function ensureSignedIn(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: signedIn, error } = await supabase.auth.signInAnonymously();
  if (error || !signedIn.user) {
    throw new Error(
      `익명 로그인에 실패했습니다. Anonymous sign-ins 설정을 확인하세요. (${error?.message})`
    );
  }
  return signedIn.user.id;
}
