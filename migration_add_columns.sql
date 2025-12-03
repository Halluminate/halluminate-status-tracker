-- Migration to add new columns to problems table
-- Run this to update your existing database

ALTER TABLE problems ADD COLUMN feedback_id INTEGER REFERENCES experts(id);
ALTER TABLE problems ADD COLUMN qa_id INTEGER REFERENCES experts(id);
ALTER TABLE problems ADD COLUMN final_reviewer_id INTEGER REFERENCES experts(id);
ALTER TABLE problems ADD COLUMN separate_environment_init BOOLEAN DEFAULT FALSE;
ALTER TABLE problems ADD COLUMN spec_doc TEXT;
ALTER TABLE problems ADD COLUMN spec_data_folder TEXT;
ALTER TABLE problems ADD COLUMN docker_container TEXT;
ALTER TABLE problems ADD COLUMN taiga_tag TEXT;
ALTER TABLE problems ADD COLUMN explainer_video TEXT;
ALTER TABLE problems ADD COLUMN notes TEXT;
