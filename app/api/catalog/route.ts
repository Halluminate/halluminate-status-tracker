import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface DetailedProblem {
  id: number;
  problemId: string;
  specNumber: string | null;
  environment: 'PE' | 'IB';
  status: string;
  week: number | null;
  smeName: string | null;
  feedbackName: string | null;
  qaName: string | null;
  engineerName: string | null;
  contentReviewerName: string | null;
  reviewerName: string | null;
  finalReviewerName: string | null;
  problemDoc: string | null;
  groundTruth: string | null;
  specFolder: string | null;
  specDoc: string | null;
  specDataFolder: string | null;
  dockerContainer: string | null;
  prLink: string | null;
  blockerReason: string | null;
  sonnetPassRate: number | null;
  opusPassRate: number | null;
  separateEnvironmentInit: boolean;
  taigaTag: string | null;
  explainerVideo: string | null;
  taskDescription: string | null;
  notes: string | null;
}

export async function GET() {
  try {
    const problems = await query<DetailedProblem>(`
      SELECT
        p.id,
        p.problem_id as "problemId",
        p.spec_number as "specNumber",
        p.environment,
        p.status,
        p.week,
        sme.name as "smeName",
        feedback.name as "feedbackName",
        qa.name as "qaName",
        engineer.name as "engineerName",
        content_reviewer.name as "contentReviewerName",
        reviewer.name as "reviewerName",
        final_reviewer.name as "finalReviewerName",
        p.problem_doc as "problemDoc",
        p.ground_truth as "groundTruth",
        p.spec_folder as "specFolder",
        p.spec_doc as "specDoc",
        p.spec_data_folder as "specDataFolder",
        p.docker_container as "dockerContainer",
        p.pr_link as "prLink",
        p.blocker_reason as "blockerReason",
        p.sonnet_pass_rate as "sonnetPassRate",
        p.opus_pass_rate as "opusPassRate",
        p.separate_environment_init as "separateEnvironmentInit",
        p.taiga_tag as "taigaTag",
        p.explainer_video as "explainerVideo",
        p.task_description as "taskDescription",
        p.notes
      FROM problems p
      LEFT JOIN experts sme ON p.sme_id = sme.id
      LEFT JOIN experts feedback ON p.feedback_id = feedback.id
      LEFT JOIN experts qa ON p.qa_id = qa.id
      LEFT JOIN experts engineer ON p.engineer_id = engineer.id
      LEFT JOIN experts content_reviewer ON p.content_reviewer_id = content_reviewer.id
      LEFT JOIN experts reviewer ON p.reviewer_id = reviewer.id
      LEFT JOIN experts final_reviewer ON p.final_reviewer_id = final_reviewer.id
      ORDER BY p.environment, p.spec_number, p.problem_id
    `);

    return NextResponse.json({ problems });
  } catch (error) {
    console.error('Error fetching catalog:', error);
    return NextResponse.json(
      { error: 'Failed to fetch problem catalog', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
