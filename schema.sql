-- Expert Management Database Schema
-- SQLite database for tracking problem delivery and expert performance

-- Experts table - stores contractor information
CREATE TABLE IF NOT EXISTS experts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    rippling_id TEXT,
    hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 150.00,
    email TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Problems table - stores problem catalog entries
CREATE TABLE IF NOT EXISTS problems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    problem_id TEXT NOT NULL,           -- e.g., "1.1", "2.3"
    spec_number INTEGER,                 -- e.g., 1, 2, 5
    environment TEXT NOT NULL,           -- 'PE' or 'IB'
    status TEXT NOT NULL,                -- Delivered, QA, Problem Feedback, etc.
    sme_id INTEGER REFERENCES experts(id),
    content_reviewer_id INTEGER REFERENCES experts(id),
    engineer_id INTEGER REFERENCES experts(id),
    reviewer_id INTEGER REFERENCES experts(id),
    week INTEGER,
    problem_doc TEXT,
    ground_truth TEXT,
    spec_folder TEXT,
    pr_link TEXT,
    blocker_reason TEXT,
    sonnet_pass_rate TEXT,
    opus_pass_rate TEXT,
    task_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(problem_id, environment)
);

-- Time entries table - stores hours worked from Rippling
CREATE TABLE IF NOT EXISTS time_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expert_id INTEGER NOT NULL REFERENCES experts(id),
    week_start DATE NOT NULL,            -- Start of the week (Monday)
    hours_worked DECIMAL(10,2) NOT NULL,
    hours_approved DECIMAL(10,2),
    submission_status TEXT,              -- 'Submitted', 'Not submitted'
    approval_status TEXT,                -- 'Approved', 'Pending'
    rippling_entry_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(expert_id, week_start)
);

-- Weekly snapshots for historical tracking
CREATE TABLE IF NOT EXISTS weekly_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expert_id INTEGER NOT NULL REFERENCES experts(id),
    week_start DATE NOT NULL,
    problems_delivered INTEGER DEFAULT 0,
    problems_in_qa INTEGER DEFAULT 0,
    problems_in_progress INTEGER DEFAULT 0,
    problems_blocked INTEGER DEFAULT 0,
    total_hours DECIMAL(10,2) DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(expert_id, week_start)
);

-- Views for common queries

-- Expert summary view with current stats
CREATE VIEW IF NOT EXISTS expert_summary AS
SELECT
    e.id,
    e.name,
    e.hourly_rate,
    COUNT(DISTINCT CASE WHEN p.status = 'Delivered' THEN p.id END) as problems_delivered,
    COUNT(DISTINCT CASE WHEN p.status = 'QA' THEN p.id END) as problems_in_qa,
    COUNT(DISTINCT CASE WHEN p.status IN ('Ready To Build', 'Problem Writeup', 'Problem Feedback') THEN p.id END) as problems_in_progress,
    COUNT(DISTINCT CASE WHEN p.status = 'Blocked' THEN p.id END) as problems_blocked,
    COUNT(DISTINCT p.id) as total_problems_assigned,
    COALESCE(SUM(t.hours_worked), 0) as total_hours,
    COALESCE(SUM(t.hours_worked), 0) * e.hourly_rate as total_cost
FROM experts e
LEFT JOIN problems p ON e.id IN (p.sme_id, p.engineer_id, p.reviewer_id, p.content_reviewer_id)
LEFT JOIN time_entries t ON e.id = t.expert_id
GROUP BY e.id;

-- Insert default expert rates
INSERT OR IGNORE INTO experts (name, hourly_rate) VALUES
    ('Alex Ishin', 275.00),
    ('Minesh Patel', 275.00),
    ('Zach Barry', 200.00),
    ('Ryan Diebner', 200.00),
    ('Rob', 150.00),
    ('Jerry', 150.00),
    ('Will', 150.00),
    ('Wyatt', 150.00),
    ('Josh', 150.00),
    ('Kavi Munjal', 150.00),
    ('Lindsay Saldebar', 150.00),
    ('Arielle Flynn', 150.00),
    ('Frank Mork', 150.00),
    ('Phil', 150.00),
    ('Philip Garbarini', 150.00),
    ('Jackson Ozello', 150.00),
    ('Prem Patel', 150.00),
    ('Tyler Patterson', 150.00),
    ('Haylee Glenn', 150.00),
    ('Jack Barnett', 150.00),
    ('Gorka', 150.00),
    ('Andrew', 150.00),
    ('Andrew K', 150.00),
    ('Z L', 150.00),
    ('Josh Gelberger', 150.00),
    ('Sneh Patel', 150.00),
    ('Jason Dotzel', 150.00);
