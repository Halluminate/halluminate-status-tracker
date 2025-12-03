# Expert Management Platform - Roadmap

## Feature 1: Rippling API Integration

### Goal
Replace manual Rippling data paste with live API connection for automatic time tracking sync.

### Research Needed
- [ ] Get Rippling API documentation access
- [ ] Determine authentication method (OAuth2, API key, etc.)
- [ ] Identify required API endpoints:
  - Time entries endpoint
  - Employee/contractor list endpoint
  - Pay period data endpoint

### Implementation Plan
1. **Authentication Setup**
   - Create Rippling API credentials in their developer portal
   - Store credentials securely in `.env.local`
   - Implement OAuth flow if required (may need refresh token handling)

2. **API Client Library** (`lib/rippling.ts`)
   - Create authenticated API client
   - Implement rate limiting/retry logic
   - Add error handling for API failures

3. **Data Sync Functions**
   - `fetchTimeEntries(startDate, endDate)` - Get time entries for date range
   - `fetchContractors()` - Get list of contractors with IDs
   - `syncRipplingData()` - Main sync function that:
     - Fetches current week's time entries
     - Maps Rippling employee IDs to expert names
     - Upserts time entries into database

4. **API Endpoint** (`/api/sync-rippling`)
   - POST endpoint to trigger Rippling sync
   - Return sync results (imported count, errors)

5. **UI Updates**
   - Add "Sync Rippling" button alongside "Sync from Sheets"
   - Show last sync timestamp
   - Display sync status/errors

### Environment Variables Needed
```
RIPPLING_API_KEY=
RIPPLING_API_SECRET=
RIPPLING_COMPANY_ID=
```

### Estimated Effort
- Research & Auth Setup: 2-4 hours
- API Client: 2-3 hours
- Sync Functions: 3-4 hours
- UI Updates: 1-2 hours

---

## Feature 2: Google Sheets Change History Tracking

### Goal
Track how many times each problem's status changed back and forth (e.g., from "Problem QA" back to "Problem Feedback"), indicating rework/quality issues.

### Research Needed
- [ ] Google Sheets API revision history endpoints
- [ ] Determine if cell-level change history is available or only sheet-level
- [ ] Alternative: Use Google Apps Script to log changes in real-time to a separate sheet

### Implementation Options

#### Option A: Google Sheets Revision API
The Sheets API has revision history, but it's sheet-level, not cell-level. This approach would:
1. Fetch all revisions for the sheet
2. For each revision, get the sheet data at that point
3. Compare status columns between revisions
4. Count status transitions per problem

**Pros:** No changes to the Google Sheets needed
**Cons:** API-intensive, may hit rate limits, complex diffing logic

#### Option B: Google Apps Script Logging (Recommended)
Create a Google Apps Script that:
1. Triggers on cell edit in the Status column
2. Logs changes to a "Change Log" sheet with: timestamp, problem ID, old status, new status, editor
3. Our app reads from this log sheet

**Pros:** Real-time, simple to query, includes editor info
**Cons:** Requires adding script to Google Sheets

### Implementation Plan (Option B)

1. **Google Apps Script** (add to PE and IB sheets)
   ```javascript
   function onEdit(e) {
     const sheet = e.source.getActiveSheet();
     const range = e.range;
     const col = range.getColumn();
     const statusCol = /* column number for Status */;

     if (col === statusCol) {
       const logSheet = e.source.getSheetByName('Change Log') ||
                        e.source.insertSheet('Change Log');
       logSheet.appendRow([
         new Date(),
         sheet.getRange(range.getRow(), idCol).getValue(), // Problem ID
         e.oldValue,
         e.value,
         Session.getActiveUser().getEmail()
       ]);
     }
   }
   ```

2. **Database Schema Addition**
   ```sql
   CREATE TABLE status_changes (
     id INTEGER PRIMARY KEY,
     problem_id TEXT NOT NULL,
     environment TEXT NOT NULL,
     old_status TEXT,
     new_status TEXT NOT NULL,
     changed_at DATETIME NOT NULL,
     changed_by TEXT,
     FOREIGN KEY (problem_id, environment) REFERENCES problems(problem_id, environment)
   );
   ```

