#!/usr/bin/env python3
"""
Import legacy problem data from Excel sheets into PostgreSQL.
Cutoff date: December 20, 2024 - before this date = sheets data, after = Horizon
"""

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import os
from datetime import datetime

# Database connection
DATABASE_URL = "postgresql://statusadmin:qf577.hzsOl23RtuyjzWdfdoYmxA34nrQb@status-tracker-db.c2pcsyw2k6q5.us-east-1.rds.amazonaws.com:5432/status_tracker"

# File paths
PE_FILE = "/Users/robertalward/Downloads/PE Env - Problem Catalog (4).xlsx"
IB_FILE = "/Users/robertalward/Downloads/IB Env - Problem Catalog (3).xlsx"

# Cutoff date - problems before this come from sheets
CUTOFF_DATE = datetime(2024, 12, 20)

def get_expert_id_map(conn):
    """Get mapping of expert names to IDs"""
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM experts")
    experts = cursor.fetchall()

    # Create flexible name mapping (lowercase, handle common variations)
    name_map = {}
    for id, name in experts:
        name_lower = name.lower()
        name_map[name_lower] = id
        # Also map first name only
        first_name = name_lower.split()[0]
        if first_name not in name_map:
            name_map[first_name] = id

    return name_map

def resolve_expert_name(name, expert_map):
    """Resolve expert name to ID, return None if not found"""
    if pd.isna(name) or not name:
        return None

    name_str = str(name).strip().lower()

    # Direct match
    if name_str in expert_map:
        return expert_map[name_str]

    # First name match
    first_name = name_str.split()[0]
    if first_name in expert_map:
        return expert_map[first_name]

    # Common aliases
    aliases = {
        'rob': 'robert alward',
        'jerry': 'jerry song',
        'alex': 'alex ishin',
        'phil': 'philip garbarini',
        'zach': 'zach barry',
        'ryan': 'ryan diebner',
        'jackson': 'jackson ozello',
        'arielle': 'arielle flynn',
        'josh': 'josh miller',
        'sneh': 'sneh kumar',
        'kavi': 'kavi munjal',
        'lindsay': 'lindsay saldebar',
        'frank': 'frank mork',
        'prem': 'prem patel',
        'tyler': 'tyler patterson',
        'haylee': 'haylee glenn',
        'jack': 'jack barnett',
        'minesh': 'minesh patel',
        'jason': 'jason dotzel',
        'wyatt': 'wyatt morgan',
        'will': 'will chen',
        'justin': 'justin hwang',
    }

    if name_str in aliases:
        full_name = aliases[name_str]
        if full_name in expert_map:
            return expert_map[full_name]

    return None

