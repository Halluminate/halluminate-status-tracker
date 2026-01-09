# Status Tracker - TODO

## Phase 0: Infrastructure
- [x] Set up AWS RDS PostgreSQL (or Neon/Supabase)
- [x] Migrate schema from SQLite to PostgreSQL
- [x] Add error tracking tables (sync_runs, sync_errors, data_conflicts)

## Phase 1: Weekly Bonus Management (Priority)
- [x] Add bonus database tables (expert_bonus_config, weekly_bonus_input, weekly_bonus_calculations, bonus_parameters)
- [ ] Create Excel import with validation (lib/excel/bonus-import.ts)
- [ ] Build /bonuses page with "What I Owe" summary
- [ ] Add bonus API endpoints
- [ ] Connect to bonus tracking sheet: https://docs.google.com/spreadsheets/d/1mDI3F17ElB-UwPle0VL1gKMsr-jn81p8NcfgGfabWpg/edit

## Phase 2: Horizon Metrics Integration
- [ ] Create Horizon metrics client (lib/horizon/metrics-client.ts)
- [x] Add horizon_metrics table
- [ ] Add metrics section to expert detail pages
- [ ] Sync trigger API endpoint

## Phase 3: Weekly Problem Metrics
- [ ] Create /weekly page
- [ ] Track problems created, reviewed, delivered, blocked per week
- [ ] Weekly metrics components

## Phase 4: Rippling API Integration
- [x] Create CSV import scripts (scripts/import-timecards.js, scripts/scan-timecards.js)
- [x] Add timecards table with Rippling data (Aug 2025 - Jan 2026)
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

### January 9, 2026 - Database & Timecard Infrastructure

**Summary**: Built out complete timecard import pipeline and expert tracking infrastructure.

#### Database Schema Updates (`lib/db/schema.sql`)
- Added `timecards` table for Rippling timecard data
- Added `expert_rate_history` table for tracking promotions over time
- Added `expert_bonuses` table for per-problem bonus tracking
- Added `expert_bonus_config`, `weekly_bonus_input`, `weekly_bonus_calculations` tables
- Added `horizon_metrics` table for Horizon platform data
- Added `sync_runs`, `sync_errors`, `data_conflicts` tables for error tracking
- Extended `experts` table with: `horizon_user_id`, `is_active`, `source`, `problems_completed`, `problem_bonus_earned`

#### Timecard Import Scripts
- Created `scripts/import-timecards.js` - Bulk import Rippling CSV files
- Created `scripts/scan-timecards.js` - Scan CSVs to identify unmatched names
- Name mappings: Z L → Zach Barry, Philip Garbarini → Phil Garbarini

#### Data Imported to RDS
- **11 pay periods**: Aug 2025 - Jan 2026
- **157 timecards** totaling 3,479.1 approved hours
- **Rate history**: Seeded with Aug 1, 2025 starting rates
- **Promotions**: Arielle Flynn, Ryan Diebner, Jackson Ozello, Phil Garbarini ($150 → $200 on Dec 15, 2025)
- **Problem bonuses**: 407 problems completed = $40,700 in bonuses

#### Expert Cleanup
- Fixed Horizon connections (35 experts now linked)
- Deactivated test/duplicate accounts (Will Bryan, duplicate Haylee Glen, etc.)
- Separated offshore contractors from core expert tracking

#### Spend Calculations
| Category | Amount |
|----------|--------|
| Linked expert hourly | $543,219 |
| Problem bonuses | $40,700 |
| **Linked Total** | **$583,919** |
| Unlinked contractors | $137,381 |
| **Grand Total** | **$721,300** |

#### Commit
- `1166b3b` - Add timecard import, rate history, and bonus tracking
