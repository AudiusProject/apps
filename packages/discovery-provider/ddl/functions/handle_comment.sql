create or replace function handle_comment() returns trigger as $$
declare
  owner_user_id int;
begin
  if new.entity_type = 'Track' then
    insert into aggregate_track (track_id) values (new.entity_id) on conflict do nothing;
  end if;

  -- update agg track
  if new.entity_type = 'Track' then
    update aggregate_track 
    set comment_count = (
      select count(*)
      from comments c
      where
          c.is_delete is false
          and c.is_visible is true
          and c.entity_type = new.entity_type
          and c.entity_id = new.entity_id
    )
    where track_id = new.entity_id;

  	if new.is_delete is false then
		  select tracks.owner_id into owner_user_id from tracks where track_id = new.entity_id;
	  end if;
  end if;

  begin
    if new.user_id != owner_user_id then
      insert into notification
        (blocknumber, user_ids, timestamp, type, specifier, group_id, data)
        values
        ( 
          new.blocknumber,
          ARRAY [owner_user_id], 
          new.created_at, 
          'comment',
          new.user_id,
          'comment:' || new.entity_id || ':type:'|| new.entity_type,
          json_build_object('entity_id', new.entity_id, 'user_id', new.user_id, 'type', new.entity_type)
        )
      on conflict do nothing;
    end if;
	exception
    when others then
      raise warning 'An error occurred in %: %', tg_name, sqlerrm;
  end;

  return null;

exception
    when others then
      raise warning 'An error occurred in %: %', tg_name, sqlerrm;
      return null;
end;
$$ language plpgsql;

do $$ begin
  create trigger on_comment
  after insert on comments
  for each row execute procedure handle_comment();
exception
  when others then null;
end $$;