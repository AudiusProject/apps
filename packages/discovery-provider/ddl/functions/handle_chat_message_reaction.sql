create or replace function handle_chat_message_reaction_changed() returns trigger as $$
declare
  message_id text;
  user_id bigint;
  reaction text;
begin
  -- Get the values from either NEW or OLD record
  if tg_op = 'DELETE' then
    message_id := old.message_id;
    user_id := old.user_id;
    reaction := null; -- Set reaction to null for deletions
  else
    message_id := new.message_id;
    user_id := new.user_id;
    reaction := new.reaction;
  end if;

  PERFORM pg_notify('chat_message_reaction_changed', json_build_object(
    'message_id', message_id,
    'user_id', user_id,
    'reaction', reaction
  )::text);
  return coalesce(new, old);

exception
  when others then
    raise warning 'An error occurred in %: %', tg_name, sqlerrm;
    raise;

end;
$$ language plpgsql;


do $$ begin
  create trigger on_chat_message_reaction_changed
  after insert or update or delete on chat_message_reactions
  for each row execute procedure handle_chat_message_reaction_changed();
exception
  when others then null;
end $$;
