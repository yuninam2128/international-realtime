import { useState, type FormEvent } from 'react';
import Input from '../../../shared/components/Input';
import LanguageSelect from '../../../shared/components/LanguageSelect';
import type { Profile } from '../types';

type JoinFormProps = {
  initial: Profile;
  onJoin: (profile: Profile) => void;
};

export default function JoinForm({ initial, onJoin }: JoinFormProps) {
  const [form, setForm] = useState(initial);
  const canJoin = form.meetingId.trim() && form.name.trim();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canJoin) return;
    onJoin({
      meetingId: form.meetingId.trim(),
      name: form.name.trim(),
      role: form.role.trim(),
      language: form.language,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-[clamp(20px,8vw,48px)]">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-[420px] flex-col gap-6 rounded-4 bg-white p-8 shadow-02"
      >
        <div className="flex flex-col gap-2">
          <h1 className="heading-05 text-gray-900">Nuncheet</h1>
          <p className="body-03 text-gray-500">
            같은 방 코드로 들어오면 전사·맥락이 실시간으로 공유되고, 각자 고른 언어로 번역해
            보여줘요.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <Input
            id="meetingId"
            label="방 코드"
            placeholder="예) lab-1"
            value={form.meetingId}
            onChange={e => setForm({ ...form, meetingId: e.target.value })}
          />
          <Input
            id="name"
            label="이름"
            placeholder="회의에서 보일 이름"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
          <Input
            id="role"
            label="역할 (선택)"
            placeholder="예) 프론트엔드 개발자, PM, 디자이너"
            value={form.role}
            onChange={e => setForm({ ...form, role: e.target.value })}
          />
          <label htmlFor="language" className="flex flex-col gap-[6px]">
            <span className="body-02 text-gray-900">내 언어</span>
            <LanguageSelect
              id="language"
              value={form.language}
              onChange={language => setForm({ ...form, language })}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={!canJoin}
          className="flex h-12 items-center justify-center rounded-2 bg-primary-500 title-02 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          입장하기
        </button>
      </form>
    </div>
  );
}