def import_pe_problems(conn, expert_map):
    """Import PE problems from Excel"""
    print(f"\n=== Importing PE Problems from {PE_FILE} ===")

    df = pd.read_excel(PE_FILE, sheet_name='PE Problems Catalog')
    print(f"Found {len(df)} rows")

    cursor = conn.cursor()
    imported = 0
    skipped = 0
    errors = []

    for idx, row in df.iterrows():
        try:
            problem_id = str(row['ID']) if pd.notna(row['ID']) else None
            if not problem_id:
                skipped += 1
                continue

            # Map expert names to IDs
            sme_id = resolve_expert_name(row.get('SME'), expert_map)
            reviewer_id = resolve_expert_name(row.get('Reviewer 1'), expert_map)
            reviewer2_id = resolve_expert_name(row.get('Reviewer 2'), expert_map)
            engineer_id = resolve_expert_name(row.get('Engineer / Submitter'), expert_map)
            final_reviewer_id = resolve_expert_name(row.get('Final Reviewer'), expert_map)

            cursor.execute("""
                INSERT INTO problems (
                    problem_id, spec_number, environment, status,
                    sme_id, reviewer_id, final_reviewer_id, engineer_id,
                    week, separate_environment_init,
                    problem_doc, ground_truth, spec_folder, spec_doc, spec_data_folder,
                    docker_container, pr_link, blocker_reason,
                    sonnet_pass_rate, opus_pass_rate, explainer_video,
                    source, created_at
                ) VALUES (
                    %s, %s, 'PE', %s,
                    %s, %s, %s, %s,
                    %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s,
                    'legacy_sheets', NOW()
                )
                ON CONFLICT (problem_id, environment) DO UPDATE SET
                    spec_number = EXCLUDED.spec_number,
                    status = EXCLUDED.status,
                    sme_id = EXCLUDED.sme_id,
                    reviewer_id = EXCLUDED.reviewer_id,
                    final_reviewer_id = EXCLUDED.final_reviewer_id,
                    engineer_id = EXCLUDED.engineer_id,
                    week = EXCLUDED.week,
                    separate_environment_init = EXCLUDED.separate_environment_init,
                    problem_doc = EXCLUDED.problem_doc,
                    ground_truth = EXCLUDED.ground_truth,
                    spec_folder = EXCLUDED.spec_folder,
                    spec_doc = EXCLUDED.spec_doc,
                    spec_data_folder = EXCLUDED.spec_data_folder,
                    docker_container = EXCLUDED.docker_container,
                    pr_link = EXCLUDED.pr_link,
                    blocker_reason = EXCLUDED.blocker_reason,
                    sonnet_pass_rate = EXCLUDED.sonnet_pass_rate,
                    opus_pass_rate = EXCLUDED.opus_pass_rate,
                    explainer_video = EXCLUDED.explainer_video,
                    source = 'legacy_sheets',
                    updated_at = NOW()
            """, (
                problem_id,
                int(row['Spec #']) if pd.notna(row.get('Spec #')) else None,
                str(row['Status']) if pd.notna(row.get('Status')) else None,
                sme_id, reviewer_id, final_reviewer_id, engineer_id,
                int(row['Week']) if pd.notna(row.get('Week')) else None,
                bool(row['Separate Environment Init']) if pd.notna(row.get('Separate Environment Init')) else False,
                str(row['Problem Doc']) if pd.notna(row.get('Problem Doc')) else None,
                str(row['Problem Ground Truth']) if pd.notna(row.get('Problem Ground Truth')) else None,
                str(row['Spec Folder']) if pd.notna(row.get('Spec Folder')) else None,
                str(row['Spec Doc']) if pd.notna(row.get('Spec Doc')) else None,
                str(row['Spec Data Folder']) if pd.notna(row.get('Spec Data Folder')) else None,
                str(row['Docker Container']) if pd.notna(row.get('Docker Container')) else None,
                str(row['PR Link']) if pd.notna(row.get('PR Link')) else None,
                str(row['Blocker Reason']) if pd.notna(row.get('Blocker Reason')) else None,
                str(row['Sonnet 4.5  Pass @ 10']) if pd.notna(row.get('Sonnet 4.5  Pass @ 10')) else None,
                str(row['Opus 4.1 Pass @ 10']) if pd.notna(row.get('Opus 4.1 Pass @ 10')) else None,
                str(row['Explainer Video']) if pd.notna(row.get('Explainer Video')) else None,
            ))
            imported += 1

        except Exception as e:
            errors.append(f"Row {idx}: {str(e)}")
            skipped += 1

    conn.commit()
    print(f"Imported: {imported}, Skipped: {skipped}")
    if errors[:5]:
        print(f"First 5 errors: {errors[:5]}")

    return imported

