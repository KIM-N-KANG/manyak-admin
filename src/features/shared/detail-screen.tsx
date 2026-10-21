'use client';

import Link from 'next/link';

import {
  DataTable,
  dateTime,
  DetailGrid,
  NumberValue,
  PageHeading,
  QueryState,
  Section,
  Status,
  TextLink,
} from '@/components/admin/data-ui';
import { Card } from '@/components/ui/card';
import type { ChatRoom } from '@/features/chats/types';
import { MemberActions } from '@/features/members/member-actions';
import type { MemberDetail } from '@/features/members/types';
import type { PaymentDetail } from '@/features/payments/types';
import { RelatedList } from '@/features/shared/list-screen';
import { useApi } from '@/features/shared/use-api';
import type { StoryDetail } from '@/features/stories/types';

function StoryContent({ story: s }: { story: StoryDetail }) {
  return (
    <>
      <Card>
        <DetailGrid
          items={[
            ['스토리 ID', s.storyId],
            ['장르', s.genre],
            ['범위', s.scope === 'original' ? '오리지널' : '사용자 제작'],
            ['공개 상태', <Status key="v" value={s.visibility} />],
            ['검수 상태', <Status key="m" value={s.moderationStatus} />],
            [
              '제작자',
              <TextLink key="o" href={`/members/${s.owner.memberId}`}>
                {s.owner.nickname}
              </TextLink>,
            ],
            ['생성 시각', dateTime(s.createdAt)],
            [
              '채팅 수',
              <TextLink key="c" href={`/chats?storyId=${s.storyId}`}>
                <NumberValue value={s.chatCount} />
              </TextLink>,
            ],
            ['총 턴 수', <NumberValue key="t" value={s.totalTurns} />],
            ['태그', s.tags.join(' · ')],
            ['입력 주변 인물 수', `${s.supportingCharacterCount}명`],
            ['설명', s.description],
          ]}
        />
      </Card>
      {s.scope === 'original' ? (
        <p className="mt-4">
          <TextLink href={`/originals/${s.storyId}`}>오리지널 관리 →</TextLink>
        </p>
      ) : null}
      <Section title="턴 유지율">
        <Card>
          <p className="mb-5 text-xs text-muted-foreground">
            전체 채팅방 중 해당 턴 이상에 도달한 채팅방 비율
          </p>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-5">
            {s.retention.map((r) => (
              <div key={r.turn}>
                <p className="text-sm text-muted-foreground">{r.turn}턴 도달</p>
                <p className="mt-2 font-mono text-2xl">
                  {(r.rate * 100).toFixed(0)}%
                </p>
                <div className="mt-3 h-1.5 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-chart-1"
                    style={{ width: `${r.rate * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Section>
      <Section title="최근 채팅방">
        <RelatedList kind="chats" scope={{ storyId: s.storyId }} />
        <div className="mt-3">
          <TextLink href={`/chats?storyId=${s.storyId}`}>
            이 스토리의 채팅방 전체 →
          </TextLink>
        </div>
      </Section>
    </>
  );
}

function MemberContent({ member: m }: { member: MemberDetail }) {
  return (
    <>
      <Card>
        <DetailGrid
          items={[
            ['회원 ID', m.memberId],
            ['상태', <Status key="s" value={m.status} />],
            ['관리자 역할', m.isAdmin ? '보유' : '없음'],
            ['가입 시각', dateTime(m.createdAt)],
            ['최근 활동', dateTime(m.lastActiveAt)],
            ['탈퇴 시각', m.deletedAt ? dateTime(m.deletedAt) : '—'],
            ['이프 잔액', <NumberValue key="b" value={m.creditBalance} />],
            ['만든 스토리', m.storyCount],
            ['채팅방', m.chatCount],
          ]}
        />
        <div className="mt-6 border-t pt-6">
          <MemberActions nickname={m.nickname} />
        </div>
      </Card>
      <Section title="이프 거래 내역">
        <DataTable
          headers={['시각', '거래 ID', '사유', '변동 이프', '거래 후 잔액']}
          empty={!m.transactions.length}>
          {m.transactions.map((t) => (
            <tr key={t.transactionId}>
              <td>{dateTime(t.createdAt)}</td>
              <td className="font-mono text-xs">{t.transactionId.slice(-8)}</td>
              <td>{t.reason}</td>
              <td>
                {t.amount > 0 ? '+' : ''}
                <NumberValue value={t.amount} />
              </td>
              <td>
                <NumberValue value={t.balanceAfter} />
              </td>
            </tr>
          ))}
        </DataTable>
      </Section>
      <Section title="결제 내역">
        <RelatedList kind="payments" scope={{ memberId: m.memberId }} />
        <p className="mt-3">
          <TextLink href={`/payments?memberId=${m.memberId}`}>
            결제 전체 →
          </TextLink>
        </p>
      </Section>
      <Section title="채팅방">
        <RelatedList kind="chats" scope={{ memberId: m.memberId }} />
        <p className="mt-3">
          <TextLink href={`/chats?memberId=${m.memberId}`}>
            채팅방 전체 →
          </TextLink>
        </p>
      </Section>
      <Section title="만든 스토리">
        <RelatedList kind="stories" scope={{ memberId: m.memberId }} />
        <p className="mt-3">
          <TextLink href={`/stories?memberId=${m.memberId}`}>
            스토리 전체 →
          </TextLink>
        </p>
      </Section>
      <Section title="출석 기록">
        <DataTable
          headers={['출석일 (KST)', '지급 이프']}
          empty={!m.attendance.length}>
          {m.attendance.map((a) => (
            <tr key={a.date}>
              <td>{a.date}</td>
              <td>
                <NumberValue value={a.creditAmount} />
              </td>
            </tr>
          ))}
        </DataTable>
      </Section>
    </>
  );
}

function PaymentContent({ payment: p }: { payment: PaymentDetail }) {
  return (
    <>
      <Card>
        <DetailGrid
          items={[
            ['주문 ID', p.orderId],
            [
              '회원',
              <TextLink key="m" href={`/members/${p.member.memberId}`}>
                {p.member.nickname}
              </TextLink>,
            ],
            ['상품 ID', p.productId],
            ['상태', <Status key="s" value={p.status} />],
            ['결제 금액', `${p.priceKrw.toLocaleString('ko-KR')}원`],
            ['적립 이프', <NumberValue key="c" value={p.creditAmount} />],
            ['결제 완료', dateTime(p.completedAt)],
            ['환불 시각', p.refundedAt ? dateTime(p.refundedAt) : '—'],
            ['회수 부족 이프', p.reversalShortfall ?? '—'],
            ['회원 첫 결제', dateTime(p.firstPaidAt)],
          ]}
        />
      </Card>
      <Section title="결제 전후 이용 변화">
        <p className="mb-4 text-sm text-muted-foreground">
          이 회원의 첫 결제 시각을 기준으로 전체 이용 기록을 나눕니다. 기간당
          평균이 아닌 누적값입니다.
        </p>
        <DataTable headers={['지표', '첫 결제 전', '첫 결제 이후']}>
          {(
            [
              ['채팅 턴', 'turns'],
              ['스토리 제작', 'stories'],
              ['이프 소비', 'creditsSpent'],
            ] as const
          ).map(([label, key]) => (
            <tr key={key}>
              <td>{label}</td>
              <td>
                <NumberValue value={p.before[key]} />
              </td>
              <td>
                <NumberValue value={p.after[key]} />
              </td>
            </tr>
          ))}
        </DataTable>
      </Section>
    </>
  );
}

function ChatContent({ chat: c }: { chat: ChatRoom }) {
  return (
    <>
      <Card>
        <DetailGrid
          items={[
            ['채팅방 ID', c.chatId],
            [
              '스토리',
              <TextLink key="s" href={`/stories/${c.story.storyId}`}>
                {c.story.title}
              </TextLink>,
            ],
            [
              '회원',
              c.member ? (
                <TextLink key="m" href={`/members/${c.member.memberId}`}>
                  {c.member.nickname}
                </TextLink>
              ) : (
                '게스트'
              ),
            ],
            ['턴 수', <NumberValue key="t" value={c.turnCount} />],
            ['시작 시각', dateTime(c.startedAt)],
            ['마지막 활동', dateTime(c.lastActiveAt)],
            ['이프 소모', <NumberValue key="c" value={c.creditsSpent} />],
            ['시작 당시', <Status key="a" value={c.startedAs} />],
          ]}
        />
      </Card>
      <p className="mt-5 text-sm text-muted-foreground">
        이 화면에서는 대화 내용을 제공하지 않습니다.
      </p>
    </>
  );
}

export function DetailScreen({
  domain,
  id,
}: {
  domain: 'stories' | 'members' | 'payments' | 'chats';
  id: string;
}) {
  const query = useApi<StoryDetail | MemberDetail | PaymentDetail | ChatRoom>(
    `/api/${domain}/${encodeURIComponent(id)}`,
  );
  const d = query.data;
  const titles = {
    stories: '스토리',
    members: '회원',
    payments: '결제',
    chats: '채팅방',
  };

  return (
    <>
      <Link
        href={`/${domain}`}
        className="mb-6 inline-block text-sm text-muted-foreground hover:underline">
        ← {titles[domain]} 목록
      </Link>
      <PageHeading
        title={
          d
            ? 'title' in d
              ? d.title
              : 'nickname' in d
                ? d.nickname
                : `${titles[domain]} 상세`
            : `${titles[domain]} 상세`
        }
        description="공개 식별자로 연결된 운영 정보를 확인하세요."
      />
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={query.refetch}
      />
      {d ? (
        domain === 'stories' ? (
          <StoryContent story={d as StoryDetail} />
        ) : domain === 'members' ? (
          <MemberContent member={d as MemberDetail} />
        ) : domain === 'payments' ? (
          <PaymentContent payment={d as PaymentDetail} />
        ) : (
          <ChatContent chat={d as ChatRoom} />
        )
      ) : null}
    </>
  );
}
