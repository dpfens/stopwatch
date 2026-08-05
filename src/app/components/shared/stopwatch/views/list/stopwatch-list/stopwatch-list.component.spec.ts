import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StopwatchListComponent } from './stopwatch-list.component';

describe('StopwatchListComponent', () => {
  let component: StopwatchListComponent;
  let fixture: ComponentFixture<StopwatchListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StopwatchListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StopwatchListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
