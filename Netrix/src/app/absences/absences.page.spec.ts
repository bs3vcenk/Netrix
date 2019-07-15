import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AbsencesPage } from './absences.page';

describe('AbsencesPage', () => {
  let component: AbsencesPage;
  let fixture: ComponentFixture<AbsencesPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AbsencesPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AbsencesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
