import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Conditions } from './pages/condition/condition';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'condition/:id', component: Conditions },
  { path: '**', redirectTo: '' },
];
