-- 참여자마다 고른 언어로 전사·추천을 보여주기 위한 스키마.

-- Soniox 언어 식별 결과(ISO 코드). 직접 입력한 발화는 모르므로 null.
alter table public.transcript_segments add column language text;

-- 같은 언어를 고른 참여자끼리 번역을 공유해 사람 수만큼 AI 를 부르지 않게 한다.
create table public.segment_translations (
  segment_id bigint not null references public.transcript_segments (id) on delete cascade,
  language text not null,
  content text not null,
  created_at timestamptz not null default now(),
  primary key (segment_id, language)
);

alter table public.segment_translations enable row level security;
-- 쓰기는 Edge Function(service role)만 한다.
create policy "lab: read translations" on public.segment_translations
  for select to authenticated using (true);

-- 추천 문장은 회의에서 소리 내어 말할 한국어로 두고, 사용자 언어로 뜻만 붙인다. {agree, disagree, alternative}
alter table public.opinion_suggestions add column language text;
alter table public.opinion_suggestions add column gloss jsonb;

drop function public.append_segment(text, text, text);

create function public.append_segment(
  p_meeting text,
  p_speaker text,
  p_content text,
  p_language text default null
)
returns public.transcript_segments
language plpgsql security definer set search_path = public as $$
declare
  v_row public.transcript_segments;
begin
  perform pg_advisory_xact_lock(hashtext(p_meeting));
  insert into public.transcript_segments (meeting_id, sequence_index, speaker, content, language)
  values (
    p_meeting,
    coalesce((select max(sequence_index) from public.transcript_segments where meeting_id = p_meeting), -1) + 1,
    p_speaker,
    p_content,
    p_language
  )
  returning * into v_row;
  return v_row;
end $$;

revoke execute on function public.append_segment(text, text, text, text) from public, anon;
grant execute on function public.append_segment(text, text, text, text) to authenticated;
