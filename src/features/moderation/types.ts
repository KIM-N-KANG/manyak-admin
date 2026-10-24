import type { MemberSummary, Page } from '@/features/shared/types';

export type Submission = {
  submissionId: string;
  kind: string;
  status: string;
  story: { storyId: string | null; title: string };
  owner: MemberSummary;
  issueCount: number;
  issueRules: string[];
  firstIssueReason: string | null;
  holdReason: string | null;
  errorCode: string | null;
  attempt: number;
  createdAt: string;
  decidedAt: string | null;
  heldAt: string | null;
};
export type SubmissionDetail = Submission & {
  fields: {
    title: string;
    oneLineIntro: string | null;
    description: string | null;
    protagonistName: string | null;
    genres: string[];
    visibility: string;
    characterNames: string[];
  };
  issues: { path: string; type: string; rule: string; reason: string }[];
  imageResults: {
    path: string;
    label: string;
    moderationStatus: string;
    errorCode: string | null;
  }[];
  retryCount: number;
  updatedAt: string;
};
export type SubmissionsPage = Page<Submission>;
