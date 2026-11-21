import { dialPg } from './conn'
import { logger } from './logger'

export const LISTEN_TABLES = [
  'aggregate_plays',
  'aggregate_user',
  'aggregate_track',
  'follows',
  'playlists',
  'reposts',
  'saves',
  'tracks',
  'users',
]

const functionName = `on_new_row`

const trigger = `
create or replace function ${functionName}() returns trigger as $$
begin
  case TG_TABLE_NAME
    when 'tracks' then
      PERFORM pg_notify(TG_TABLE_NAME, json_build_object('track_id', new.track_id)::text);
    when 'users' then
      PERFORM pg_notify(TG_TABLE_NAME, json_build_object('user_id', new.user_id)::text);
    when 'playlists' then
      PERFORM pg_notify(TG_TABLE_NAME, json_build_object('playlist_id', new.playlist_id)::text);
    when 'comments' then
      PERFORM pg_notify(TG_TABLE_NAME, json_build_object('comment_id', new.comment_id)::text);
    else
      PERFORM pg_notify(TG_TABLE_NAME, to_json(new)::text);
  end case;
  return null;
end; 
$$ language plpgsql;
`

export async function setupTriggers() {
  const client = await dialPg().connect()
  const tables = LISTEN_TABLES

  const count = await client.query(`
    SELECT count(*)
    FROM information_schema.routines
    WHERE routine_name = '${functionName}';`)
  let skip = count.rows[0].count == 1

  if (skip) {
    client.query(`alter table tracks enable trigger trg_tracks;`)

    logger.info(`function ${functionName} already exists... skipping`)
  } else {
    logger.info({ tables }, `dropping any existing triggers`)
    await Promise.all(
      tables.map((t) =>
        client.query(`drop trigger if exists trg_${t} on ${t};`)
      )
    )

    logger.info(`creating plpgsql function`)
    await client.query(trigger)

    logger.info({ tables }, `creating triggers`)
    if (process.argv[2] !== 'drop') {
      await Promise.all(
        tables.map((t) =>
          client.query(`
        create trigger trg_${t}
          after insert or update on ${t}
          for each row execute procedure ${functionName}();`)
        )
      )
    }
  }

  client.release()
}
