-- Status Tracker PostgreSQL Schema
-- Migrated from SQLite + new bonus/error tracking tables

-- ============================================
-- CORE TABLES (migrated from SQLite)
-- ============================================

-- Experts table - stores contractor information
CREATE TABLE IF NOT EXISTS experts (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    rippling_id TEXT,
    hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 150.00,
    email TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Problems table - stores problem catalog entries
CREATE TABLE IF NOT EXISTS problems (
    id SERIAL PRIMARY KEY,
    problem_id TEXT NOT NULL,
    spec_number INTEGER,
    environment TEXT NOT NULL CHECK (environment IN ('PE', 'IB')),
    status TEXT NOT NULL,
    sme_id INTEGER REFERENCES experts(id),
    feedback_id INTEGER REFERENCES experts(id),
    qa_id INTEGER REFERENCES experts(id),
    content_reviewer_id INTEGER REFERENCES experts(id),
    engineer_id INTEGER REFERENCES experts(id),
    reviewer_id INTEGER REFERENCES experts(id),
    final_reviewer_id INTEGER REFERENCES experts(id),
    week INTEGER,
    problem_doc TEXT,
    ground_truth TEXT,
    spec_folder TEXT,
    spec_doc TEXT,
    spec_data_folder TEXT,
    docker_container TEXT,
    pr_link TEXT,
    blocker_reason TEXT,
    sonnet_pass_rate TEXT,
    opus_pass_rate TEXT,
    separate_environment_init BOOLEAN DEFAULT FALSE,
    taiga_tag TEXT,
    explainer_video TEXT,
    task_description TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(problem_id, environment)
);

-- Time entries table - stores hours worked from Rippling
CREATE TABLE IF NOT EXISTS time_entries (
    id SERIAL PRIMARY KEY,
    expert_id INTEGER NOT NULL REFERENCES experts(id),
    week_start DATE NOT NULL,
    hours_worked DECIMAL(10,2) NOT NULL DEFAULT 0,
    hours_approved DECIMAL(10,2),
    submission_status TEXT,
    approval_status TEXT,
    rippling_entry_id TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(expert_id, week_start)
);

-- Weekly snapshots for historical tracking
CREATE TABLE IF NOT EXISTS weekly_snapshots (
    id SERIAL PRIMARY KEY,
    expert_id INTEGER NOT NULL REFERENCES experts(id),
    week_start DATE NOT NULL,
    problems_delivered INTEGER DEFAULT 0,
    problems_in_qa INTEGER DEFAULT 0,
    problems_in_progress INTEGER DEFAULT 0,
    problems_blocked INTEGER DEFAULT 0,
    total_hours DECIMAL(10,2) DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(expert_id, week_start)
);

-- ============================================
-- BONUS MANAGEMENT TABLES (new)
-- ============================================

-- Expert bonus configuration
CREATE TABLE IF NOT EXISTS expert_bonus_config (
    id SERIAL PRIMARY KEY,
    expert_id INTEGER NOT NULL REFERENCES experts(id) UNIQUE,
    expert_code TEXT UNIQUE,
    start_date DATE,
    base_rate DECIMAL(10,2),
    current_rate DECIMAL(10,2),
    rate_effective_date DATE,
    is_20_percent_eligible BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Weekly bonus input (from Excel/manual entry)
CREATE TABLE IF NOT EXISTS weekly_bonus_input (
    id SERIAL PRIMARY KEY,
    expert_id INTEGER NOT NULL REFERENCES experts(id),
    week_number INTEGER NOT NULL,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    hours_worked DECIMAL(10,2) DEFAULT 0,
    problems_completed INTEGER DEFAULT 0,
    referrals INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(expert_id, week_number)
);

-- Calculated bonuses per expert per week
CREATE TABLE IF NOT EXISTS weekly_bonus_calculations (
    id SERIAL PRIMARY KEY,
    expert_id INTEGER NOT NULL REFERENCES experts(id),
    week_number INTEGER NOT NULL,
    hourly_rate DECIMAL(10,2) DEFAULT 0,
    base_earnings DECIMAL(10,2) DEFAULT 0,
    problem_bonus DECIMAL(10,2) DEFAULT 0,
    twenty_percent_bonus DECIMAL(10,2) DEFAULT 0,
    referral_bonus DECIMAL(10,2) DEFAULT 0,
    rate_increase_bonus DECIMAL(10,2) DEFAULT 0,
    total_bonus DECIMAL(10,2) DEFAULT 0,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(expert_id, week_number)
);

-- Configurable bonus parameters
CREATE TABLE IF NOT EXISTS bonus_parameters (
    id SERIAL PRIMARY KEY,
    parameter_name TEXT UNIQUE NOT NULL,
    parameter_value DECIMAL(10,2) NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default bonus parameters
INSERT INTO bonus_parameters (parameter_name, parameter_value) VALUES
    ('problem_bonus_amount', 100.00),
    ('referral_bonus_amount', 300.00),
    ('twenty_percent_rate', 0.20)
ON CONFLICT (parameter_name) DO NOTHING;

-- ============================================
-- HORIZON METRICS TABLE (new)
-- ============================================

CREATE TABLE IF NOT EXISTS horizon_metrics (
    id SERIAL PRIMARY KEY,
    expert_id INTEGER NOT NULL REFERENCES experts(id),
    fetch_date DATE NOT NULL,
    time_window TEXT NOT NULL,
    velocity INTEGER DEFAULT 0,
    active_days INTEGER DEFAULT 0,
    responsiveness_hours DECIMAL(10,2) DEFAULT 0,
    complexity_score DECIMAL(10,2) DEFAULT 0,
    consistency_score DECIMAL(10,2) DEFAULT 0,
    overall_score DECIMAL(10,2) DEFAULT 0,
    problems_delivered INTEGER DEFAULT 0,
    problems_in_progress INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(expert_id, fetch_date, time_window)
);

-- ============================================
-- ERROR TRACKING TABLES (new)
-- ============================================

-- Track all sync runs
CREATE TABLE IF NOT EXISTS sync_runs (
    id SERIAL PRIMARY KEY,
    source TEXT NOT NULL,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'success', 'partial', 'failed')),
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    error_summary JSONB
);

-- Individual sync errors
CREATE TABLE IF NOT EXISTS sync_errors (
    id SERIAL PRIMARY KEY,
    sync_run_id INTEGER REFERENCES sync_runs(id),
    error_type TEXT NOT NULL,
    severity TEXT DEFAULT 'warning' CHECK (severity IN ('warning', 'error', 'critical')),
    source_record JSONB,
    error_message TEXT,
    stack_trace TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    resolved_by TEXT
);

-- Data conflicts between sources
CREATE TABLE IF NOT EXISTS data_conflicts (
    id SERIAL PRIMARY KEY,
    expert_id INTEGER REFERENCES experts(id),
    field_name TEXT NOT NULL,
    week_number INTEGER,
    source_a TEXT NOT NULL,
    source_a_value TEXT,
    source_b TEXT NOT NULL,
    source_b_value TEXT,
    resolved_value TEXT,
    resolution_rule TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_problems_environment ON problems(environment);
CREATE INDEX IF NOT EXISTS idx_problems_status ON problems(status);
CREATE INDEX IF NOT EXISTS idx_problems_week ON problems(week);
CREATE INDEX IF NOT EXISTS idx_problems_sme ON problems(sme_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_expert ON time_entries(expert_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_week ON time_entries(week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_bonus_input_expert ON weekly_bonus_input(expert_id);
CREATE INDEX IF NOT EXISTS idx_weekly_bonus_calc_expert ON weekly_bonus_calculations(expert_id);
CREATE INDEX IF NOT EXISTS idx_sync_runs_source ON sync_runs(source);
CREATE INDEX IF NOT EXISTS idx_sync_errors_run ON sync_errors(sync_run_id);

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Insert default experts with rates
INSERT INTO experts (name, hourly_rate) VALUES
    ('Alex Ishin', 275.00),
    ('Minesh Patel', 275.00),
    ('Zach Barry', 200.00),
    ('Ryan Diebner', 200.00),
    ('Philip Garbarini', 200.00),
    ('Jackson Ozello', 200.00),
    ('Arielle Flynn', 200.00),
    ('Josh Miller', 150.00),
    ('Sneh Kumar', 150.00),
    ('Kavi Munjal', 150.00),
    ('Lindsay Saldebar', 150.00),
    ('Frank Mork', 150.00),
    ('Prem Patel', 150.00),
    ('Tyler Patterson', 150.00),
    ('Haylee Glenn', 150.00),
    ('Jack Barnett', 150.00),
    ('Josh Gelberger', 150.00),
    ('Jason Dotzel', 150.00)
ON CONFLICT (name) DO NOTHING;
