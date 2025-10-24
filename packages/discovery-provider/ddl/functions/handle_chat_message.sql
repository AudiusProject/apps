create or replace function handle_chat_message() returns trigger as $$
declare
begin
  PERFORM pg_notify('chat_message_inserted', json_build_object('message_id', new.message_id)::text);
  return null;

exception
  when others then
    raise warning 'An error occurred in %: %', tg_name, sqlerrm;
    raise;

end;
$$ language plpgsql;


do $$ begin
  create trigger on_chat_message
  after insert on chat_message
  for each row execute procedure handle_chat_message();
exception
  when others then null;
end $$;
