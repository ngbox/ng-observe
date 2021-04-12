import type { OnDestroy } from '@angular/core';
import { ChangeDetectorRef, Inject, Injectable, InjectionToken } from '@angular/core';
import { isObservable, Observable, Subscription } from 'rxjs';

export const HASH_FN = new InjectionToken<HashFn>('HASH_FN', {
  providedIn: 'root',
  factory: createHashFn,
});

// @dynamic
@Injectable()
export class ObserveService implements OnDestroy {
  private hooks = new Map<string | number, () => void>();
  private noop = () => {};

  collection: ObserveCollectionFn = (sources, options = {} as any) => {
    const sink: any = Array.isArray(sources) ? [] : {};
    const observe = this.observe(sink);

    Object.keys(sources).forEach(key => {
      const source: any = sources[key as keyof typeof sources];
      const option: any = options[key as keyof typeof options];
      observe(key, source, option);
    });

    return sink;
  };

  value: ObserveValueFn = <Value>(
    source: Observable<Value>,
    options?: ObserveValueOptions
  ): Observed<Value> => {
    const value = (null as any) as Value;
    const observed = new Observed<Value>({ value }, 'value');

    this.observe(observed)('value', source, options);

    return observed;
  };

  constructor(private cdRef: ChangeDetectorRef, @Inject(HASH_FN) private hash: HashFn) {}

  private createUniqueId(): string {
    try {
      throw new Error();
    } catch (e) {
      return String(this.hash(e.stack));
    }
  }

  private observe(sink: any): Observe {
    const fn = <Value>(
      key: string | number | symbol,
      source: Observable<Value>,
      { uniqueId = this.createUniqueId(), errorHandler = () => {} }: ObserveValueOptions = {}
    ) => {
      let subscription = new Subscription();
      const unsubscribe = () => subscription.unsubscribe();
      const complete = () => {
        (this.hooks.get(uniqueId) || this.noop)();
        this.hooks.delete(uniqueId);
      };

      complete();
      this.hooks.set(uniqueId, unsubscribe);

      // tslint:disable-next-line: deprecation
      subscription = source.subscribe({
        next: x => {
          sink[key] = x;
          this.cdRef.markForCheck();
        },
        error: errorHandler,
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
  return <ValueOrCollection extends any>(
    source: Observable<ValueOrCollection> | ObservableCollection<ValueOrCollection>
  ) => (isObservable(source) ? service.value(source) : service.collection(source));
}

type ObserveCollectionFn = <Collection>(
  source: ObservableCollection<Collection>,
  options?: ObserveCollectionOptions<Collection>
) => Collection;

type ObserveValueFn = <Value>(
  source: Observable<Value>,
  options?: ObserveValueOptions
) => Observed<Value>;

export type ObserveFn = <Source extends Observable<any> | ObservableCollection<any>>(
  source: Source,
  options?: ObserveFnOptions<Source>
) => ObserveFnReturnValue<Source>;

type Observe = <Value>(
  key: string | number | symbol,
  source: Observable<Value>,
  options?: ObserveValueOptions
) => void;

export type ObservableCollection<Collection> = Collection extends Array<infer Value>
  ? Array<Observable<Value>>
  : {
      [Key in keyof Collection]: Observable<Collection[Key]>;
    };

export type ObserveCollectionOptions<Collection> = Collection extends Array<any>
  ? Array<ObserveValueOptions>
  : {
      [Key in keyof Collection]: ObserveValueOptions;
    };

export type ObservedValues<Collection> = Collection extends Array<infer Value>
  ? Array<Observed<Value>>
  : {
      [Key in keyof Collection]: Observed<Collection[Key]>;
    };

export interface ObserveValueOptions {
  errorHandler?: (err: any) => void;
  uniqueId?: string;
}

export type ObserveFnOptions<Source> = Source extends Observable<any>
  ? ObserveValueOptions
  : Source extends ObservableCollection<infer Collection>
  ? ObserveCollectionOptions<Collection>
  : never;

export type ObserveFnReturnValue<Source> = Source extends Observable<infer Value>
  ? Observed<Value>
  : Source extends ObservableCollection<infer Collection>
  ? Collection
  : never;

export class Observed<Value> {
  private readonly collection: any;
  private readonly key: number | string;

  constructor(collection: Array<Value>, key: number);
  constructor(collection: Record<string, Value>, key: string);
  constructor(collection: Array<Value> | Record<string, Value>, key: number | string) {
    this.collection = collection;
    this.key = key;
  }

  get value(): Value {
    return this.collection[this.key];
  }

  set value(nextValue: Value) {
    this.collection[this.key] = nextValue;
  }
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

export function toValue<Value>(collection: Array<Value>, key: number): Observed<Value>;
export function toValue<Value>(collection: Record<string, Value>, key: string): Observed<Value>;
export function toValue<Value>(
  collection: Array<Value> | Record<string, Value>,
  key: number | string
): Observed<Value> {
  return new Observed<Value>(collection as any, key as any);
}

export function toValues<Collection extends any[]>(
  collection: Collection
): ObservedValues<Collection>;
export function toValues<Collection extends Record<string, any>>(
  collection: Collection
): ObservedValues<Collection>;
export function toValues<Value>(
  collection: Value[] | Record<string, Value>
): ObservedValues<Value[] | Record<string, Value>> {
  if (Array.isArray(collection)) {
    return collection.map((_, index) => new Observed(collection, index));
  }

  const values: Record<string, Observed<Value>> = {};

  for (const key in collection) {
    if (collection.hasOwnProperty(key)) {
      values[key] = new Observed(collection, key);
    }
  }

  return values;
}
