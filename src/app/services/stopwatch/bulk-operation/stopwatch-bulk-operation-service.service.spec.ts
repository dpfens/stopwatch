import { TestBed } from '@angular/core/testing';

import { StopwatchBulkOperationServiceService } from './stopwatch-bulk-operation-service.service';

describe('StopwatchBulkOperationServiceService', () => {
  let service: StopwatchBulkOperationServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StopwatchBulkOperationServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
