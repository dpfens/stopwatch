import { Routes } from '@angular/router';

const appName = 'Epochron';

export const routes: Routes = [
  { 
    path: '',
    title: `Home - ${appName}`,
    loadComponent: () => import('./components/pages/home/home.component').then(m => m.HomeComponent)
  },
  { 
    path: 'stopwatch', 
    title: `Stopwatches - ${appName}`,
    loadComponent: () => import('./components/pages/stopwatch/stopwatch-list/stopwatch-list.component').then(m => m.StopwatchListComponent)
  },
  { 
    path: 'group', 
    title: `Groups - ${appName}`,
    loadComponent: () => import('./components/pages/group/group-list/group-list.component').then(m => m.GroupListComponent),
    children: [
      {
        path: '',
        title: `Groups - ${appName}`,
        loadComponent: () => import('./components/pages/group/group-overview/group-overview.component').then(m => m.GroupOverviewComponent)
      },
      {
        path: ':id',
        title: `Group - ${appName}`,
        loadComponent: () => import('./components/pages/group/group-detail/group-detail.component').then(m => m.GroupDetailComponent)
      }
    ]
  },
  { 
    path: 'settings', 
    title: `Settings - ${appName}`,
    loadComponent: () => import('./components/pages/settings/settings.component').then(m => m.SettingsComponent)
  },
  { 
    path: 'about', 
    title: `About - ${appName}`,
    loadComponent: () => import('./components/pages/about/about.component').then(m => m.AboutComponent)
  },
  {
    path: '**',
    title: `Page Not Found - ${appName}`,
    loadComponent: () => import('./components/pages/not-found/not-found.component').then(m => m.NotFoundComponent)
  }
];