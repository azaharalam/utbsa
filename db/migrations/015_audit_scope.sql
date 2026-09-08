-- ============================================================
-- 015 — clear member-scope actions out of the audit log
--
-- The log is meant to record the use of power. An officer linking their
-- household or volunteering for an airport run is acting as a member; the
-- office is incidental. Those entries buried the ones that matter.
-- ============================================================

delete from audit_log where action in (
  'auth.login', 'member.signup',
  'household.invite', 'household.accept', 'household.decline', 'household.leave',
  'arrival.claim', 'arrival.release', 'arrival.done', 'arrival.cancel',
  'rsvp.set', 'rsvp.cancel',
  'potluck.claim', 'potluck.release',
  'giveaway.post', 'giveaway.claim',
  'housing.post', 'housing.close',
  'job.post', 'job.close',
  'nomination.self', 'nomination.withdraw'
);
