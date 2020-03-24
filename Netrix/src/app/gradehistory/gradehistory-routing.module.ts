import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { GradeHistoryPage } from './gradehistory.page';

const routes: Routes = [
  {
    path: '',
    component: GradeHistoryPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GradeHistoryPageRoutingModule {}
