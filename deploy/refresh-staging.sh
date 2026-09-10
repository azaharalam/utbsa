#!/usr/bin/env bash
#
# Copy production data into staging so you are testing against something
# shaped like the real thing.
#
#   sudo /usr/local/bin/utbsa-refresh-staging
#
# Read the scrub step below before running this. It exists because a staging
# database full of real addresses is a copy of your membership list on a
# machine with a weaker password.

set -euo pipefail

echo "→ dumping production"
sudo -u postgres pg_dump -Fc utbsa > /tmp/utbsa-prod.dump

echo "→ rebuilding staging database"
sudo systemctl stop utbsa-staging
sudo -u postgres dropdb --if-exists utbsa_staging
sudo -u postgres createdb utbsa_staging -O utbsa
sudo -u postgres pg_restore -d utbsa_staging --no-owner --role=utbsa /tmp/utbsa-prod.dump

echo "→ scrubbing contact details"
# Even with MAIL_REDIRECT_TO set, real addresses should not sit in a database
# on a test host. Names stay so the data still looks realistic.
sudo -u postgres psql -q utbsa_staging <<'SQL'
update members set
  email            = 'member+' || left(id::text, 8) || '@example.invalid',
  university_email = case when university_email is null then null
                     else 'member+' || left(id::text, 8) || '@rockets.utoledo.edu' end,
  personal_email   = 'member+' || left(id::text, 8) || '@example.invalid',
  phone            = null;

update arrival_requests set
  email = 'arrival+' || left(id::text, 8) || '@example.invalid',
  phone = null;

update donors set email = null where email is not null;
update contact_messages set email = 'sender+' || left(id::text, 8) || '@example.invalid';

-- Sessions and tokens from production must not work here.
delete from sessions;
delete from login_tokens;
delete from claim_tokens;
SQL

rm -f /tmp/utbsa-prod.dump
sudo systemctl start utbsa-staging

echo "✓ staging refreshed from production, contact details scrubbed"
echo "  Sign in with an address you can see in the members table."
