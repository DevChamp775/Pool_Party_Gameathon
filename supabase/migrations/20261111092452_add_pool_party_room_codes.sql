/*
# Add room codes for multiplayer Pool Party sessions

1. Modified table
- `pool_party_sessions.join_code` stores the short code players use to enter the same live room.
- Existing JSON state remains the room snapshot so existing sessions continue to load.

2. Security
- Room codes are not treated as authorization; the existing shared-event policies remain in place for this no-sign-in event experience.
- A unique index prevents two active sessions from using the same code.

3. Important notes
- New rooms generate a short uppercase code in the browser before insertion.
- Realtime clients subscribe to the session row and refresh their visible room state whenever it changes.
*/

ALTER TABLE pool_party_sessions ADD COLUMN IF NOT EXISTS join_code text;
CREATE UNIQUE INDEX IF NOT EXISTS pool_party_sessions_join_code_key ON pool_party_sessions (join_code) WHERE join_code IS NOT NULL;
