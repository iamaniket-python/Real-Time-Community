-- A helper can hold only one active job at a time (race-proof, enforced by the database)
CREATE UNIQUE INDEX one_active_job_per_helper ON help_requests (accepted_helper_id)
  WHERE status IN ('ACCEPTED','ARRIVING','IN_PROGRESS');