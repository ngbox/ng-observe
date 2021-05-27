<p align="center">
  <br />&nbsp;<br />
  <img alt="ng-observe logo" src="https://user-images.githubusercontent.com/34455572/115234990-54499300-a122-11eb-84ae-30640268fded.png" width="192" align="middle" />
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
- Works in zoneless apps. (v1.1.0+)

### How it works

- Extracts emitted value from observables.
- Marks the component for change detection.
- Leaves no subscription behind.
- Clears old subscriptions and creates new ones at each execution if used in getters, setters or methods.

### How to use

Install the package, and you are good to go. No module import is necessary.

```
npm install ng-observe
```

...or...

```
yarn add ng-observe
```

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

  constructor(@Inject(OBSERVE) private observe: ObserveFn) {}
}
```

You can see other examples at links below:

- [Basic example](https://stackblitz.com/edit/ng-observe?file=src%2Fapp%2Fapp.ts)
- [Using with Angular router](https://stackblitz.com/edit/ng-observe-router?file=src%2Fapp%2Fapp.ts)
- [Using with NgRx](https://stackblitz.com/edit/ng-observe-ngrx?file=src%2Fapp%2Fapp.ts)
- [Zoneless](https://stackblitz.com/edit/ng-observe-zoneless?file=src%2Fapp%2Fapp.ts)

> **Important Note:** Do not destructure a collection created by the `ObserveFn`. Otherwise, the reactivity will be lost. Use `toValue` or `toValues` to convert elements of the collection to instances of `Observed` instead.

You can read [this Medium article](https://ozak.medium.com/angular-reactivity-streamlined-831754b60a11) to learn about what the motivation behind ng-observe is.

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

  constructor(@Inject(OBSERVE) private observe: ObserveFn) {}
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

  constructor(@Inject(OBSERVE) private observe: ObserveFn) {}
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

  constructor(@Inject(OBSERVE) private observe: ObserveFn) {}
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

  constructor(private observe: ObserveService) {}
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

  constructor(@Inject(OBSERVE) private observe: ObserveFn) {
    this.foo = this.observe(of('foo'));
  }
}
```

#### toValue

`toValue` converts an element in the collection to a reactive observed value. Returns an instance of the `Observed` class.

```typescript
import { OBSERVE, OBSERVE_PROVIDER, Observed, ObserveFn, toValue } from 'ng-observe';

@Component({
  template: '{{ foo.value }} {{ bar.value }}',
  providers: [OBSERVE_PROVIDER],
})
class Component {
  foo: Observed<string>;

  bar: Observed<string>;

  constructor(@Inject(OBSERVE) private observe: ObserveFn) {
    const state = this.observe({ foo: of('foo'), bar: of('bar') });
    this.foo = toValue(state, 'foo');
    this.bar = toValue(state, 'bar');
  }
}
```

#### toMappedValue

You can use `toMappedValue` to get a reactive observed value mapped from the collection. Returns an instance of the `Observed` class.

```typescript
import { OBSERVE, OBSERVE_PROVIDER, Observed, ObserveFn, toMappedValue } from 'ng-observe';

@Component({
  template: '{{ fooBar.value }}',
  providers: [OBSERVE_PROVIDER],
})
class Component {
  fooBar: Observed<string>;

  constructor(@Inject(OBSERVE) private observe: ObserveFn) {
    const state = this.observe({ foo: of('foo'), bar: of('bar') });
    this.fooBar = toMappedValue(state, ({ foo, bar }) => `${foo} ${bar}`);
  }
}
```

#### toValues

`toValues` converts all elements in collection to reactive observed values. Returns an array/object the indices/keys of which will be the same with the input collection. Each element will be an instance of the `Observed` class.

```typescript
import { OBSERVE, OBSERVE_PROVIDER, Observed, ObserveFn, toValues } from 'ng-observe';

@Component({
  template: '{{ foo.value }} {{ bar.value }}',
  providers: [OBSERVE_PROVIDER],
})
class Component {
  foo: Observed<string>;

  bar: Observed<string>;

  constructor(@Inject(OBSERVE) private observe: ObserveFn) {
    const state = this.observe({ foo: of('foo'), bar: of('bar') });
    const { foo, bar } = toValues(state);
    this.foo = foo;
    this.bar = bar;
  }
}
```

#### isCollection

Collections observed by ng-observe are plain arrays or objects, but you can detect them with `isCollection` function. It returns `true` when input is an observed collection, and `false` when not.

```typescript
import { isCollection, OBSERVE, OBSERVE_PROVIDER, ObserveFn } from 'ng-observe';

@Component({
  template: '<!-- not important for this example -->',
  providers: [OBSERVE_PROVIDER],
})
class Component {
  constructor(@Inject(OBSERVE) private observe: ObserveFn) {
    const state = this.observe({ foo: of('foo'), bar: of('bar') });
    console.log(isCollection(state)); // true
  }
}
```

### Sponsors

[![volosoft](https://user-images.githubusercontent.com/34455572/115241777-dc7f6680-a129-11eb-8318-4f3c811547e8.png)](https://volosoft.com/)

<hr />

<p align="center">
  <img width="255" src="https://user-images.githubusercontent.com/34455572/115242872-f8373c80-a12a-11eb-9b52-f3b75bd2f61e.png" alt="Developed by NG Box" />
</p>
