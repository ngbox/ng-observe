import { ChangeDetectionStrategy, Component, Injector } from '@angular/core';
import { ComponentFixture, inject, TestBed } from '@angular/core/testing';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { provideDestroyHooks } from './destroy-hooks';
import {
  injectObserveFn,
  isCollection,
  OBSERVE,
  Observed,
  ObserveFn,
  ObserveService,
  OBSERVE_PROVIDER,
  toMappedValue,
  toValue,
  toValues,
} from './ng-observe';

@Component({
  template: `{{ text.value }}`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [OBSERVE_PROVIDER],
})
export class ValueTestComponent {
  observe: ObserveFn;
  text$ = new BehaviorSubject('Foo');
  text: Observed<string>;

  constructor(public readonly injector: Injector) {
    this.observe = injector.get(OBSERVE);
    this.text = this.observe(this.text$);
  }

  setText(source?: Observable<any>): void {
    this.text = this.observe(source || this.text$);
  }
}

describe('Observe Value', () => {
  let component: ValueTestComponent;
  let fixture: ComponentFixture<ValueTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ValueTestComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ValueTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an observed value', () => {
    expect(isCollection(component.text)).toBe(false);
    expect(component.text instanceof Observed).toBe(true);
  });

  it('should unwrap observed value', () => {
    expect(component.text.value).toBe('Foo');
    expect(fixture.nativeElement.textContent).toBe('Foo');
  });

  it('should emit new value', () => {
    component.text$.next('Qux');
    fixture.detectChanges();
    expect(component.text.value).toBe('Qux');
    expect(fixture.nativeElement.textContent).toBe('Qux');
  });

  it('should not add multiple destroy hooks on repetitive assignment', () => {
    const service = component.injector.get(ObserveService);
    expect(service['hooks'].size).toBe(1);

    ['0', '1', '2', '3', '4'].forEach(value => {
      component.setText(of(value));
      fixture.detectChanges();
      expect(component.text.value).toBe(value);
      expect(fixture.nativeElement.textContent).toBe(value);
    });

    expect(service['hooks'].size).toBe(1);
  });
});

@Component({
  template: `{{ state.text }}`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [OBSERVE_PROVIDER],
})
export class CollectionTestComponent {
  observe: ObserveFn;
  text$ = new BehaviorSubject('Foo');
  text!: Observed<string>;
  state: { text: string };
  firstCharCode!: Observed<number>;
  values!: { text: Observed<string> };

  constructor(public readonly injector: Injector) {
    this.observe = injector.get(OBSERVE);
    this.state = this.observe({
      text: this.text$,
    });
    this.setTextAndValues();
  }

  setState(nextState: { text: Observable<string> }): void {
    this.state = this.observe(nextState);
    this.setTextAndValues();
  }

  private setTextAndValues(): void {
    this.values = toValues(this.state);
    this.text = toValue(this.state, 'text');
    this.firstCharCode = toMappedValue(this.state, ({ text }) => text.charCodeAt(0));
  }
}

describe('Observe Collection', () => {
  let component: CollectionTestComponent;
  let fixture: ComponentFixture<CollectionTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CollectionTestComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CollectionTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an observed collection', () => {
    expect(isCollection({})).toBe(false);
    expect(isCollection([])).toBe(false);
    expect(isCollection(component.state)).toBe(true);
    expect(component.text instanceof Observed).toBe(true);
    expect(component.values.text instanceof Observed).toBe(true);
  });

  it('should unwrap observed value', () => {
    expect(component.state.text).toBe('Foo');
    expect(component.text.value).toBe('Foo');
    expect(component.firstCharCode.value).toBe(70);
    expect(component.values.text.value).toBe('Foo');
    expect(fixture.nativeElement.textContent).toBe('Foo');
  });

  it('should emit new value', () => {
    component.text$.next('Qux');
    fixture.detectChanges();
    expect(component.state.text).toBe('Qux');
    expect(component.text.value).toBe('Qux');
    expect(component.firstCharCode.value).toBe(81);
    expect(component.values.text.value).toBe('Qux');
    expect(fixture.nativeElement.textContent).toBe('Qux');
  });

  it('should not add multiple destroy hooks on repetitive assignment', () => {
    const service = component.injector.get(ObserveService);
    expect(service['hooks'].size).toBe(1);

    ['0', '1', '2', '3', '4'].forEach(value => {
      component.setState({ text: of(value) });
      fixture.detectChanges();
      expect(component.state.text).toBe(value);
      expect(component.text.value).toBe(value);
      expect(component.firstCharCode.value).toBe(value.charCodeAt(0));
      expect(component.values.text.value).toBe(value);
      expect(fixture.nativeElement.textContent).toBe(value);
    });

    expect(service['hooks'].size).toBe(1);
  });
});

@Component({
  template: `{{ text.value }} : {{ state.text }}`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideDestroyHooks()],
})
export class InjectTestComponent {
  observe = injectObserveFn();
  text$ = new BehaviorSubject('Foo');
  text = this.observe(this.text$);
  state = this.observe({ text: this.text$ });
}

describe('injectObserveFn', () => {
  let component: InjectTestComponent;
  let fixture: ComponentFixture<InjectTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InjectTestComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InjectTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should inject observe fn', () => {
    expect(isCollection(component.state)).toBe(true);
    expect(component.text instanceof Observed).toBe(true);

    expect(component.state.text).toBe('Foo');
    expect(component.text.value).toBe('Foo');
    expect(fixture.nativeElement.textContent).toBe('Foo : Foo');

    component.text$.next('Qux');
    fixture.detectChanges();
    expect(component.state.text).toBe('Qux');
    expect(component.text.value).toBe('Qux');
    expect(fixture.nativeElement.textContent).toBe('Qux : Qux');
  });
});

// Could not find a way to test zoneless implementation yet
