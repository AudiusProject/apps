create or replace function handle_chat_blast() returns trigger as $$
declare
begin
  PERFORM pg_notify('chat_blast_inserted', json_build_object('blast_id', new.blast_id)::text);
  return null;

exception
  when others then
    raise warning 'An error occurred in %: %', tg_name, sqlerrm;
    raise;

end;
$$ language plpgsql;


do $$ begin
  create trigger on_chat_blast
  after insert on chat_blast
  for each row execute procedure handle_chat_blast();
exception
  when others then null;
end $$;
