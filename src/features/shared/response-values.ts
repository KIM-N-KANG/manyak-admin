type RecordValue = Record<string, unknown>;

function record(value: unknown): value is RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function member(value: unknown) {
  if (!record(value) || 'isAdmin' in value || typeof value.admin !== 'boolean')
    return value;

  return { ...value, isAdmin: value.admin };
}

/** OpenAPI의 boolean 이름과 Kotlin 직렬화 이름을 화면의 기존 이름으로 정규화한다. */
export function adminResponseValues(value: unknown, url: string): unknown {
  if (!record(value)) return value;

  const path = url.split('?')[0];

  if (
    path.startsWith('/api/notifications/templates/') &&
    record(value.effective)
  ) {
    const effective = value.effective;

    return 'isDefault' in effective || typeof effective.default !== 'boolean'
      ? value
      : { ...value, effective: { ...effective, isDefault: effective.default } };
  }

  const domain = path.split('/')[2];
  const relation = (
    {
      stories: 'owner',
      moderation: 'owner',
      chats: 'member',
      payments: 'member',
      'audit-logs': 'admin',
    } as Record<string, string>
  )[domain];
  const item = (entry: unknown): unknown => {
    if (!record(entry)) return entry;

    if (domain === 'members') return member(entry);

    if (!relation) return entry;

    return {
      ...entry,
      [relation]: member(entry[relation]),
      ...(Array.isArray(entry.recentChats)
        ? {
            recentChats: entry.recentChats.map((chat: RecordValue) => ({
              ...chat,
              member: member(chat.member),
            })),
          }
        : {}),
    };
  };

  return Array.isArray(value.items)
    ? { ...value, items: value.items.map(item) }
    : item(value);
}
