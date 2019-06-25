import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LangPage } from './lang.page';

describe('LangPage', () => {
  let component: LangPage;
  let fixture: ComponentFixture<LangPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LangPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LangPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
