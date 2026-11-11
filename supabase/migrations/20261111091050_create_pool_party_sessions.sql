/*
# Create Pool Party session storage

1. New Tables
- `pool_party_sessions` stores the current shared event session as JSON so the game can be resumed after a refresh or restart.
- `id` is the session identifier.
- `status` stores the current lifecycle state.
- `state` stores the validated game configuration and public game state.
- `created_at` and `updated_at` track session freshness.

2. Security
- Row level security is enabled.
- This is a single-tenant event experience with no sign-in screen, so the browser may read and write the shared session through the anon role.
- Access is limited to the session table and its four explicit CRUD policies.

3. Important notes
- The application keeps contribution amounts out of the public state until the reveal stage.
- JSON state is used because the live game is a single event room and the frontend needs an atomic snapshot for resilient refreshes.
*/

CREATE TABLE IF NOT EXISTS pool_party_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'setup',
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pool_party_sessions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON pool_party_sessions TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_pool_party_sessions" ON pool_party_sessions;
CREATE POLICY "public_read_pool_party_sessions" ON pool_party_sessions
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_pool_party_sessions" ON pool_party_sessions;
CREATE POLICY "public_insert_pool_party_sessions" ON pool_party_sessions
FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_pool_party_sessions" ON pool_party_sessions;
CREATE POLICY "public_update_pool_party_sessions" ON pool_party_sessions
FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_pool_party_sessions" ON pool_party_sessions;
CREATE POLICY "public_delete_pool_party_sessions" ON pool_party_sessions
FOR DELETE TO anon, authenticated USING (true);
