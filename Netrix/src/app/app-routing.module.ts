import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: 'tabs', loadChildren: './tabs/tabs.module#TabsPageModule' },
  { path: 'subj-overview/:subjid', loadChildren: './subj-overview/subj-overview.module#SubjOverviewPageModule' },
  { path: 'login', loadChildren: './login/login.module#LoginPageModule' },
  { path: 'settings/lang', loadChildren: './settings/lang/lang.module#LangPageModule' },
  { path: 'settings/api', loadChildren: './settings/api/api.module#ApiPageModule' },
  { path: 'settings/api/data', loadChildren: './settings/api/data/data.module#DataPageModule' }
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
