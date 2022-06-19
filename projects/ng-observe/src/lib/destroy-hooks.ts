import { inject, Injectable, InjectionToken, OnDestroy } from '@angular/core';

// @dynamic
@Injectable()
export class DestroyService implements OnDestroy {
  readonly hooks: DestroyHooks = new Map();

  ngOnDestroy() {
    this.hooks.forEach(fn => fn());
  }
}

export const DESTROY_HOOKS = new InjectionToken<DestroyHooks>('DESTROY_HOOKS');

export function injectDestroyHooks() {
  return inject(DESTROY_HOOKS);
}

export function provideDestroyHooks(useValue?: DestroyHooks) {
  return useValue
    ? [
        {
          provide: DESTROY_HOOKS,
          useValue,
        },
      ]
    : [
        DestroyService,
        {
          provide: DESTROY_HOOKS,
          useFactory: createDestroyHooks,
          deps: [DestroyService],
        },
      ];
}

export function createDestroyHooks(service: DestroyService) {
  return service.hooks;
}

export type DestroyHooks = Map<string | number | symbol, () => any>;
