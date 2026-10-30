'use client';

import { useRef, useState } from 'react';

import {
  DataTable,
  NumberValue,
  PageHeading,
  QueryState,
} from '@/components/admin/data-ui';
import { HelpTooltip } from '@/components/admin/help-tooltip';
import { TableSkeleton } from '@/components/admin/loading-ui';
import { Button } from '@/components/ui/button';
import { useApi } from '@/features/shared/use-api';
import { cn } from '@/lib/utils';

import { CreditTabs } from './credit-tabs';
import { PromotionDialog } from './promotion-dialog';
import {
  type PromotionModel,
  promotionPeriod,
  promotionPrice,
  promotionStatus,
} from './promotions';

export function CreditPromotionsScreen() {
  const query = useApi<{ items: PromotionModel[] }>('/api/credits/promotions');
  const [selected, setSelected] = useState<{
    model: PromotionModel;
    action: 'set' | 'remove';
  } | null>(null);
  const trigger = useRef<HTMLElement | null>(null);

  return (
    <>
      <PageHeading
        title="프로모션"
        help={
          <HelpTooltip label="프로모션 도움말">
            프로모션 가격은 기간 동안 회원의 채팅 턴에만 적용됩니다. 게스트 체험
            한도는 바뀌지 않습니다. 라이트를 0 이프로 하면 앱과 웹에 정가
            취소선과 무료 체험 무제한으로 표시됩니다.
          </HelpTooltip>
        }
      />
      <CreditTabs value="promotions">
        <QueryState
          pending={query.isPending}
          error={query.error}
          retry={query.refetch}
          skeleton={<TableSkeleton columns={6} />}
        />
        {query.data && !query.error ? (
          <DataTable
            headers={[
              '모델',
              '정가 (이프)',
              '프로모션 가격 (이프)',
              '기간 (KST)',
              '상태',
              '동작',
            ]}
            empty={!query.data.items.length}>
            {query.data.items.map((model) => (
              <tr key={model.code}>
                <td>
                  {model.name}{' '}
                  {!model.isActive ? (
                    <span className="ml-2 rounded-sm bg-muted px-2 py-1 text-xs text-muted-foreground">
                      비활성
                    </span>
                  ) : null}
                  <div className="mt-1 font-mono text-xs text-muted-foreground">
                    {model.code}
                  </div>
                </td>
                <td>
                  <NumberValue value={model.turnCost} />
                </td>
                <td className="font-mono">{promotionPrice(model.promotion)}</td>
                <td>{promotionPeriod(model.promotion)}</td>
                <td
                  className={cn(
                    model.promotion?.status === 'ACTIVE'
                      ? 'text-primary-text'
                      : model.promotion?.status === 'ENDED'
                        ? 'text-muted-foreground'
                        : undefined,
                  )}>
                  {promotionStatus(model.promotion)}
                </td>
                <td>
                  <div className="flex gap-2">
                    {(
                      ['set', ...(model.promotion ? ['remove'] : [])] as (
                        'set' | 'remove'
                      )[]
                    ).map((action) => (
                      <Button
                        key={action}
                        variant="outline"
                        onClick={(event) => {
                          trigger.current = event.currentTarget;
                          setSelected({ model, action });
                        }}>
                        {action === 'set' ? '설정' : '해제'}
                      </Button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        ) : null}
      </CreditTabs>
      {selected ? (
        <PromotionDialog
          {...selected}
          trigger={trigger}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </>
  );
}