3. **Sync Function** (`lib/google-sheets.ts`)
   - `syncChangeHistory()` - Fetch from "Change Log" sheet
   - Parse and store status transitions
   - Calculate "churn" metrics per problem

4. **Metrics to Calculate**
   - `status_change_count` - Total number of status changes
   - `regression_count` - Times status went "backwards" (e.g., QA → Feedback)
   - `time_in_status` - Duration spent in each status
   - `rework_indicator` - Flag for problems with high churn

5. **UI Updates**
   - Add "Churn" column to expert table (avg regressions per problem)
   - Problem detail view showing status timeline
   - Filter/sort by high-churn problems

### Status Regression Definition
Define which transitions count as "regressions":
- Problem QA → Problem Feedback (regression)
- Problem QA → Problem Writeup (regression)
- QA → Problem Feedback (regression)
- Delivered → any other status (regression)

### Environment Variables Needed
None additional (uses existing Google Sheets credentials)

### Estimated Effort
- Google Apps Script: 1-2 hours
- Database Schema: 1 hour
- Sync Function: 2-3 hours
- Metrics Calculation: 2-3 hours
- UI Updates: 3-4 hours

---

## Feature 3: Problem Difficulty from Excel (BACKLOG)

### Goal
Import problem difficulty ratings from an Excel sheet to analyze cost/effort relative to problem complexity.

### Research Needed
- [ ] Get the Excel sheet location/format
- [ ] Identify difficulty rating column(s)
- [ ] Determine how difficulty is scored (1-5 scale? categories?)

### Implementation Plan

1. **Excel Parsing** (`lib/excel.ts`)
   - Use `xlsx` npm package to parse Excel files
   - Extract problem ID and difficulty rating
   - Handle multiple difficulty dimensions if present

2. **Database Schema Addition**
   ```sql
   ALTER TABLE problems ADD COLUMN difficulty_rating INTEGER;
   ALTER TABLE problems ADD COLUMN difficulty_category TEXT;
   ```

3. **Import Function**
   - `importDifficultyRatings(filePath)` - Parse Excel and update problems
   - Match by problem ID
   - Handle missing/new problems

4. **Metrics to Add**
   - Cost per difficulty point
   - Hours per difficulty level
   - Delivery rate by difficulty

5. **UI Updates**
   - Add difficulty column to table
   - Filter by difficulty level
   - Chart: Cost vs Difficulty scatter plot

### Dependencies
```
npm install xlsx
```

### Estimated Effort
- Excel Parsing: 2-3 hours
- Database Updates: 1 hour
- Import Function: 2 hours
- UI Updates: 3-4 hours

---

## Priority Order

1. **Rippling API Integration** - High value, eliminates manual data entry
2. **Google Sheets Change History** - High value for quality insights
3. **Problem Difficulty Excel** - Nice to have, lower priority

---

## Current State Summary

### Completed Features
- [x] SQLite database with experts, problems, time_entries tables
- [x] Google Sheets API integration (PE and IB catalogs)
- [x] Manual Rippling data paste import
- [x] Expert summary dashboard with sorting
- [x] Expandable problem status breakdown per expert
- [x] Cost calculations (per assigned, per delivered)
- [x] Name aliasing and deduplication
- [x] Expert filtering (SMEs only)

### Data Sources Connected
- Google Sheets: PE Problems Catalog, IB Problems Catalog
- Rippling: Manual paste (to be replaced with API)

### Name Mappings Configured
- Rob → Robert Alward
- Jerry → Jerry Wu
- Z L → Zach Barry
- Alex → Alex Ishin
- (and others in `lib/google-sheets.ts`)

### Expert Rates
- Default: $150/hr
- Alex Ishin, Minesh Patel: $275/hr
- Zach Barry, Ryan Diebner: $200/hr

### Excluded from Dashboard
- Wington, Gorka, Wyatt, Will, Z L, Rob, Jerry (duplicates/non-SMEs)
