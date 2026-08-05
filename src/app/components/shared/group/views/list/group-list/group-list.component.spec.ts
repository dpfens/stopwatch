import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupListViewComponent } from './group-list.component';

describe('GroupListViewComponent', () => {
  let component: GroupListViewComponent;
  let fixture: ComponentFixture<GroupListViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupListViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GroupListViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
