import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { GradeHistoryPageRoutingModule } from './gradehistory-routing.module';

import { GradeHistoryPage } from './gradehistory.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    GradeHistoryPageRoutingModule
  ],
  declarations: [GradeHistoryPage]
})
export class GradeHistoryPageModule {}
