import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: 'tabs', loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule) },
  { path: 'subj-overview/:subjid', loadChildren: () => import('./subj-overview/subj-overview.module').then(m => m.SubjOverviewPageModule) },
  { path: 'login', loadChildren: () => import('./login/login.module').then(m => m.LoginPageModule) },
  { path: 'privacy', loadChildren: () => import('./privacy/privacy.module').then(m => m.PrivacyPageModule) },
  { path: 'notif-settings', loadChildren: () => import('./notif-settings/notif-settings.module').then(m => m.NotifSettingsPageModule) },
  { path: 'error', loadChildren: () => import('./error/error.module').then(m => m.ErrorPageModule) },
  { path: 'settings', loadChildren: './settings/settings.module#SettingsPageModule' },
  { path: 'classes', loadChildren: './classes/classes.module#ClassesPageModule' },
  { path: 'gradehistory', loadChildren: './gradehistory/gradehistory.module#GradeHistoryPageModule' }
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
