// Type declarations for date-fns module
// This resolves the package.json exports issue with date-fns types

declare module 'date-fns' {
  export function format(date: Date | number, format: string, options?: any): string;
  export function formatDistance(date: Date | number, baseDate: Date | number, options?: any): string;
  export function formatDistanceToNow(date: Date | number, options?: any): string;
  export function formatRelative(date: Date | number, baseDate: Date | number, options?: any): string;
  export function isAfter(date: Date | number, dateToCompare: Date | number): boolean;
  export function isBefore(date: Date | number, dateToCompare: Date | number): boolean;
  export function isEqual(dateLeft: Date | number, dateRight: Date | number): boolean;
  export function parseISO(argument: string): Date;
  export function addDays(date: Date | number, amount: number): Date;
  export function addHours(date: Date | number, amount: number): Date;
  export function addMinutes(date: Date | number, amount: number): Date;
  export function subDays(date: Date | number, amount: number): Date;
  export function subHours(date: Date | number, amount: number): Date;
  export function differenceInDays(dateLeft: Date | number, dateRight: Date | number): number;
  export function differenceInHours(dateLeft: Date | number, dateRight: Date | number): number;
  export function differenceInMinutes(dateLeft: Date | number, dateRight: Date | number): number;
  export function isValid(date: any): boolean;
  export function startOfDay(date: Date | number): Date;
  export function endOfDay(date: Date | number): Date;
  export function startOfWeek(date: Date | number): Date;
  export function endOfWeek(date: Date | number): Date;
  export function startOfMonth(date: Date | number): Date;
  export function endOfMonth(date: Date | number): Date;
}