import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupListDetailViewComponent } from './group-detail.component';

describe('GroupListDetailViewComponent', () => {
  let component: GroupListDetailViewComponent;
  let fixture: ComponentFixture<GroupListDetailViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupListDetailViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GroupListDetailViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
