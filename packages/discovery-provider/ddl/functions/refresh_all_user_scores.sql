-- Recompute scores for everyone, then update only changed rows.
-- Uses an advisory lock to ensure only one runner at a time.
-- Writes updates to a temp table to avoid locking, since the score calculation is slow
-- and we don't want to block other indexing that writes to aggregate_user
-- returns whether lock was acquired (false if run concurrently) and number of rows that were different/updated
create or replace function refresh_all_user_scores()
returns table(
  acquired     boolean,
  diff_rows    bigint,
  updated_rows bigint
)
language plpgsql
as $$
declare
  v_lock_key bigint := hashtext('refresh_all_user_scores');
  v_diff bigint := 0;
  v_upd  bigint := 0;
  v_got  boolean;
begin
  v_got := pg_try_advisory_lock(v_lock_key);
  if not v_got then
    acquired     := false;
    diff_rows    := 0;
    updated_rows := 0;
    return next;
    return;
  end if;

  begin
    create temp table _scores_new (
      user_id int primary key,
      score   int
    ) on commit drop;

    insert into _scores_new (user_id, score)
    select s.user_id, s.score
    from get_user_scores() as s
    join aggregate_user au using (user_id)
    where au.score is distinct from s.score;

    get diagnostics v_diff = row_count;
    create index on _scores_new (user_id);

    update aggregate_user au
    set score = sn.score
    from _scores_new sn
    where au.user_id = sn.user_id;

    get diagnostics v_upd = row_count;

    acquired     := true;
    diff_rows    := v_diff;
    updated_rows := v_upd;
    return next;

  exception when others then
    perform pg_advisory_unlock(v_lock_key);
    raise;
  end;

  perform pg_advisory_unlock(v_lock_key);
end
$$;