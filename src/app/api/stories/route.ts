import { hasAiFilters, selectAiCalls } from '@/fixtures/cohorts';
import { chats, creationSessions, stories } from '@/fixtures/entities';
import {
  fixtureResponse,
  inPeriod,
  paginate,
  periodFor,
  sortList,
  validateOptions,
} from '@/fixtures/query';

export function GET(request: Request) {
  return fixtureResponse(request, (q) => {
    validateOptions(q, {
      scope: ['original', 'user'],
      aiFeature: ['story_creation'],
      aiStatus: ['SUCCEEDED', 'FAILED', 'STARTED', 'FINISHED'],
      hasLatency: ['true', 'false'],
      supportingCharacterCount: ['0', '1', '2', '3', '4', '5'],
      visibility: ['PUBLIC', 'PRIVATE'],
      moderationStatus: ['HELD', 'APPROVED'],
    });

    const scopedChats =
      q.has('chatFrom') || q.has('chatTo')
        ? chats.filter((c) => inPeriod(c.startedAt, periodFor(q, 'chat')))
        : null;
    const chatStoryIds = scopedChats
      ? new Set(scopedChats.map((c) => c.story.storyId))
      : null;
    const sessionStoryIds =
      q.has('creationFrom') || q.has('creationTo')
        ? new Set(
            creationSessions
              .filter((session) =>
                inPeriod(session.createdAt, periodFor(q, 'creation')),
              )
              .map((session) => session.storyId),
          )
        : null;
    const aiStoryIds = hasAiFilters(q)
      ? new Set(
          selectAiCalls(q)
            .filter((call) => call.feature === 'story_creation')
            .map((call) => call.storyId),
        )
      : null;
    const filtered = stories
      .filter(
        (s) =>
          (!chatStoryIds || chatStoryIds.has(s.storyId)) &&
          (!sessionStoryIds || sessionStoryIds.has(s.storyId)) &&
          (!aiStoryIds || aiStoryIds.has(s.storyId)) &&
          (!q.get('scope') || s.scope === q.get('scope')) &&
          (!q.get('genre') || s.genre === q.get('genre')) &&
          (!q.has('supportingCharacterCount') ||
            s.supportingCharacterCount ===
              Number(q.get('supportingCharacterCount'))) &&
          (!q.get('visibility') || s.visibility === q.get('visibility')) &&
          (!q.get('memberId') || s.owner.memberId === q.get('memberId')) &&
          (!q.get('moderationStatus') ||
            s.moderationStatus === q.get('moderationStatus')) &&
          inPeriod(s.createdAt, q),
      )
      .map((s) =>
        scopedChats
          ? {
              ...s,
              chatCount: scopedChats.filter(
                (c) => c.story.storyId === s.storyId,
              ).length,
              totalTurns: scopedChats
                .filter((c) => c.story.storyId === s.storyId)
                .reduce((sum, c) => sum + c.turnCount, 0),
            }
          : s,
      );

    const sorted = sortList(filtered, q, 'stories', (item) => item.storyId);

    return paginate(sorted, q);
  });
}
