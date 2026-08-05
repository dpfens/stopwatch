import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleTimerComponent } from './timer.component';

describe('SimpleTimerComponent', () => {
  let component: SimpleTimerComponent;
  let fixture: ComponentFixture<SimpleTimerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimpleTimerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SimpleTimerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
