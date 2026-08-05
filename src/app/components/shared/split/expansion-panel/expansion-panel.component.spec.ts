import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SplitExpansionPanelComponent } from './expansion-panel.component';

describe('SplitExpansionPanelComponent', () => {
  let component: SplitExpansionPanelComponent;
  let fixture: ComponentFixture<SplitExpansionPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SplitExpansionPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SplitExpansionPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
