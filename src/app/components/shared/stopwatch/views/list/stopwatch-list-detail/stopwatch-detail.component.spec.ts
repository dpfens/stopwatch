import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StopwatchListDetailViewComponent } from './stopwatch-detail.component';

describe('StopwatchListDetailViewComponent', () => {
  let component: StopwatchListDetailViewComponent;
  let fixture: ComponentFixture<StopwatchListDetailViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StopwatchListDetailViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StopwatchListDetailViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
