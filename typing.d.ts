// declare const navigator any;
// declare namespace navigator {
//   let connection: string;
// }
declare module "copy-to-clipboard";

declare module "mazey" {
  export type ThemePreference = "system" | "light" | "dark";
  export type ResolvedTheme = "light" | "dark";

  export interface PreferenceResult<T> {
    value: T;
    label: string;
  }

  export function throttle<TArgs extends unknown[], TResult>(
    fn: (...args: TArgs) => TResult,
    wait?: number,
    options?: { leading?: boolean; trailing?: boolean }
  ): (...args: TArgs) => TResult | null;

  export function genCustomConsole(prefix?: string): {
    warn: (...data: unknown[]) => void;
  };

  export function isNonEmptyArray<T>(value: T[] | unknown): value is T[];

  export function resolveThemePreference(
    storageKey: string
  ): PreferenceResult<ResolvedTheme>;

  export function setThemePreference(
    storageKey: string,
    value: ThemePreference
  ): boolean;
}

interface JQueryCollection {
  each(callback: (this: Element) => void): void;
  attr(name: string): string | undefined;
  width(value: string): void;
  height(value: string): void;
}

type JQueryStatic = (target: string | Element) => JQueryCollection;

interface Window {
  $?: JQueryStatic;
  jQuery?: JQueryStatic;
}

interface Element {
  style: CSSStyleDeclaration;
  innerText: string;
}
