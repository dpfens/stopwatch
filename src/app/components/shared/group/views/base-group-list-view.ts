import { Component, inject, input } from '@angular/core';
import { GroupService } from '../../../../services/group/group.service';
import { StopwatchGroup } from '../../../../models/sequence/interfaces';


@Component({
  selector: 'base-group-list-view',
  template: ''
})
export class BaseGroupListViewComponent {
  protected readonly service = inject(GroupService);
  instances = input.required<StopwatchGroup[]>();

  loading = this.service.isLoading;
  error = this.service.error;
}
