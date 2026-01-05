# Status Tracker - TODO

## Phase 0: Infrastructure
- [ ] Set up AWS RDS PostgreSQL (or Neon/Supabase)
- [ ] Migrate schema from SQLite to PostgreSQL
- [ ] Add error tracking tables (sync_runs, sync_errors, data_conflicts)

## Phase 1: Weekly Bonus Management (Priority)
- [ ] Add bonus database tables (expert_bonus_config, weekly_bonus_input, weekly_bonus_calculations, bonus_parameters)
- [ ] Create Excel import with validation (lib/excel/bonus-import.ts)
- [ ] Build /bonuses page with "What I Owe" summary
- [ ] Add bonus API endpoints
- [ ] Connect to bonus tracking sheet: https://docs.google.com/spreadsheets/d/1mDI3F17ElB-UwPle0VL1gKMsr-jn81p8NcfgGfabWpg/edit

## Phase 2: Horizon Metrics Integration
- [ ] Create Horizon metrics client (lib/horizon/metrics-client.ts)
- [ ] Add horizon_metrics table
- [ ] Add metrics section to expert detail pages
- [ ] Sync trigger API endpoint

## Phase 3: Weekly Problem Metrics
- [ ] Create /weekly page
- [ ] Track problems created, reviewed, delivered, blocked per week
- [ ] Weekly metrics components

## Phase 4: Rippling API Integration
- [ ] Replace manual paste with direct API sync
- [ ] Create Rippling client (lib/rippling/client.ts)
- [ ] Sync trigger API endpoint

## Phase 5: Expert Recruiting
- [ ] Add recruiting_pipeline table
- [ ] Add onboarding_checklist table
- [ ] Create /recruiting page (pipeline kanban)

## Phase 6: Expert Deep Dives
- [ ] Create /experts/[id]/analytics page
- [ ] Time to review per problem metrics
- [ ] Interaction count (feedback cycles)
- [ ] Historical trends
- [ ] Team comparisons

## Error Handling & Testing
- [ ] Build error dashboard (/errors page)
- [ ] Implement sync status panel
- [ ] Add Zod validation layer
- [ ] Write tests for input sources
- [ ] Write tests for database operations
- [ ] Write tests for data unification
- [ ] Write tests for API endpoints

## In Progress

## Completed
