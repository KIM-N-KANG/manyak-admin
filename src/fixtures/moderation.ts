import type { SubmissionDetail } from '@/features/moderation/types';
import { members, stories } from '@/fixtures/entities';

function initial(): SubmissionDetail[] {
  return Array.from({ length: 41 }, (_, index) => {
    const status = ['REJECTED', 'HELD', 'FAILED', 'PENDING', 'APPROVED'][
      index % 5
    ];
    const source = members[index % members.length];
    const owner = {
      memberId: source.memberId,
      nickname: source.nickname,
      status: source.status,
      isAdmin: source.isAdmin,
      createdAt: source.createdAt,
    };
    const createdAt = new Date(
      Date.UTC(2026, 9, 21, 1, 0, -index),
    ).toISOString();
    const issues =
      status === 'REJECTED'
        ? [
            {
              path: 'storySettings.worldSetting',
              type: 'TEXT',
              rule: 'EXTREME_GORE',
              reason: '신체 훼손을 상세히 묘사합니다.',
            },
            {
              path: 'characters[1].images[0].imageUrl',
              type: 'IMAGE',
              rule: 'NEW_RULE',
              reason: '추가 위반 사유입니다.',
            },
          ]
        : [];

    return {
      submissionId: `f1e2d3c4-b5a6-4978-8a9b-${String(index + 1).padStart(12, '0')}`,
      kind: index % 2 ? 'UPDATE' : 'CREATE',
      status,
      story: {
        storyId:
          index % 2 || status === 'APPROVED'
            ? stories[index % stories.length].storyId
            : null,
        title: `검수 제출 ${index + 1}`,
      },
      owner,
      issueCount: issues.length,
      issueRules: [...new Set(issues.map((issue) => issue.rule))],
      firstIssueReason: issues[0]?.reason ?? null,
      holdReason: status === 'HELD' ? 'MODERATION_UNAVAILABLE' : null,
      errorCode: status === 'FAILED' ? 'IMAGE_INVALID' : null,
      attempt: 3,
      createdAt,
      decidedAt: ['APPROVED', 'REJECTED', 'FAILED'].includes(status)
        ? createdAt
        : null,
      heldAt: status === 'HELD' ? createdAt : null,
      fields: {
        title: `검수 제출 ${index + 1}`,
        oneLineIntro: '한 줄 소개 예시',
        description: '소개 예시',
        protagonistName: '서린',
        genres: ['판타지', '미스터리'],
        visibility: 'PRIVATE',
        characterNames: ['도윤', '서하'],
      },
      issues,
      imageResults: [
        {
          path: 'thumbnailUrl',
          label: '표지',
          moderationStatus: 'APPROVED',
          errorCode: null,
        },
        {
          path: 'characters[0].images[0]',
          label: '인물 1 이미지 1',
          moderationStatus: 'REJECTED',
          errorCode: null,
        },
        {
          path: 'characters[0].images[1]',
          label: '인물 1 이미지 2',
          moderationStatus: 'ERROR',
          errorCode: 'IMAGE_UNREADABLE',
        },
        {
          path: 'characters[0].images[2]',
          label: '인물 1 이미지 3',
          moderationStatus: 'PENDING',
          errorCode: null,
        },
      ],
      retryCount: 2,
      updatedAt: createdAt,
    };
  });
}

const fixtureGlobal = globalThis as typeof globalThis & {
  manyakModerationFixture?: SubmissionDetail[];
};

export const moderationRows = () =>
  (fixtureGlobal.manyakModerationFixture ??= initial());
export function resetModerationFixture() {
  fixtureGlobal.manyakModerationFixture = initial();
}
