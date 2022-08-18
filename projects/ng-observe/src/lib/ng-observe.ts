import {
  ChangeDetectorRef,
  inject,
  Injectable,
  InjectionToken,
  Injector,
  NgZone,
} from '@angular/core';
import { isObservable, Observable, Subscription } from 'rxjs';
import { HASH_FN, HashFn } from './hash-fn';
import { DestroyHooks, DESTROY_HOOKS } from './destroy-hooks';

const BRAND = '__ngObserve__';
const noop = () => {};

// @dynamic
@Injectable()
export class ObserveService {
  collection: ObserveCollectionFn = (sources, options = {} as any) => {
    const sink: any = Array.isArray(sources) ? [] : {};
    Object.defineProperty(sink, BRAND, {
      value: true,
      enumerable: false,
      writable: false,
    });

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
    const sink = {};

    this.observe(sink)('value', source, options);

    return toValue(sink, 'value');
  };

  protected hash: HashFn;
  protected hooks: DestroyHooks;
  protected detectChanges: () => void;

  constructor(injector: Injector) {
    this.hash = injector.get(HASH_FN);
    this.hooks = injector.get(DESTROY_HOOKS, new Map());
    const cdRef = injector.get(ChangeDetectorRef);
    const zone = injector.get(NgZone, null);

    this.detectChanges = zone ? () => cdRef.markForCheck() : () => cdRef.detectChanges();
  }

  ngOnDestroy() {
    this.hooks.forEach(fn => fn());
  }

  protected createUniqueId(key: string | number | symbol): string {
    try {
      throw new Error();
    } catch (e: any) {
      const [stack] = e.stack.split(
        'rememberChangeHistoryAndInvokeOnChangesHook' // the initial call differs from the rest
      );
      return BRAND + String(this.hash(stack + String(key)));
    }
  }

  protected observe(sink: any): Observe {
    const fn = <Value>(
      key: string | number | symbol,
      source: Observable<Value>,
      { uniqueId = this.createUniqueId(key), errorHandler = () => {} }: ObserveValueOptions = {}
    ) => {
      let subscription = new Subscription();
      const unsubscribe = () => subscription.unsubscribe();
      const complete = () => {
        (this.hooks.get(uniqueId) || noop)();
        this.hooks.delete(uniqueId);
      };

      complete();
      this.hooks.set(uniqueId, unsubscribe);

      subscription = source.subscribe({
        next: x => {
          sink[key] = x;
          this.detectChanges();
        },
        error: errorHandler,
        complete,
      });
    };

    return fn;
  }
}

export const OBSERVE = new InjectionToken<ObserveFn>('OBSERVE');

export function injectObserveFn() {
  const injector = inject(Injector);
  return observeFactory(new ObserveService(injector));
}

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
    source: Observable<ValueOrCollection> | ObservableCollection<ValueOrCollection>,
    options?: ObserveValueOptions | ObserveCollectionOptions<ValueOrCollection>
  ) =>
    isObservable(source)
      ? service.value(source, options as ObserveValueOptions)
      : service.collection(source, options as ObserveCollectionOptions<ValueOrCollection>);
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
  : { [Key in keyof Collection]: Observable<Collection[Key]> };

export type ObserveCollectionOptions<Collection> = Collection extends Array<any>
  ? Array<ObserveValueOptions>
  : { [Key in keyof Collection]?: ObserveValueOptions };

export type ObservedValues<Collection> = Collection extends Array<infer Value>
  ? Array<Observed<Value>>
  : { [Key in keyof Collection]: Observed<Collection[Key]> };

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

export class Observed<Value, Seed = unknown> {
  readonly #seed: Seed;

  readonly #getter: () => Value;

  constructor(seed: Seed, mapFn: (source: typeof seed) => Value) {
    this.#seed = seed;
    this.#getter = () => mapFn(this.#seed);
  }

  get value(): Value {
    return this.#getter();
  }
}

export function isCollection(source: any): boolean {
  return Boolean(source && source[BRAND]);
}

export function toMappedValue<Value, Seed extends Array<any> | Record<string, any>>(
  collection: Seed,
  mapFn: (source: typeof collection) => Value
): Observed<Value> {
  return new Observed(collection as any, mapFn);
}

export function toValue<Value>(collection: Array<Value>, key: number): Observed<Value>;
export function toValue<Value>(collection: Record<string, Value>, key: string): Observed<Value>;
export function toValue<Value>(
  collection: Array<Value> | Record<string, Value>,
  key: number | string
): Observed<Value> {
  return new Observed(collection as any, source => source[key]);
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
    return collection.map((_, index) => new Observed(collection, source => source[index]));
  }

  const values: Record<string, Observed<Value>> = {};

  for (const key in collection) {
    if (collection.hasOwnProperty(key)) {
      values[key] = new Observed(collection, source => source[key]);
    }
  }

  return values;
}
