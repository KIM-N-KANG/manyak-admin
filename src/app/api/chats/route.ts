import { chats } from '@/fixtures/entities';
import {
  fixtureResponse,
  inPeriod,
  paginate,
  validateOptions,
} from '@/fixtures/query';

const turnBounds = [
  [0, 0],
  [1, 1],
  [2, 2],
  [3, 4],
  [5, 6],
  [7, 9],
  [10, 14],
  [15, 19],
  [20, 29],
  [30, 49],
  [50, Infinity],
];

export function GET(request: Request) {
  return fixtureResponse(request, (q) => {
    validateOptions(q, {
      sort: ['latest', 'turns'],
      startedAs: ['GUEST', 'MEMBER'],
      turnBucket: turnBounds.map((_, i) => String(i)),
      hasFirstMessage: ['true', 'false'],
      aiFeature: ['chat_response', 'chat_image'],
    });

    const filtered = chats.filter((c) => {
      const bounds = q.has('turnBucket')
        ? turnBounds[Number(q.get('turnBucket'))]
        : null;

      return (
        (!q.get('storyId') || c.story.storyId === q.get('storyId')) &&
        (!q.get('memberId') || c.member?.memberId === q.get('memberId')) &&
        (!q.get('startedAs') || c.startedAs === q.get('startedAs')) &&
        (!bounds || (c.turnCount >= bounds[0] && c.turnCount <= bounds[1])) &&
        (!q.get('hasFirstMessage') ||
          (c.firstMessageSeconds !== null && c.firstMessageSeconds <= 900) ===
            (q.get('hasFirstMessage') === 'true')) &&
        (!q.get('aiFeature') || c.aiFeature === q.get('aiFeature')) &&
        inPeriod(c.startedAt, q) &&
        (!q.get('turnDate') ||
          new Date(c.lastActiveAt).toLocaleDateString('sv-SE', {
            timeZone: 'Asia/Seoul',
          }) === q.get('turnDate'))
      );
    });

    filtered.sort((a, b) =>
      q.get('sort') === 'turns'
        ? b.turnCount - a.turnCount
        : b.startedAt.localeCompare(a.startedAt) ||
          a.chatId.localeCompare(b.chatId),
    );

    return paginate(filtered, q, (c) => c.chatId);
  });
}
