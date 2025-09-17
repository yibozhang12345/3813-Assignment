import { TestBed } from '@angular/core/testing';

import { Prod } from './prod';

describe('Prod', () => {
  let service: Prod;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Prod);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
