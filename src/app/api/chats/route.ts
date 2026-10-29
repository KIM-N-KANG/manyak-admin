import { productionDataSourceError } from '@/api/data-source-guard';
import { hasAiFilters, selectAiCalls, turnBounds } from '@/fixtures/cohorts';
import { chats, deletedChats } from '@/fixtures/entities';
import {
  fixtureResponse,
  inPeriod,
  paginate,
  sortList,
  validateOptions,
} from '@/fixtures/query';
import { matchesSearch, readSearch } from '@/fixtures/search';

export function GET(request: Request) {
  const configurationError = productionDataSourceError();

  if (configurationError) return configurationError;

  return fixtureResponse(request, (q) => {
    const search = readSearch(q);

    validateOptions(q, {
      startedAs: ['GUEST', 'MEMBER'],
      turnBucket: turnBounds.map((_, i) => String(i)),
      hasFirstMessage: ['true', 'false'],
      aiFeature: [
        'chat_response',
        'choice_generation',
        'chat_image',
        'chat_compact',
      ],
      aiStatus: ['SUCCEEDED', 'FAILED', 'STARTED', 'FINISHED'],
      hasLatency: ['true', 'false'],
      deleted: ['include', 'only'],
    });

    const aiChatIds = hasAiFilters(q)
      ? new Set(selectAiCalls(q).map((call) => call.chatId))
      : null;
    const filtered = [...chats, ...deletedChats]
      .filter(
        (row) =>
          q.get('deleted') === 'include' ||
          (q.get('deleted') === 'only'
            ? row.deletedAt !== null
            : row.deletedAt === null),
      )
      .filter((c) => {
        const bounds = q.has('turnBucket')
          ? turnBounds[Number(q.get('turnBucket'))]
          : null;

        return (
          matchesSearch(
            search,
            [c.story.title, c.member?.nickname ?? ''],
            [c.chatId],
          ) &&
          (!q.get('storyId') || c.story.storyId === q.get('storyId')) &&
          (!q.get('memberId') || c.member?.memberId === q.get('memberId')) &&
          (!q.get('startedAs') || c.startedAs === q.get('startedAs')) &&
          (!bounds || (c.turnCount >= bounds[0] && c.turnCount <= bounds[1])) &&
          (!q.get('hasFirstMessage') ||
            (c.firstMessageSeconds !== null && c.firstMessageSeconds <= 900) ===
              (q.get('hasFirstMessage') === 'true')) &&
          (!aiChatIds || aiChatIds.has(c.chatId)) &&
          inPeriod(c.startedAt, q) &&
          (!q.get('turnDate') ||
            new Date(c.lastActiveAt).toLocaleDateString('sv-SE', {
              timeZone: 'Asia/Seoul',
            }) === q.get('turnDate'))
        );
      });

    const sorted = sortList(filtered, q, 'chats', (item) => item.chatId);

    return paginate(sorted, q);
  });
}
