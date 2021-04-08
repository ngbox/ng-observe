<p align="center">
  <br />&nbsp;<br />
  <img alt="ng-observe logo" src="https://user-images.githubusercontent.com/15855540/110312130-c1431680-8015-11eb-82eb-29f792beb6bc.png" width="192" align="middle" />
</p>
<h1 align="center">
  ng-observe
  <br />&nbsp;<br />
</h1>

Angular reactivity streamlined...

### Why?

- Unlike [AsyncPipe](https://angular.io/api/common/AsyncPipe), you can use it in component classes and even in directives.
- Feels more reactive than unsubscribing on destroy (be it handled by a decorator, triggered by a subject, or done by a direct call in the lifecycle hook).
- Reduces the complexity of working with streams.

### How it works

- Extracts emitted value from observables.
- Triggers change detection.
- Leaves no subscription behind.
- Clears old subscriptions and creates new ones at each execution if used in getters, setters or methods.

### Example

We can subscribe to a stream with the `AsyncPipe` in component templates, but we can't use it in component or directive classes.

```typescript
@Component({
  template: '{{ fooBar$ | async }}',
})
class DemoComponent {
  foo$ = of('foo');

  get fooBar$() {
    return foo$.pipe(map(val => val + 'bar'));
  }
}
```

With ng-observe, we don't need to pipe the stream.

```typescript
import { OBSERVE, OBSERVE_PROVIDER, ObserveFn } from 'ng-observe';

@Component({
  template: '{{ fooBar }}',
  providers: [OBSERVE_PROVIDER],
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

This function is used to extract a single stream's value. You can inject it via the `OBSERVE` injection token.

```typescript
import { OBSERVE, OBSERVE_PROVIDER, ObserveFn } from 'ng-observe';

@Component({
  template: '{{ foo.value }}',
  providers: [OBSERVE_PROVIDER],
})
class Component {
  foo = this.observe(of('foo'));

  constuctor(@Inject(OBSERVE) private observe: ObserveFn) {}
}
```

You can extract multiple streams' value too.

```typescript
import { OBSERVE, OBSERVE_PROVIDER, ObserveFn } from 'ng-observe';

@Component({
  template: '{{ state.foo }} {{ state.bar }}',
  providers: [OBSERVE_PROVIDER],
})
class Component {
  state = this.observe({ foo: of('foo'), bar: of('bar') });

  constuctor(@Inject(OBSERVE) private observe: ObserveFn) {}
}
```

It works with arrays as well.

```typescript
import { OBSERVE, OBSERVE_PROVIDER, ObserveFn } from 'ng-observe';

@Component({
  template: '{{ state[0] }} {{ state[1] }}',
  providers: [OBSERVE_PROVIDER],
})
class Component {
  state = this.observe([of('foo'), of('bar')]);

  constuctor(@Inject(OBSERVE) private observe: ObserveFn) {}
}
```

#### ObserveService

You can call `ObserveService`'s `value` and `collection` methods explicitly instead of `ObserveFn`. This offers a very slight (ignorable in most cases) performance improvement.

```typescript
import { ObserveService } from 'ng-observe';

@Component({
  template: '{{ foo.value }} {{ state[0] }} {{ state[1] }}',
  providers: [ObserveService],
})
class Component {
  foo = this.observe.value(of('foo'));

  state = this.observe.collection([of('foo'), of('bar')]);

  constuctor(private observe: ObserveService) {}
}
```

#### Observed

`ObserveFn` infers types for you, but if you want to assign an observed value later, you can use `Observed` class for type annotation.

```typescript
import { OBSERVE, OBSERVE_PROVIDER, Observed } from 'ng-observe';

@Component({
  template: '{{ foo.value }}',
  providers: [OBSERVE_PROVIDER],
})
class Component {
  foo: Observed<string>;

  constuctor(@Inject(OBSERVE) private observe: ObserveFn) {
    this.foo = this.observe(of('foo'));
  }
}
```
