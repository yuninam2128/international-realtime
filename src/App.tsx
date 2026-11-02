import { useState } from 'react';
import { isSupabaseConfigured } from './shared/lib/supabase';
import JoinForm from './features/meeting/components/JoinForm';
import MeetingRoomPage from './features/meeting/pages/MeetingRoomPage';
import type { Profile } from './features/meeting/types';

const PROFILE_KEY = 'nuncheet-profile';

function loadProfile(): Profile {
  try {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (saved) return JSON.parse(saved) as Profile;
  } catch {
    // 저장소를 못 쓰는 환경이면 빈 값으로 시작한다.
  }
  return { meetingId: 'lab-1', name: '', role: '' };
}

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);

  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="max-w-[420px] rounded-4 bg-white p-6 body-03 text-gray-700 shadow-02">
          <span className="title-02 text-gray-900">Supabase 설정이 필요해요.</span>
          <br />
          .env.example 을 .env.local 로 복사하고 VITE_SUPABASE_URL, VITE_SUPABASE_KEY 를 채운 뒤 dev
          서버를 다시 켜 주세요.
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <JoinForm
        initial={loadProfile()}
        onJoin={next => {
          try {
            localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
          } catch {
            // 다음 방문 때 다시 입력하면 된다.
          }
          setProfile(next);
        }}
      />
    );
  }

  return (
    <MeetingRoomPage key={profile.meetingId} profile={profile} onLeave={() => setProfile(null)} />
  );
}
