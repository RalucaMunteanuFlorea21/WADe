import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ConditionsApiService, ConditionDetails } from '../../services/conditions-api.service';

@Component({
  selector: 'app-condition',
  standalone: true,
  imports: [CommonModule],
  template: `
    <p *ngIf="loading">Loading...</p>
    <p *ngIf="error" style="color:red">{{ error }}</p>

    <ng-container *ngIf="data">
      <h2>{{ data.name }}</h2>
      <p style="opacity:.8">{{ data.description }}</p>

      <div style="margin:12px 0;">
        <button (click)="tab='overview'">Overview</button>
        <button (click)="tab='body'">Body</button>
        <button (click)="tab='geo'">Geography</button>
      </div>

      <div *ngIf="tab==='overview'">
        <h3>Overview</h3>
        <p style="white-space:pre-line">{{ data.sections.overview }}</p>

        <h3>Symptoms</h3>
        <ul><li *ngFor="let s of data.sections.symptoms">{{ s }}</li></ul>

        <h3>Risk factors</h3>
        <ul><li *ngFor="let r of data.sections.riskFactors">{{ r }}</li></ul>

        <h3>Prevention</h3>
        <ul><li *ngFor="let p of data.sections.prevention">{{ p }}</li></ul>

        <h3>Sources</h3>
        <ul>
          <li *ngFor="let src of data.sources">
            <a *ngIf="src.url" [href]="src.url" target="_blank">{{ src.name }}</a>
            <span *ngIf="!src.url">{{ src.name }}</span>
          </li>
        </ul>
      </div>

      <div *ngIf="tab==='body'">
        <h3>Affected systems</h3>
        <ul><li *ngFor="let b of data.bodySystems">{{ b.label }}</li></ul>
      </div>

      <div *ngIf="tab==='geo'">
        <h3>Geography (MVP)</h3>
        <p>We’ll connect a map next. For now, we’ll show the backend geo response.</p>
        <pre>{{ geo | json }}</pre>
      </div>
    </ng-container>
  `,
})
export class Condition {
  tab: 'overview' | 'body' | 'geo' = 'overview';
  loading = true;
  error: string | null = null;

  data: ConditionDetails | null = null;
  geo: any = null;

  constructor(private route: ActivatedRoute, private api: ConditionsApiService) {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.getCondition(id).subscribe({
      next: (d) => {
        this.data = d;
        this.loading = false;
        // load geo in background for tab
        this.api.getGeo(id, 'RO').subscribe({ next: (g) => (this.geo = g) });
      },
      error: (e) => { this.error = e?.error?.message ?? 'Request failed'; this.loading = false; },
    });
  }
}
