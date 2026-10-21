import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * clsx로 클래스명을 조합하고 tailwind-merge로 중복 Tailwind 클래스를 병합한다.
 *
 * @param inputs 병합할 클래스 값 목록(문자열, 배열, 조건부 객체 등)
 * @returns 중복이 제거된 최종 className 문자열
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
