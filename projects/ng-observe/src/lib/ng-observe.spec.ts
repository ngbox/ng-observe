import { ChangeDetectionStrategy, Component, Injector } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, Observable, of } from 'rxjs';
import {
  OBSERVE,
  Observed,
  ObserveFn,
  ObserveService,
  OBSERVE_PROVIDER,
} from './ng-observe';

@Component({
  template: `{{ text.value }}`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [OBSERVE_PROVIDER],
})
export class ValueTestComponent {
  observe: ObserveFn;
  text: Observed<string>;
  text$ = new BehaviorSubject('Foo');

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
  state: {
    text: string;
  };
  text$ = new BehaviorSubject('Foo');

  constructor(public readonly injector: Injector) {
    this.observe = injector.get(OBSERVE);
    this.state = this.observe({
      text: this.text$,
    });
  }

  setText(source?: Observable<any>): void {
    this.state = this.observe({
      text: source || this.text$,
    });
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

  it('should unwrap observed value', () => {
    expect(component.state.text).toBe('Foo');
    expect(fixture.nativeElement.textContent).toBe('Foo');
  });

  it('should emit new value', () => {
    component.text$.next('Qux');
    fixture.detectChanges();
    expect(component.state.text).toBe('Qux');
    expect(fixture.nativeElement.textContent).toBe('Qux');
  });

  it('should not add multiple destroy hooks on repetitive assignment', () => {
    const service = component.injector.get(ObserveService);
    expect(service['hooks'].size).toBe(1);

    ['0', '1', '2', '3', '4'].forEach(value => {
      component.setText(of(value));
      fixture.detectChanges();
      expect(component.state.text).toBe(value);
      expect(fixture.nativeElement.textContent).toBe(value);
    });

    expect(service['hooks'].size).toBe(1);
  });
});
