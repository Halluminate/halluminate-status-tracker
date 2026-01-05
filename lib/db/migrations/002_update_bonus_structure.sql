-- Migration: Update bonus structure to match December 15-31 Bonus Summary format
-- 7 bonus categories: Writer, Review 1, Review 2, Hours %, Salary Increase, Referral, Data

-- Drop old tables and recreate with new structure
DROP TABLE IF EXISTS weekly_bonus_calculations;
DROP TABLE IF EXISTS weekly_bonus_input;
DROP TABLE IF EXISTS bonus_parameters;

-- Bonus parameters - configurable rates
CREATE TABLE bonus_parameters (
    id SERIAL PRIMARY KEY,
    parameter_name TEXT UNIQUE NOT NULL,
    parameter_value DECIMAL(10,2) NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default bonus parameters
INSERT INTO bonus_parameters (parameter_name, parameter_value, description) VALUES
    ('writer_per_problem', 100.00, 'Writer bonus per qualifying problem'),
    ('review1_per_problem', 50.00, 'Review 1 bonus per qualifying problem'),
    ('review2_per_problem', 50.00, 'Review 2 bonus per qualifying problem'),
    ('hours_percent_rate', 0.20, 'Percentage bonus on hours (20%)'),
    ('referral_bonus_amount', 300.00, 'Bonus per initial referral'),
    ('default_data_file_price', 200.00, 'Default price per data file');

-- Weekly bonus input - raw data for each expert per period
CREATE TABLE weekly_bonus_input (
    id SERIAL PRIMARY KEY,
    expert_id INTEGER NOT NULL REFERENCES experts(id),
    period_name TEXT NOT NULL,  -- e.g., "December 15 - 31"
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Writer bonus inputs
    writer_qualifying_problems INTEGER DEFAULT 0,
    writer_per_problem_rate DECIMAL(10,2) DEFAULT 100.00,

    -- Review 1 bonus inputs
    review1_qualifying_problems INTEGER DEFAULT 0,
    review1_per_problem_rate DECIMAL(10,2) DEFAULT 50.00,

    -- Review 2 bonus inputs
    review2_qualifying_problems INTEGER DEFAULT 0,
    review2_per_problem_rate DECIMAL(10,2) DEFAULT 50.00,

    -- Hours percentage bonus inputs
    total_hours DECIMAL(10,2) DEFAULT 0,
    hourly_rate DECIMAL(10,2) DEFAULT 150.00,
    percent_bonus_rate DECIMAL(5,4) DEFAULT 0.20,  -- 20% = 0.20

    -- Salary increase bonus inputs
    hours_at_old_salary DECIMAL(10,2) DEFAULT 0,
    old_hourly_rate DECIMAL(10,2),
    new_hourly_rate DECIMAL(10,2),

    -- Referral bonus inputs
    initial_referral_count INTEGER DEFAULT 0,
    referral_bonus_amount DECIMAL(10,2) DEFAULT 300.00,

    -- Data bonus inputs
    data_files_count INTEGER DEFAULT 0,
    price_per_data_file DECIMAL(10,2) DEFAULT 200.00,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(expert_id, period_start, period_end)
);

-- Weekly bonus calculations - computed values
CREATE TABLE weekly_bonus_calculations (
    id SERIAL PRIMARY KEY,
    expert_id INTEGER NOT NULL REFERENCES experts(id),
    period_name TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Calculated bonuses
    writer_bonus DECIMAL(10,2) DEFAULT 0,
    review1_bonus DECIMAL(10,2) DEFAULT 0,
    review2_bonus DECIMAL(10,2) DEFAULT 0,
    hours_percentage_bonus DECIMAL(10,2) DEFAULT 0,
    salary_increase_bonus DECIMAL(10,2) DEFAULT 0,
    referral_bonus DECIMAL(10,2) DEFAULT 0,
    data_bonus DECIMAL(10,2) DEFAULT 0,

    -- Totals
    total_bonus DECIMAL(10,2) DEFAULT 0,
    base_earnings DECIMAL(10,2) DEFAULT 0,  -- hours × rate
    total_owed DECIMAL(10,2) DEFAULT 0,     -- base_earnings + total_bonus

    -- Payment tracking
    is_paid BOOLEAN DEFAULT FALSE,
    paid_date DATE,
    payment_notes TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(expert_id, period_start, period_end)
);

-- Create indexes
CREATE INDEX idx_bonus_input_expert ON weekly_bonus_input(expert_id);
CREATE INDEX idx_bonus_input_period ON weekly_bonus_input(period_start, period_end);
CREATE INDEX idx_bonus_calc_expert ON weekly_bonus_calculations(expert_id);
CREATE INDEX idx_bonus_calc_period ON weekly_bonus_calculations(period_start, period_end);
CREATE INDEX idx_bonus_calc_unpaid ON weekly_bonus_calculations(is_paid) WHERE is_paid = FALSE;
