import { TestBed } from '@angular/core/testing';

import { LocalApiService } from './api-local.service';

describe('LocalApiService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: LocalApiService = TestBed.get(LocalApiService);
    expect(service).toBeTruthy();
  });
});
