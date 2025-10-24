create or replace function handle_comms_rpc_log() returns trigger as $$
declare
begin
  -- Send notification with the signature (primary key) of the new rpc_log record
  PERFORM pg_notify('rpc_log_inserted', json_build_object('sig', new.sig)::text);
  return null;

exception
  when others then
    raise warning 'An error occurred in %: %', tg_name, sqlerrm;
    raise;

end;
$$ language plpgsql;


do $$ begin
  create trigger on_rpc_log
  after insert on rpc_log
  for each row execute procedure handle_comms_rpc_log();
exception
  when others then null;
end $$;
