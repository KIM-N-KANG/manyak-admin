import { stories } from '@/fixtures/entities';
import {
  fixtureResponse,
  inPeriod,
  paginate,
  validateOptions,
} from '@/fixtures/query';

export function GET(request: Request) {
  return fixtureResponse(request, (q) => {
    validateOptions(q, {
      scope: ['original', 'user'],
      supportingCharacterCount: ['0', '1', '2', '3', '4', '5'],
      visibility: ['PUBLIC', 'PRIVATE'],
      sort: ['latest', 'chats', 'turns'],
      moderationStatus: ['HELD', 'APPROVED'],
    });

    const filtered = stories.filter(
      (s) =>
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
    );

    filtered.sort((a, b) =>
      q.get('sort') === 'chats'
        ? b.chatCount - a.chatCount
        : q.get('sort') === 'turns'
          ? b.totalTurns - a.totalTurns
          : b.createdAt.localeCompare(a.createdAt) ||
            a.storyId.localeCompare(b.storyId),
    );

    return paginate(filtered, q, (s) => s.storyId);
  });
}
