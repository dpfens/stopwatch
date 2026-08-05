import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StopwatchDetailComponent } from './stopwatch-detail.component';

describe('StopwatchDetailComponent', () => {
  let component: StopwatchDetailComponent;
  let fixture: ComponentFixture<StopwatchDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StopwatchDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StopwatchDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
