-- ═══════════════════════════════════════════════════════════════════
-- ComplaintIQ Database Schema — PostgreSQL (Supabase)
-- ═══════════════════════════════════════════════════════════════════

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUMS ────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('Admin', 'Supervisor', 'Agent', 'Compliance Officer');
CREATE TYPE complaint_status AS ENUM ('Open', 'In Progress', 'Escalated', 'Resolved', 'Closed');
CREATE TYPE severity_level AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE incident_status AS ENUM ('Open', 'Investigating', 'Resolved', 'Closed');
CREATE TYPE account_type AS ENUM ('Savings', 'Current', 'NRI', 'Salary');

-- ─── BRANCHES ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(20) NOT NULL UNIQUE,
  city VARCHAR(50) NOT NULL,
  state VARCHAR(50) NOT NULL,
  latitude DECIMAL(10, 6),
  longitude DECIMAL(10, 6),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── USERS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'Agent',
  branch_id UUID REFERENCES branches(id),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── ACCOUNTS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_number VARCHAR(20) NOT NULL UNIQUE,
  customer_name VARCHAR(100) NOT NULL,
  branch_id UUID REFERENCES branches(id),
  mobile_number VARCHAR(15),
  email VARCHAR(150),
  account_type account_type NOT NULL DEFAULT 'Savings',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── INCIDENTS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id VARCHAR(30) NOT NULL UNIQUE,
  incident_title VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  status incident_status NOT NULL DEFAULT 'Open',
  complaint_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── COMPLAINTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id VARCHAR(20) NOT NULL UNIQUE,
  customer_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(20) NOT NULL,
  branch VARCHAR(100),
  category VARCHAR(100),
  product VARCHAR(100),
  source VARCHAR(50),
  severity severity_level DEFAULT 'Medium',
  status complaint_status DEFAULT 'Open',
  sentiment VARCHAR(30),
  sentiment_score DECIMAL(5, 2),
  fraud_risk VARCHAR(20) DEFAULT 'Low',
  duplicate_flag BOOLEAN DEFAULT false,
  incident_id UUID REFERENCES incidents(id),
  description TEXT NOT NULL,
  root_cause TEXT,
  resolution_suggestion TEXT,
  assigned_agent UUID REFERENCES users(id),
  priority_score DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  sla_deadline TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── COMPLAINT TAGS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaint_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
  tag VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── AI LOGS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL,
  task VARCHAR(50) NOT NULL,
  prompt TEXT,
  response TEXT,
  latency_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── AUDIT LOGS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════

-- GIN index for fast full-text duplicate search on complaint descriptions
CREATE INDEX IF NOT EXISTS complaints_description_tsvector_idx
  ON complaints USING gin(to_tsvector('english', description));

-- Complaint lookups
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_severity ON complaints(severity);
CREATE INDEX IF NOT EXISTS idx_complaints_branch ON complaints(branch);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_agent ON complaints(assigned_agent);
CREATE INDEX IF NOT EXISTS idx_complaints_account ON complaints(account_number);
CREATE INDEX IF NOT EXISTS idx_complaints_incident ON complaints(incident_id);
CREATE INDEX IF NOT EXISTS idx_complaints_created ON complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON complaints(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_sla ON complaints(sla_deadline);
CREATE INDEX IF NOT EXISTS idx_complaints_fraud ON complaints(fraud_risk);

-- Other lookups
CREATE INDEX IF NOT EXISTS idx_ai_logs_complaint ON ai_logs(complaint_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_complaint_tags_complaint ON complaint_tags(complaint_id);

-- ═══════════════════════════════════════════════════════════════════
-- FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════

-- Function to compute priority score
CREATE OR REPLACE FUNCTION compute_priority_score(
  p_severity severity_level,
  p_fraud_risk VARCHAR,
  p_sentiment_score DECIMAL,
  p_sla_deadline TIMESTAMP
) RETURNS DECIMAL AS $$
DECLARE
  severity_weight DECIMAL;
  fraud_weight DECIMAL;
  sentiment_weight DECIMAL;
  sla_weight DECIMAL;
  hours_remaining DECIMAL;
BEGIN
  -- Severity: Critical=40, High=30, Medium=20, Low=10
  severity_weight := CASE p_severity
    WHEN 'Critical' THEN 40
    WHEN 'High' THEN 30
    WHEN 'Medium' THEN 20
    WHEN 'Low' THEN 10
    ELSE 10
  END;

  -- Fraud risk: High=30, Medium=15, Low=5
  fraud_weight := CASE p_fraud_risk
    WHEN 'High' THEN 30
    WHEN 'Medium' THEN 15
    ELSE 5
  END;

  -- Sentiment: more negative = higher priority (range -1 to 1, map to 0–20)
  sentiment_weight := GREATEST(0, (1 - COALESCE(p_sentiment_score, 0)) * 10);

  -- SLA: closer to deadline or breached = higher priority
  IF p_sla_deadline IS NOT NULL THEN
    hours_remaining := EXTRACT(EPOCH FROM (p_sla_deadline - NOW())) / 3600;
    sla_weight := CASE
      WHEN hours_remaining < 0 THEN 20  -- breached
      WHEN hours_remaining < 4 THEN 15
      WHEN hours_remaining < 12 THEN 10
      WHEN hours_remaining < 24 THEN 5
      ELSE 0
    END;
  ELSE
    sla_weight := 0;
  END IF;

  RETURN severity_weight + fraud_weight + sentiment_weight + sla_weight;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-resolve incidents
CREATE OR REPLACE FUNCTION auto_resolve_incident()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('Resolved', 'Closed') AND NEW.incident_id IS NOT NULL THEN
    UPDATE incidents
    SET status = 'Resolved', updated_at = NOW()
    WHERE id = NEW.incident_id
    AND NOT EXISTS (
      SELECT 1 FROM complaints
      WHERE incident_id = NEW.incident_id
      AND id != NEW.id
      AND status NOT IN ('Resolved', 'Closed')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-resolving incidents
DROP TRIGGER IF EXISTS trg_auto_resolve_incident ON complaints;
CREATE TRIGGER trg_auto_resolve_incident
  AFTER UPDATE OF status ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_incident();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_complaints_updated ON complaints;
CREATE TRIGGER trg_complaints_updated
  BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_incidents_updated ON incidents;
CREATE TRIGGER trg_incidents_updated
  BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
