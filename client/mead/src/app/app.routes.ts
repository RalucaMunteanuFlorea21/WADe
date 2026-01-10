import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Condition } from './pages/condition/condition';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'condition/:id', component: Condition },
  { path: '**', redirectTo: '' },
];
