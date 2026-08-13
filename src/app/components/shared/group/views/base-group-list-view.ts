import { Component, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { GroupService } from '../../../../services/group/group.service';
import { StopwatchGroup } from '../../../../models/sequence/interfaces';


@Component({
  selector: 'base-group-list-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ''
})
export class BaseGroupListViewComponent {
  protected readonly service = inject(GroupService);
  instances = input.required<StopwatchGroup[]>();

  loading = this.service.isLoading;
  error = this.service.error;
}
