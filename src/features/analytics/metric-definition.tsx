'use client';

import { createContext, type ReactNode, useContext } from 'react';

import { HelpTooltip } from '@/components/admin/help-tooltip';

import { metricDefinitions } from './metric-definitions-data';

export const MetricScope = createContext('');

export const definitionTitles: Record<string, Record<string, number>> = {
  acquisition: {
    '웹 DAU 평균': 0,
    '웹 DAU': 0,
    '신규 방문자': 1,
    '광고 유입 비중': 2,
    '유입 소스별 신규 방문자': 3,
    '웹 신규 가입자': 4,
    '누적 웹 신규 가입자': 4,
    '앱 신규 가입자': 5,
    '스토리라인 생성 요청': 6,
    '간편 제작 요청': 6,
    '제작 요청': 6,
    '채팅 메시지 전송': 6,
    '간편 제작 퍼널': 7,
    '상세 진입 퍼널': 8,
    '첫 유입 소스별 신규 방문자': 9,
    '커뮤니티와 SNS 게시글별 방문자': 10,
    '도달 회원': 11,
    '푸시 열람': 12,
    열람률: 13,
    'Android 누적 기기 설치 수': 14,
    '누적 기기 설치 수와 활성 기기 수': 14,
    '활성 기기 수': 15,
    '일별 기기 설치 수와 앱 삭제 수': 16,
    '일별 기기 설치 수': 16,
    '일별 앱 삭제 수': 16,
  },
  users: {
    MAU: 17,
    '마지막 날 DAU': 18,
    '일별 활성 사용자 (DAU)': 18,
    '신규 방문자': 19,
    '누적 신규 방문자': 19,
    '사용자당 채팅 메시지 전송 수': 20,
    '코호트 표': 21,
    '평균 세션 길이': 22,
    '세션 수': 23,
    '중앙값 구간': 23,
    '세션 길이 분포': 23,
    '신규 가입자': 24,
    '가입 경로': 25,
    '게스트 이관 회원': 26,
    '누적 가입자': 27,
    '가입 이벤트 기준 신규 가입자': 28,
  },
  conversion: {
    '웹 첫 접속': 29,
    '앱 첫 접속': 30,
    '간편 제작': 31,
    '상세 진입 채팅': 32,
    '게스트 한도 로그인': 33,
    '채팅 수': 34,
    '전체 채팅 수': 34,
    '게스트 채팅 수': 34,
    '회원 채팅 수': 34,
    'N턴 이상 도달률': 35,
    '게스트에서 회원으로': 36,
    '1턴 대비 도달률': 37,
    '1턴 대비 수치 표': 37,
  },
  quality: {
    '채팅 메시지 전송': 38,
    '입력 방식별 채팅 메시지 전송': 38,
    '스트림 오류 표시': 39,
    '스트림 오류율': 39,
    '오류 표시 사용자': 40,
    '이프와 초대 신호 사용자': 41,
    '간편 제작 실패율': 42,
    '채팅 수': 43,
    '페르소나 사용 채팅 수': 43,
    '모델별 채팅 수': 44,
    '모델별 비중': 44,
    '채팅 비중': 44,
    '턴 수': 45,
    '모델별 턴 수': 45,
    '턴 비중': 45,
    '페르소나 시작 클릭 비중': 46,
    '응답 저장 기준 모델별 턴 수': 47,
    '총 AI 비용': 48,
    '기능별 일별 비용': 48,
    비용: 48,
    '비용 표': 48,
    '턴당 원가': 49,
    '스토리당 원가': 50,
    '호출 수': 51,
    '입력 토큰': 51,
    '출력 토큰': 51,
    '토큰 수가 없는 호출 수': 51,
  },
};

export function definitionIndex(scope: string, title: string) {
  if (/^D\d+( 가중 평균)?$/.test(title)) return 21;

  const titles = definitionTitles[scope];

  return titles?.[title] ?? titles?.[title.replace(/ \([^)]*\)$/, '')];
}

export const noEventsHelp =
  '선택한 기간과 조건에서 이 지표의 기준 이벤트를 한 건도 받지 못했습니다. 그 행동이 없었거나 이벤트를 더 이상 보내지 않는 경우입니다.';

export function DefinitionText({ index }: { index: number }) {
  const row = metricDefinitions[index];

  return (
    <div className="space-y-2">
      {['출처', '대상', '계산', '날짜'].map((label, i) => (
        <p key={label}>
          <strong>{label}</strong>{' '}
          {row[i + 2].split('<br>').map((line, j) => (
            <span key={j}>
              {j ? <br /> : null}
              {line}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

export type MetricDefinitionTitle = string | readonly string[];

export function MetricHelp({
  title,
  definitionTitle = title,
  children,
  noEvents = false,
}: {
  title: string;
  definitionTitle?: MetricDefinitionTitle | null;
  children?: ReactNode;
  noEvents?: boolean;
}) {
  const scope = useContext(MetricScope);
  const titles =
    typeof definitionTitle === 'string'
      ? [definitionTitle]
      : (definitionTitle ?? []);
  const definitions = [
    ...new Map(
      titles.flatMap((name) => {
        const index = definitionIndex(scope, name);

        return index === undefined ? [] : [[index, name] as const];
      }),
    ).entries(),
  ];

  if (!definitions.length && !children && !noEvents) return null;

  return (
    <HelpTooltip label={`${title} 지표 정의`}>
      {definitions.map(([index, name]) => (
        <div key={index} className="space-y-2 not-first:mt-4">
          {definitions.length > 1 ? (
            <p className="font-semibold">{name}</p>
          ) : null}
          <DefinitionText index={index} />
        </div>
      ))}
      {children ? <div className="mt-2">{children}</div> : null}
      {noEvents ? <p className="mt-2">{noEventsHelp}</p> : null}
    </HelpTooltip>
  );
}

/** 이미 별도 상태가 있는 값과 비율, 평균, DB 값을 수신 없음 판정에서 뺀다. */
export function eventMetric(scope: string, title: string) {
  const index = definitionIndex(scope, title);

  return (
    (index !== undefined &&
      [0, 1, 3, 4, 5, 6, 18, 19, 28, 38, 40, 41].includes(index)) ||
    (scope === 'quality' && title === '스트림 오류 표시')
  );
}

export function allZero(values: (number | null | undefined)[]) {
  return values.length > 0 && values.every((value) => value === 0);
}