def import_ib_problems(conn, expert_map):
    """Import IB problems from Excel"""
    print(f"\n=== Importing IB Problems from {IB_FILE} ===")

    df = pd.read_excel(IB_FILE, sheet_name='IB Problems Catalog')
    print(f"Found {len(df)} rows")

    cursor = conn.cursor()
    imported = 0
    skipped = 0
    errors = []

    for idx, row in df.iterrows():
        try:
            problem_id = str(row['ID']) if pd.notna(row['ID']) else None
            if not problem_id:
                skipped += 1
                continue

            # Map expert names to IDs
            sme_id = resolve_expert_name(row.get('SME'), expert_map)
            reviewer_id = resolve_expert_name(row.get('Reviewer 1'), expert_map)
            reviewer2_id = resolve_expert_name(row.get('Reviewer 2'), expert_map)
            engineer_id = resolve_expert_name(row.get('Engineer / Submitter'), expert_map)
            final_reviewer_id = resolve_expert_name(row.get('Final Reviewer'), expert_map)

            cursor.execute("""
                INSERT INTO problems (
                    problem_id, spec_number, environment, status,
                    sme_id, reviewer_id, final_reviewer_id, engineer_id,
                    week, separate_environment_init,
                    problem_doc, ground_truth, spec_folder, spec_doc, spec_data_folder,
                    docker_container, pr_link, blocker_reason,
                    sonnet_pass_rate, opus_pass_rate,
                    source, created_at
                ) VALUES (
                    %s, %s, 'IB', %s,
                    %s, %s, %s, %s,
                    %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s,
                    'legacy_sheets', NOW()
                )
                ON CONFLICT (problem_id, environment) DO UPDATE SET
                    spec_number = EXCLUDED.spec_number,
                    status = EXCLUDED.status,
                    sme_id = EXCLUDED.sme_id,
                    reviewer_id = EXCLUDED.reviewer_id,
                    final_reviewer_id = EXCLUDED.final_reviewer_id,
                    engineer_id = EXCLUDED.engineer_id,
                    week = EXCLUDED.week,
                    separate_environment_init = EXCLUDED.separate_environment_init,
                    problem_doc = EXCLUDED.problem_doc,
                    ground_truth = EXCLUDED.ground_truth,
                    spec_folder = EXCLUDED.spec_folder,
                    spec_doc = EXCLUDED.spec_doc,
                    spec_data_folder = EXCLUDED.spec_data_folder,
                    docker_container = EXCLUDED.docker_container,
                    pr_link = EXCLUDED.pr_link,
                    blocker_reason = EXCLUDED.blocker_reason,
                    sonnet_pass_rate = EXCLUDED.sonnet_pass_rate,
                    opus_pass_rate = EXCLUDED.opus_pass_rate,
                    source = 'legacy_sheets',
                    updated_at = NOW()
            """, (
                problem_id,
                int(row['Spec']) if pd.notna(row.get('Spec')) else None,
                str(row['Status']) if pd.notna(row.get('Status')) else None,
                sme_id, reviewer_id, final_reviewer_id, engineer_id,
                int(row['Week']) if pd.notna(row.get('Week')) else None,
                bool(row['Separate Environment Init']) if pd.notna(row.get('Separate Environment Init')) else False,
                str(row['Problem Doc']) if pd.notna(row.get('Problem Doc')) else None,
                str(row['Ground Truth']) if pd.notna(row.get('Ground Truth')) else None,
                str(row['Spec Folder']) if pd.notna(row.get('Spec Folder')) else None,
                str(row['Spec Doc']) if pd.notna(row.get('Spec Doc')) else None,
                str(row['Spec Data Folder']) if pd.notna(row.get('Spec Data Folder')) else None,
                str(row['Docker Container']) if pd.notna(row.get('Docker Container')) else None,
                str(row['PR Link']) if pd.notna(row.get('PR Link')) else None,
                str(row['Blocker Reason']) if pd.notna(row.get('Blocker Reason')) else None,
                str(row['Sonnet 4.5  Pass @ 10']) if pd.notna(row.get('Sonnet 4.5  Pass @ 10')) else None,
                str(row['Opus 4.1 Pass @ 10']) if pd.notna(row.get('Opus 4.1 Pass @ 10')) else None,
            ))
            imported += 1

        except Exception as e:
            errors.append(f"Row {idx}: {str(e)}")
            skipped += 1

    conn.commit()
    print(f"Imported: {imported}, Skipped: {skipped}")
    if errors[:5]:
        print(f"First 5 errors: {errors[:5]}")

    return imported

def main():
    print("=" * 60)
    print("Legacy Problem Import Script")
    print(f"Cutoff Date: {CUTOFF_DATE.strftime('%Y-%m-%d')}")
    print("=" * 60)

    # Connect to database
    conn = psycopg2.connect(DATABASE_URL)

    try:
        # Get expert mapping
        expert_map = get_expert_id_map(conn)
        print(f"\nLoaded {len(expert_map)} expert name mappings")

        # Import PE problems
        pe_count = import_pe_problems(conn, expert_map)

        # Import IB problems
        ib_count = import_ib_problems(conn, expert_map)

        # Summary
        print("\n" + "=" * 60)
        print("IMPORT COMPLETE")
        print(f"PE Problems: {pe_count}")
        print(f"IB Problems: {ib_count}")
        print(f"Total: {pe_count + ib_count}")
        print("=" * 60)

        # Verify
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*), source FROM problems GROUP BY source")
        results = cursor.fetchall()
        print("\nDatabase Summary:")
        for count, source in results:
            print(f"  {source}: {count} problems")

    finally:
        conn.close()

if __name__ == "__main__":
    main()
