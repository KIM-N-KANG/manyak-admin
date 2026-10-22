import { describe, expect, it, vi } from 'vitest';

import {
  closedSidebar,
  currentSidebarGroup,
  expandedSidebar,
  navigation,
  parseSidebarState,
  saveSidebarState,
  sidebarStorageKey,
} from '@/features/navigation/sidebar-state';

describe('사이드바 펼침 상태', () => {
  for (const group of navigation)
    for (const [path] of group.items) {
      it(`${path}는 ${group.id}를 항상 펼친다`, () => {
        expect(currentSidebarGroup(path)).toBe(group.id);
        expect(expandedSidebar(path, closedSidebar)[group.id]).toBe(true);

        if (path !== '/dashboard')
          expect(currentSidebarGroup(`${path}/detail`)).toBe(group.id);
      });
    }

  it('비슷한 접두사·알 수 없는 경로는 현재 구역이 없다', () => {
    expect(currentSidebarGroup('/members-other')).toBeNull();
    expect(currentSidebarGroup('/unknown')).toBeNull();
    expect(expandedSidebar('/unknown', closedSidebar)).toEqual(closedSidebar);
  });
  it('명시한 세 구역만 저장하고 잘못된 저장값과 저장 차단을 복구한다', () => {
    const setItem = vi.fn();
    const preferences = { dashboard: true, manage: false, notifications: true };

    expect(saveSidebarState({ setItem }, preferences)).toBe(true);
    expect(setItem).toHaveBeenCalledWith(
      sidebarStorageKey,
      JSON.stringify(preferences),
    );
    expect(parseSidebarState(setItem.mock.calls[0][1])).toEqual(preferences);

    for (const raw of [null, '{', 'null', '[]', 'true'])
      expect(parseSidebarState(raw)).toEqual(closedSidebar);

    expect(
      parseSidebarState('{"manage":"true","notifications":true,"extra":true}'),
    ).toEqual({ ...closedSidebar, notifications: true });
    expect(
      saveSidebarState(
        {
          setItem: () => {
            throw new Error('blocked');
          },
        },
        preferences,
      ),
    ).toBe(false);
    expect(expandedSidebar('/members', preferences)).toEqual({
      ...preferences,
      manage: true,
    });
    expect(preferences.manage).toBe(false);
  });
});
