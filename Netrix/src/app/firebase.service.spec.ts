import { TestBed } from '@angular/core/testing';

import { FirebaseServiceService } from './firebase-service.service';

describe('FirebaseServiceService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: FirebaseServiceService = TestBed.get(FirebaseServiceService);
    expect(service).toBeTruthy();
  });
});
