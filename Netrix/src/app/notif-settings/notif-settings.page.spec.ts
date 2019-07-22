import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NotifSettingsPage } from './notif-settings.page';

describe('NotifSettingsPage', () => {
  let component: NotifSettingsPage;
  let fixture: ComponentFixture<NotifSettingsPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NotifSettingsPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NotifSettingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
