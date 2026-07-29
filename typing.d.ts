// declare const navigator any;
// declare namespace navigator {
//   let connection: string;
// }
declare module "copy-to-clipboard";

declare module "mazey" {
  export function throttle<TArgs extends unknown[], TResult>(
    fn: (...args: TArgs) => TResult,
    wait?: number,
    options?: { leading?: boolean; trailing?: boolean }
  ): (...args: TArgs) => TResult | null;

  export function genCustomConsole(prefix?: string): {
    warn: (...data: unknown[]) => void;
  };

  export function isNonEmptyArray<T>(value: T[] | unknown): value is T[];
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
