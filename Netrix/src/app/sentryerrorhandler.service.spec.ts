import { TestBed } from '@angular/core/testing';

import { SentryerrorhandlerService } from './sentryerrorhandler.service';

describe('SentryerrorhandlerService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: SentryerrorhandlerService = TestBed.get(SentryerrorhandlerService);
    expect(service).toBeTruthy();
  });
});
