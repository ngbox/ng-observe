import type { OnDestroy } from '@angular/core';
import {
  ChangeDetectorRef,
  Inject,
  Injectable,
  InjectionToken,
} from '@angular/core';
import { isObservable, Observable, Subscription } from 'rxjs';

export const HASH_FN = new InjectionToken<HashFn>('HASH_FN', {
  providedIn: 'root',
  factory: createHashFn,
});

// @dynamic
@Injectable()
export class ObserveService implements OnDestroy {
  private hooks = new Map<number, () => void>();
  private noop = () => {};

  map: ObserveMapFn = (sources, options = {} as any) => {
    type Key = keyof typeof sources;

    const sink: any = Array.isArray(sources) ? [] : {};
    const observe = this.observe(sink);

    (Object.keys(sources) as Key[]).forEach(key => {
      observe(key, sources[key], options[key]);
    }, {} as any);

    return sink;
  };

  value: ObserveValueFn = <T>(
    source: Observable<T>,
    options?: ObserveValueOptions
  ): Observed<T> => {
    const observed = new Observed<T>();

    this.observe(observed)('value', source, options);

    return observed;
  };

  constructor(
    private cdRef: ChangeDetectorRef,
    @Inject(HASH_FN) private hash: HashFn
  ) {}

  // tslint:disable-next-line: typedef
  private observe(sink: any) {
    const fn = <T>(
      key: string | number | symbol,
      source: Observable<T>,
      { uniqueId }: ObserveValueOptions = {}
    ) => {
      let subscription = new Subscription();
      const unsubscribe = () => subscription.unsubscribe();
      const complete = () => {
        (this.hooks.get(id) || this.noop)();
        this.hooks.delete(id);
      };

      let id: number;
      try {
        throw new Error();
      } catch (e) {
        id = this.hash(uniqueId || e.stack);
      }

      complete();
      this.hooks.set(id, unsubscribe);

      subscription = source.subscribe({
        next: x => {
          sink[key] = x;
          this.cdRef.markForCheck();
        },
        complete,
      });
    };

    return fn;
  }

  ngOnDestroy(): void {
    this.hooks.forEach(unsubscribe => unsubscribe());
  }
}

export const OBSERVE = new InjectionToken<ObserveFn>('OBSERVE');

export const OBSERVE_PROVIDER = [
  ObserveService,
  {
    provide: OBSERVE,
    useFactory: observeFactory,
    deps: [ObserveService],
  },
];

export function observeFactory(service: ObserveService): ObserveFn {
  return (source: Observable<any> | Observables<any>) =>
    isObservable(source) ? service.value(source) : service.map(source);
}

type ObserveMapFn = <T>(
  source: Observables<T>,
  options?: ObserveMapOptions<T>
) => T;

type ObserveValueFn = <T>(
  source: Observable<T>,
  options?: ObserveValueOptions
) => Observed<T>;

export type ObserveFn = <T, S extends Observable<T> | Observables<T>>(
  source: S,
  options?: S extends Observable<T> ? ObserveValueOptions : ObserveMapOptions<T>
) => S extends Observable<T> ? Observed<T> : T;

export type Observables<T> = {
  [K in keyof T]: Observable<T[K]>;
};

export type ObserveMapOptions<T> = {
  [K in keyof T]: ObserveValueOptions;
};

export interface ObserveValueOptions {
  uniqueId?: string;
}

export class Observed<T> {
  constructor(public readonly value?: T) {}
}

export type HashFn = (input: string) => number;

export function createHashFn(): HashFn {
  const k = 2654435761;
  const shift = Math.imul
    ? (n: number) => Math.imul(n, k)
    : (n: number) => imul(n, k);

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
