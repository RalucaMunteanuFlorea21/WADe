import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ConditionsApiService, ConditionDetails } from '../../services/conditions-api.service';
import { ConditionStatsComponent } from '../../components/condition-stats';
import { BodyVisualizationComponent } from '../../components/body-visualization';
import { GeoHeatmapComponent } from '../../components/geo-heatmap';
import { DataVisualizationComponent } from '../../components/data-visualization';
import { LearningQuizComponent } from '../../components/learning-quiz';

type Tab = 'overview' | 'body' | 'geo' | 'visualizations';

@Component({
  selector: 'app-conditions',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink, 
    FormsModule,
    ConditionStatsComponent,
    BodyVisualizationComponent,
    GeoHeatmapComponent,
    DataVisualizationComponent,
    LearningQuizComponent
  ],
  templateUrl: './condition.html',
})
export class Conditions implements OnInit {
  id!: string;

  tab: Tab = 'overview';

  loadingCondition = true;
  loadingGeo = false;

  error: string | null = null;
  geoError: string | null = null;

  data: ConditionDetails | null = null;
  geo: any = null;

  country = 'RO';
  countries = ['RO', 'FR', 'DE', 'GB', 'US'];

  constructor(
    private route: ActivatedRoute,
    private api: ConditionsApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.loadCondition();
  }

  setTab(t: Tab) {
    this.tab = t;

    if (t === 'geo' && !this.geo && !this.loadingGeo) {
      this.loadGeo();
    }
  }

  loadCondition() {
    this.loadingCondition = true;
    this.error = null;

    this.api.getCondition(this.id).subscribe({
      next: (d) => {
        this.data = d;
        this.loadingCondition = false;

        // ✅ schedule update safely (prevents “update mode” assertion)
        queueMicrotask(() => this.cdr.markForCheck());
      },
      error: (e) => {
        this.error = e?.error?.message ?? e?.message ?? 'Request failed';
        this.loadingCondition = false;
        queueMicrotask(() => this.cdr.markForCheck());
      },
    });
  }

  loadGeo() {
    this.loadingGeo = true;
    this.geoError = null;

    this.api.getGeo(this.id, this.country).subscribe({
      next: (g) => {
        this.geo = g;
        this.loadingGeo = false;
        queueMicrotask(() => this.cdr.markForCheck());
      },
      error: (e) => {
        this.geoError = e?.error?.message ?? e?.message ?? 'Geo request failed';
        this.loadingGeo = false;
        queueMicrotask(() => this.cdr.markForCheck());
      },
    });
  }

  refreshGeo() {
    this.geo = null;
    this.loadGeo();
  }

  // Expose a template-safe array of affected system labels
  get affectedSystems(): string[] {
    return this.data?.bodySystems?.map(b => b.label) ?? [];
  }
}
