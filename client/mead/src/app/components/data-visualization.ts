import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-data-visualization',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="viz-container">
      <h4>Condition Overview</h4>

      <div class="chart-grid">
        <!-- Symptoms chart -->
        <div class="chart-card" *ngIf="symptomsData.length > 0">
          <h5>Top Symptoms</h5>
          <div class="bar-chart">
            <div class="bar-row" *ngFor="let symptom of symptomsData; let i = index">
              <div class="bar-label">{{ symptom.label }}</div>
              <div
                class="bar"
                [style.width]="symptomsWidths[i] + '%'"
                title="{{ symptom.score }}%"
              ></div>
            </div>
          </div>
        </div>

        <!-- Risk Factors chart -->
        <div class="chart-card" *ngIf="riskFactorsData.length > 0">
          <h5>Risk Factors</h5>
          <div class="risk-matrix">
            <div class="risk-item" *ngFor="let factor of riskFactorsData; let i = index">
              <div class="risk-label">{{ factor.label }}</div>
              <div class="risk-bar">
                <div class="risk-fill" [style.width]="riskWidths[i] + '%'"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Data comparison -->
      <div class="comparison-section" *ngIf="symptomsData.length > 0 || riskFactorsData.length > 0">
        <h5>Prevalence Indicators</h5>
        <div class="indicators">
          <div class="indicator" *ngFor="let ind of indicatorsToShow">
            <div class="indicator-value">{{ ind.value }}%</div>
            <div class="indicator-label">{{ ind.label }}</div>
            <div class="indicator-bar">
              <div
                class="indicator-fill"
                [style.width]="ind.value + '%'"
                title="{{ ind.value }}%"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .viz-container {
        margin: 24px 0;
      }

      h4,
      h5 {
        margin-bottom: 16px;
        color: var(--text-dark);
      }

      .chart-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }

      .chart-card {
        background: var(--bg-light);
        padding: 16px;
        border-radius: 8px;
        border-left: 4px solid var(--primary);
      }

      .bar-chart {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .bar-row {
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideInLeft 0.4s ease-out;
      }

      .bar-label {
        min-width: 100px;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-muted);
      }

      .bar {
        height: 24px;
        background: linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%);
        border-radius: 4px;
        transition: all 0.3s ease;
      }

      .bar:hover {
        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
      }

      .risk-matrix {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .risk-item {
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideInLeft 0.4s ease-out;
      }

      .risk-label {
        min-width: 80px;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-dark);
      }

      .risk-bar {
        flex: 1;
        height: 20px;
        background: rgba(245, 158, 11, 0.1);
        border-radius: 4px;
        overflow: hidden;
      }

      .risk-fill {
        height: 100%;
        background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
        transition: all 0.3s ease;
      }

      .comparison-section {
        background: linear-gradient(
          135deg,
          rgba(37, 99, 235, 0.05) 0%,
          rgba(139, 92, 246, 0.05) 100%
        );
        padding: 20px;
        border-radius: 8px;
        border-left: 4px solid var(--accent);
      }

      .indicators {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 16px;
        margin-top: 12px;
      }

      .indicator {
        background: white;
        padding: 12px;
        border-radius: 6px;
        animation: fadeIn 0.4s ease-out;
      }

      .indicator-value {
        font-size: 24px;
        font-weight: 700;
        color: var(--primary);
        margin-bottom: 4px;
      }

      .indicator-label {
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 8px;
      }

      .indicator-bar {
        height: 6px;
        background: var(--border-light);
        border-radius: 3px;
        overflow: hidden;
      }

      .indicator-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--accent) 0%, #0891b2 100%);
        transition: all 0.4s ease;
      }

      @keyframes slideInLeft {
        from {
          opacity: 0;
          transform: translateX(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @media (max-width: 640px) {
        .chart-grid {
          grid-template-columns: 1fr;
        }

        .indicators {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class DataVisualizationComponent implements OnInit {
  @Input() symptoms: any[] = [];
  @Input() riskFactors: any[] = [];

  // normalized arrays of { label, score }
  symptomsData: Array<{ label: string; score: number }> = [];
  riskFactorsData: Array<{ label: string; score: number }> = [];
  symptomsWidths: number[] = [];
  riskWidths: number[] = [];
  @Input() indicators: Array<{ label: string; value: number }> | undefined = [];

  // indicatorsToShow: prefer input from server, fallback to local defaults
  private localIndicators = [
    { label: 'Prevalence', value: 65 },
    { label: 'Severity', value: 72 },
    { label: 'Impact', value: 58 },
    { label: 'Treatment Options', value: 80 },
  ];

  get indicatorsToShow(): Array<{ label: string; value: number }> {
    return Array.isArray(this.indicators) && this.indicators.length
      ? this.indicators
      : this.localIndicators;
  }

  Math = Math;

  ngOnInit() {
    this.updateFromInputs();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['symptoms'] || changes['riskFactors']) {
      this.updateFromInputs();
    }
  }

  private updateFromInputs() {
    this.symptomsData = this.normalizeList(this.symptoms).slice(0, 5);
    this.riskFactorsData = this.normalizeList(this.riskFactors).slice(0, 5);

    this.symptomsWidths = this.symptomsData.map((s) => this.clamp(s.score, 5, 95));
    this.riskWidths = this.riskFactorsData.map((r) => this.clamp(r.score, 5, 95));
  }

  private normalizeList(arr: any[]): Array<{ label: string; score: number }> {
    const out: Array<{ label: string; score: number }> = [];
    if (!Array.isArray(arr)) return out;

    for (let i = 0; i < arr.length; i++) {
      const it = arr[i];
      if (!it) continue;
      if (typeof it === 'string') {
        // deterministic pseudo-score from label length and index
        const base = Math.min(80, (it.length % 60) + i * 2);
        out.push({ label: it, score: Math.round(20 + base) });
      } else if (typeof it === 'object' && it.label) {
        const score =
          typeof it.score === 'number' ? it.score : typeof it.value === 'number' ? it.value : 50;
        out.push({ label: it.label, score: Math.round(score) });
      } else {
        out.push({ label: String(it), score: 50 });
      }
    }

    // sort by score desc
    return out.sort((a, b) => b.score - a.score);
  }

  private clamp(v: number, a = 0, b = 100) {
    return Math.max(a, Math.min(b, Math.round(v)));
  }
}
