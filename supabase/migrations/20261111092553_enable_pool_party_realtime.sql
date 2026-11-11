/*
# Enable realtime room updates

1. Modified publication
- Adds `pool_party_sessions` to the Supabase realtime publication so all registered players receive room, registration, timer, submission, reveal, and leaderboard updates.

2. Security
- Realtime still uses the table's existing row policies; the room code is a routing key, not an authorization boundary.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication p
    JOIN pg_publication_rel r ON r.prpubid = p.oid
    JOIN pg_class c ON c.oid = r.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE p.pubname = 'supabase_realtime'
      AND n.nspname = 'public'
      AND c.relname = 'pool_party_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pool_party_sessions;
  END IF;
END $$;
