import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupGridDetailViewComponent } from './group-detail.component';

describe('GroupGridDetailViewComponent', () => {
  let component: GroupGridDetailViewComponent;
  let fixture: ComponentFixture<GroupGridDetailViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupGridDetailViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GroupGridDetailViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
