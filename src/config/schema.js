export const SCHEMA = `
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ─── USERS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role          TEXT NOT NULL CHECK (role IN ('startup','investor','mentor','admin')),
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  phone         TEXT,
  country       TEXT,
  avatar_url    TEXT,
  bio           TEXT,
  linkedin_url  TEXT,
  twitter_url   TEXT,
  website_url   TEXT,
  is_verified   BOOLEAN DEFAULT FALSE,
  is_active     BOOLEAN DEFAULT TRUE,
  oauth_provider TEXT,
  oauth_id      TEXT,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- ─── STARTUPS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS startups (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  founder_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  slug             TEXT UNIQUE,
  tagline          TEXT,
  description      TEXT,
  sector           TEXT NOT NULL,
  sub_sectors      TEXT[],
  country          TEXT NOT NULL,
  city             TEXT,
  stage            TEXT CHECK (stage IN ('idea','mvp','early_traction','growth','series_a','established')),
  founded_year     INTEGER,
  team_size        INTEGER DEFAULT 1,
  website_url      TEXT,
  pitch_deck_url   TEXT,
  logo_url         TEXT,
  demo_url         TEXT,
  funding_goal     BIGINT,
  funding_raised   BIGINT DEFAULT 0,
  funding_type     TEXT[],
  annual_revenue   BIGINT,
  mrr              BIGINT,
  customers        INTEGER DEFAULT 0,
  sdgs             INTEGER[],
  is_women_led     BOOLEAN DEFAULT FALSE,
  is_verified      BOOLEAN DEFAULT FALSE,
  ai_match_score   JSONB DEFAULT '{}',
  status           TEXT DEFAULT 'active',
  embedding        vector(384),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_startups_founder  ON startups(founder_id);
CREATE INDEX IF NOT EXISTS idx_startups_sector   ON startups(sector);
CREATE INDEX IF NOT EXISTS idx_startups_country  ON startups(country);
CREATE INDEX IF NOT EXISTS idx_startups_stage    ON startups(stage);
CREATE INDEX IF NOT EXISTS idx_startups_name     ON startups USING gin(name gin_trgm_ops);

-- ─── STARTUP TEAM MEMBERS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS startup_team (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  startup_id   UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  role         TEXT NOT NULL,
  linkedin_url TEXT,
  is_founder   BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INVESTORS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS investors (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  firm_name         TEXT,
  investor_type     TEXT CHECK (investor_type IN ('angel','vc','impact','family_office','corporate','government')),
  thesis            TEXT,
  sectors           TEXT[],
  stages            TEXT[],
  countries         TEXT[],
  sdgs              INTEGER[],
  ticket_min        BIGINT,
  ticket_max        BIGINT,
  instruments       TEXT[],
  portfolio_count   INTEGER DEFAULT 0,
  total_deployed    BIGINT DEFAULT 0,
  is_verified       BOOLEAN DEFAULT FALSE,
  embedding        vector(384),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_investors_user ON investors(user_id);

-- ─── MENTORS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mentors (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expertise       TEXT[],
  industries      TEXT[],
  countries       TEXT[],
  languages       TEXT[],
  experience_years INTEGER DEFAULT 0,
  "current_role"  TEXT,
  hourly_rate     INTEGER DEFAULT 0,
  session_types   TEXT[],
  max_mentees     INTEGER DEFAULT 5,
  active_mentees  INTEGER DEFAULT 0,
  total_sessions  INTEGER DEFAULT 0,
  avg_rating      DECIMAL(3,2),
  rating_count    INTEGER DEFAULT 0,
  bio_extended    TEXT,
  is_available    BOOLEAN DEFAULT TRUE,
  is_verified     BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MATCHES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  startup_id    UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  target_id     UUID NOT NULL,
  target_type   TEXT NOT NULL CHECK (target_type IN ('investor','mentor')),
  ai_score      INTEGER NOT NULL,
  ai_grade      TEXT,
  ai_reasons    TEXT[],
  ai_breakdown  JSONB DEFAULT '{}',
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending','viewed','contacted','meeting_scheduled','invested','declined','saved')),
  initiated_by  UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(startup_id, target_id, target_type)
);
CREATE INDEX IF NOT EXISTS idx_matches_startup ON matches(startup_id);
CREATE INDEX IF NOT EXISTS idx_matches_target  ON matches(target_id);
CREATE INDEX IF NOT EXISTS idx_matches_score   ON matches(ai_score DESC);

-- ─── GRANT APPLICATIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS grant_applications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  startup_id      UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  grant_name      TEXT NOT NULL,
  grant_org       TEXT NOT NULL,
  grant_amount    BIGINT,
  deadline        DATE,
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','shortlisted','awarded','rejected')),
  project_title   TEXT,
  problem_stmt    TEXT,
  solution        TEXT,
  funding_plan    TEXT,
  impact_metrics  JSONB DEFAULT '{}',
  documents       TEXT[],
  ai_score        INTEGER,
  ai_tips         TEXT[],
  submitted_at    TIMESTAMPTZ,
  awarded_at      TIMESTAMPTZ,
  awarded_amount  BIGINT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_grant_apps_startup ON grant_applications(startup_id);
CREATE INDEX IF NOT EXISTS idx_grant_apps_status  ON grant_applications(status);

-- ─── MENTOR SESSIONS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mentor_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentor_id     UUID NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  mentee_id     UUID NOT NULL REFERENCES users(id),
  startup_id    UUID REFERENCES startups(id),
  title         TEXT NOT NULL,
  agenda        TEXT,
  session_type  TEXT CHECK (session_type IN ('one_on_one','group','live_stream','workshop')),
  format        TEXT CHECK (format IN ('video','phone','in_person')),
  meeting_url   TEXT,
  scheduled_at  TIMESTAMPTZ NOT NULL,
  duration_min  INTEGER DEFAULT 60,
  status        TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','completed','cancelled','rescheduled')),
  notes         TEXT,
  recording_url TEXT,
  rating        INTEGER CHECK (rating BETWEEN 1 AND 5),
  review        TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_mentor    ON mentor_sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_mentee    ON mentor_sessions(mentee_id);
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled ON mentor_sessions(scheduled_at);

-- ─── MESSAGES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id    UUID NOT NULL REFERENCES users(id),
  recipient_id UUID NOT NULL REFERENCES users(id),
  thread_id    TEXT NOT NULL,
  content      TEXT NOT NULL,
  attachments  TEXT[],
  is_read      BOOLEAN DEFAULT FALSE,
  is_ai_draft  BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_thread    ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender    ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread    ON messages(recipient_id, is_read) WHERE NOT is_read;

-- ─── COURSES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instructor_id UUID REFERENCES users(id),
  title         TEXT NOT NULL,
  slug          TEXT UNIQUE,
  description   TEXT,
  sector_tags   TEXT[],
  level         TEXT CHECK (level IN ('beginner','intermediate','advanced')),
  duration_min  INTEGER,
  price_usd     INTEGER DEFAULT 0,
  is_free       BOOLEAN DEFAULT TRUE,
  language      TEXT DEFAULT 'en',
  thumbnail_url TEXT,
  is_published  BOOLEAN DEFAULT FALSE,
  enrollment_count INTEGER DEFAULT 0,
  avg_rating    DECIMAL(3,2),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── COURSE ENROLLMENTS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrollments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  progress    INTEGER DEFAULT 0,
  completed   BOOLEAN DEFAULT FALSE,
  xp_earned   INTEGER DEFAULT 0,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, course_id)
);

-- ─── COMPLIANCE ITEMS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  startup_id   UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  country      TEXT NOT NULL,
  area         TEXT NOT NULL,
  authority    TEXT,
  status       TEXT DEFAULT 'required' CHECK (status IN ('done','in_progress','required','not_applicable')),
  deadline     DATE,
  reference    TEXT,
  notes        TEXT,
  documents    TEXT[],
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── NOTIFICATIONS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  data       JSONB DEFAULT '{}',
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user  ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE NOT is_read;

-- ─── AUDIT LOG ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id),
  action     TEXT NOT NULL,
  entity     TEXT,
  entity_id  UUID,
  metadata   JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_user   ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);

-- ─── ESCROWS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS escrows (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  startup_id    UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  investor_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount        BIGINT NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'USD',
  status        TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'disputed', 'cancelled')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escrow_milestones (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  escrow_id          UUID NOT NULL REFERENCES escrows(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  amount             BIGINT NOT NULL,
  status             TEXT DEFAULT 'locked' CHECK (status IN ('locked', 'pending_verification', 'released', 'disputed')),
  evidence_url       TEXT,
  evidence_required  BOOLEAN DEFAULT TRUE,
  released_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CALL LOGS (WebRTC session audit) ────────────────────────
CREATE TABLE IF NOT EXISTS call_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id          TEXT UNIQUE NOT NULL,
  caller_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  call_type        TEXT CHECK (call_type IN ('video','audio')),
  session_id       UUID REFERENCES mentor_sessions(id) ON DELETE SET NULL,
  status           TEXT DEFAULT 'ringing' CHECK (status IN ('ringing','connected','ended','declined','missed')),
  initiated_at     TIMESTAMPTZ NOT NULL,
  connected_at     TIMESTAMPTZ,
  ended_at         TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_call_logs_caller    ON call_logs(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_recipient ON call_logs(recipient_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_session   ON call_logs(session_id);

-- ─── PUSH SUBSCRIPTIONS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('fcm', 'webpush')),
  endpoint     TEXT,
  p256dh       TEXT,
  auth         TEXT,
  fcm_token    TEXT,
  device_label TEXT DEFAULT 'Browser',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_user_endpoint  ON push_subscriptions(user_id, endpoint) WHERE endpoint IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_user_fcmtoken  ON push_subscriptions(user_id, fcm_token) WHERE fcm_token IS NOT NULL;
CREATE INDEX        IF NOT EXISTS idx_push_user           ON push_subscriptions(user_id);

-- Alter table queries to add columns if they already exist
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS "current_role" TEXT;
`;
