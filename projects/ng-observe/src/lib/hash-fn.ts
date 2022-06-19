import { inject, InjectionToken } from '@angular/core';

export const HASH_FN = new InjectionToken<HashFn>('HASH_FN', {
  providedIn: 'root',
  factory: createHashFn,
});

export function injectHashFn() {
  return inject(HASH_FN);
}

export type HashFn = (input: string) => number;

export function createHashFn(): HashFn {
  const k = 2654435761;
  const shift = Math.imul ? (n: number) => Math.imul(n, k) : (n: number) => imul(n, k);

  const hashFn = (input: string) => {
    let index = input.length;
    let hash = 0xabadcafe;

    while (index--) {
      hash = shift(hash ^ input.charCodeAt(index));
    }

    return (hash ^ (hash >>> 16)) >>> 0;
  };

  return hashFn;
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul
export function imul(a: number, b: number): number {
  b |= 0;

  let result = (a & 0x003fffff) * b;
  if (a & 0xffc00000) {
    result += ((a & 0xffc00000) * b) | 0;
  }

  return result | 0;
}
