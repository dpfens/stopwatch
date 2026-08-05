import { Component, inject, Input, signal } from '@angular/core';
import { VisibleSplit } from '../../../models/sequence/interfaces';
import { SelectableSplitTypes } from '../../../utilities/constants';
import { TimeService } from '../../../services/time/time.service';


@Component({
  selector: 'base-split-view',
  template: '',
})
export class BaseSplitComponent {
  timeService = inject(TimeService);
  selectableSplitTypes = SelectableSplitTypes;
  abs = Math.abs;

  protected _instance = signal<VisibleSplit | undefined>(undefined);
    
  @Input({required: true}) 
  set instance(value: VisibleSplit) {
    this._instance.set(value);
  }
  
  get instance(): VisibleSplit {
    const instance = this._instance();
    if (!instance) {
      throw new Error('Instance not set');
    }
    return instance;
  }
}
