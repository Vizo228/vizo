ALTER TABLE seller_applications
  ADD COLUMN IF NOT EXISTS resume_summary TEXT,
  ADD COLUMN IF NOT EXISTS resume_url TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS seller_applications_one_pending_per_user
  ON seller_applications (user_id)
  WHERE status = 'pending';

COMMENT ON TABLE seller_applications IS
  'Seller onboarding requests. Public registration never grants seller role; only an admin review can promote the account.';
COMMENT ON COLUMN seller_applications.resume_summary IS
  'Applicant-provided resume summary; secure file uploads require a separately configured private object-storage service.';
COMMENT ON COLUMN seller_applications.resume_url IS
  'HTTPS link to an applicant resume. Links are reviewed by an administrator and are not fetched by the API.';
