import { TestBed } from '@angular/core/testing';

import { StopwatchSelectionService } from './stopwatch-selection.service';

describe('StopwatchSelectionService', () => {
  let service: StopwatchSelectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StopwatchSelectionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
