import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { GradehistoryPage } from './gradehistory.page';

describe('GradehistoryPage', () => {
  let component: GradehistoryPage;
  let fixture: ComponentFixture<GradehistoryPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GradehistoryPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(GradehistoryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
