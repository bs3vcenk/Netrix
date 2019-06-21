import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SubjOverviewPage } from './subj-overview.page';

describe('SubjOverviewPage', () => {
  let component: SubjOverviewPage;
  let fixture: ComponentFixture<SubjOverviewPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SubjOverviewPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SubjOverviewPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
