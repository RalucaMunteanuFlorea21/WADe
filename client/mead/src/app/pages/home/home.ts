import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ConditionsApiService, ConditionSearchItem } from '../../services/conditions-api.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <h1>HealthScope</h1>

    <input [(ngModel)]="q" placeholder="Search condition (e.g., asthma)" />
    <button (click)="doSearch()">Search</button>

    <p *ngIf="loading">Loading...</p>
    <p *ngIf="error" style="color:red">{{ error }}</p>

    <ul>
      <li *ngFor="let item of results">
        <a [routerLink]="['/condition', item.id]">
          <b>{{ item.label }}</b>
        </a>
        <div style="opacity:.8">{{ item.description }}</div>
      </li>
    </ul>
  `,
})
export class Home {
  q = 'asthma';
  results: ConditionSearchItem[] = [];
  loading = false;
  error: string | null = null;

  constructor(private api: ConditionsApiService) {}

  doSearch() {
    this.loading = true;
    this.error = null;
    this.api.search(this.q).subscribe({
      next: (r) => { this.results = r; this.loading = false; },
      error: (e) => { this.error = e?.error?.message ?? 'Request failed'; this.loading = false; },
    });
  }
}
