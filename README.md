<p align="center">
  <br />&nbsp;<br />
  <img alt="ng-observe logo" src="https://user-images.githubusercontent.com/15855540/110312130-c1431680-8015-11eb-82eb-29f792beb6bc.png" width="192" align="middle" />
</p>
<h1 align="center">
  ng-observe
  <br />&nbsp;<br />
</h1>


Angular reactivity redefined

### Why?
  - Unlike async pipe, you can use it in the component class and even in directives
  - Feels more reactive than unsubscribing on destroy (be it handled by a decorator, triggered by a subject, or done by a direct call in lifecycle hook)
  - Reduces the complexity of working with streams

### How it works
- Extracts emitted value from observables
- Triggers change detection
- Leaves no subscription behind
- Clears old subscriptions and create new ones at each execution if used in getters, setters or methods 

### Example
We can subscribe to stream with angular's `AsyncPipe` in component templates. But we can't use `AsyncPipe` in component class or directice class.
```typescript
@Component({
  template: '{{fooBar$ | async}}'
})
class DemoComponent {
  foo$ = of('foo');

  get fooBar$() {
    return foo$.pipe(map(val => val + 'bar'));
  }
}
```
With ng observe we don't need to pipe the stream.
```typescript
import { OBSERVE, OBSERVE_PROVIDER } from 'ng-observe'

@Component({
  template: '{{ fooBar }}',
  providers: [OBSERVE_PROVIDER]
})
class DemoComponent {
  foo = this.observe(of('foo'));

  get fooBar() {
    return this.foo.value + 'bar';
  }

  constuctor(@Inject(OBSERVE) private observe: ObserveFn) {}
}
```

You can see other examples at links below:
 - [Basic HTTP example](https://stackblitz.com/edit/ng-observe?file=src%2Fapp%2Fapp.ts)
 - [Using with Angular router](https://stackblitz.com/edit/ng-observe-router?file=src%2Fapp%2Fapp.ts)
 - [Using with NgRx](https://stackblitz.com/edit/ng-observe-ngrx?file=src%2Fapp%2Fapp.ts)


### API
#### OBSERVE_PROVIDER
To use ng-observe in your components and directives, add `OBSERVE_PROVIDER` to providers array in metadata.

#### ObserveFn

This function is used to extract a single stream's value.You can inject it `OBSERVE` injection token.

```typescript
import { OBSERVE, OBSERVE_PROVIDER } from 'ng-observe'

@Component({
  template: '{{foo.value}}',
  providers: [OBSERVE_PROVIDER]
})
class Component {
  foo = this.observe(of('foo'));
  
  constuctor(@Inject(OBSERVE) private observe: ObserveFn) {}
}
```
#### ObserveMapFn

This function is used to extract multiple streams' value.You can inject it `OBSERVE_MAP` injection token.

```typescript
import { OBSERVE, OBSERVE_PROVIDER } from 'ng-observe'

@Component({
  template: '{{state.foo}} {{state.bar}}',
  providers: [OBSERVE_PROVIDER]
})
class Component {
  state = this.observeMap({foo: of('foo'), bar: of('bar')});

  constuctor(@Inject(OBSERVE_MAP) private observeMap: ObserveMapFn) {}
}
```
Works with arrays too
```typescript
import { OBSERVE, OBSERVE_PROVIDER } from 'ng-observe'

@Component({
  template: '{{state[0]}} {{state[1]}}',
  providers: [OBSERVE_PROVIDER]
})
class Component {
  state = this.observeMap([of('foo'), of('bar')]);

  constuctor(@Inject(OBSERVE_MAP) private observeMap: ObserveMapFn) {}
}
```
#### ObserveService
You can use `ObserveService`'s `value` and `map` methods instead of `ObserveFn` and `ObserveMapFn`.

```typescript
import { ObserveService } from 'ng-observe'

@Component({
  template: '{{foo.value}} {{state[0]}} {{state[1]}}',
  providers: [ObserveService]
})
class Component {
  foo = this.observeService.value(of('foo'));

  state = this.observeService.map([of('foo'), of('bar')]);
  
  constuctor(private observeService: ObserveService) {}
}
```

#### Observed
`ObserveFn` infers types for you. If you want to assign observed value later, you can use `Observed` class for type annotation.
```typescript
import { OBSERVE, OBSERVE_PROVIDER, Observed } from 'ng-observe'

@Component({
  template: '{{foo.value}}',
  providers: [OBSERVE_PROVIDER]
})
class Component {
  foo: Observed<string>;
  
  constuctor(@Inject(OBSERVE) private observe: ObserveFn) {
    this.foo = this.observe(of('foo'))
  }
}
```
