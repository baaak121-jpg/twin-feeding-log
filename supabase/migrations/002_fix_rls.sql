-- users: 본인 insert 허용
create policy "users: insert own" on public.users
  for insert with check (auth.uid() = id);

-- families: 인증된 사용자 insert 허용 (가족 그룹 생성)
create policy "families: insert" on public.families
  for insert with check (owner_id = auth.uid());

-- families: 초대 코드로 조회 허용 (가족 참여 시 필요)
create policy "families: select by invite" on public.families
  for select using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.family_members fm
      where fm.family_id = id and fm.user_id = auth.uid()
    )
    or true  -- 초대 코드 조회용 (invite_code로 lookup 필요)
  );
