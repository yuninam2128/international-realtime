-- 실시간 맥락 → 동의/반대/다른 의견 추천 실험용 스키마.
-- 실험용이라 로그인(익명 포함)한 사용자는 방 코드만 알면 어느 방이든 읽을 수 있다.

create table public.transcript_segments (
  id bigint generated always as identity primary key,
  meeting_id text not null,
  sequence_index int not null,
  speaker text not null default '',
  content text not null,
  created_at timestamptz not null default now(),
  unique (meeting_id, sequence_index)
);

create table public.live_context (
  meeting_id text primary key,
  rolling_summary text not null default '',
  current_topic text,
  keywords jsonb not null default '[]',
  open_questions jsonb not null default '[]',
  suggest_decision jsonb,
  last_sequence_index int not null default -1,
  -- 지연 측정용: 이번 갱신에 반영된 마지막 발화의 저장 시각과 AI 호출 시간
  last_segment_created_at timestamptz,
  ai_ms int,
  -- 회의별 순차 실행(MeetingTaskExecutor)을 대신하는 lease. 함수가 죽어도 만료되면 풀린다.
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

create table public.opinion_suggestions (
  id bigint generated always as identity primary key,
  meeting_id text not null,
  user_id uuid not null,
  segment_id bigint not null references public.transcript_segments (id) on delete cascade,
  source text not null check (source in ('auto', 'manual')),
  agree text not null,
  disagree text not null,
  alternative text not null,
  ai_ms int,
  created_at timestamptz not null default now(),
  -- 같은 판단이 Realtime으로 여러 번 와도 참여자당 발화 하나에 자동 추천은 한 번만 만든다.
  unique (meeting_id, user_id, segment_id, source)
);

-- 여러 탭이 동시에 발화를 넣어도 순번이 겹치지 않게 회의 단위로 직렬화한다.
create function public.append_segment(p_meeting text, p_speaker text, p_content text)
returns public.transcript_segments
language plpgsql security definer set search_path = public as $$
declare
  v_row public.transcript_segments;
begin
  perform pg_advisory_xact_lock(hashtext(p_meeting));
  insert into public.transcript_segments (meeting_id, sequence_index, speaker, content)
  values (
    p_meeting,
    coalesce((select max(sequence_index) from public.transcript_segments where meeting_id = p_meeting), -1) + 1,
    p_speaker,
    p_content
  )
  returning * into v_row;
  return v_row;
end $$;

-- lease 를 잡으면 마지막 반영 순번을, 다른 호출이 처리 중이면 null 을 돌려준다.
-- 못 잡아도 미반영 발화는 DB에 남아 있어 다음 호출이 이어서 처리한다.
create function public.claim_live_context(p_meeting text, p_lease_seconds int default 60)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_last int;
begin
  insert into public.live_context (meeting_id) values (p_meeting) on conflict do nothing;
  update public.live_context
     set locked_until = now() + make_interval(secs => p_lease_seconds)
   where meeting_id = p_meeting
     and (locked_until is null or locked_until < now())
  returning last_sequence_index into v_last;
  return v_last;
end $$;

revoke execute on function public.append_segment(text, text, text) from public, anon;
grant execute on function public.append_segment(text, text, text) to authenticated;
revoke execute on function public.claim_live_context(text, int) from public, anon, authenticated;
grant execute on function public.claim_live_context(text, int) to service_role;

alter table public.transcript_segments enable row level security;
alter table public.live_context enable row level security;
alter table public.opinion_suggestions enable row level security;

-- 쓰기는 RPC(security definer)와 Edge Function(service role)만 한다.
create policy "lab: read segments" on public.transcript_segments
  for select to authenticated using (true);
create policy "lab: read live context" on public.live_context
  for select to authenticated using (true);
create policy "own suggestions" on public.opinion_suggestions
  for select to authenticated using (user_id = auth.uid());

alter publication supabase_realtime add table public.transcript_segments, public.live_context;
