import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConditionDetails } from '../services/conditions-api.service';

@Component({
  selector: 'app-condition-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stats-grid">
      <div class="stat-card" *ngIf="symptomsCount > 0">
        <div class="stat-icon">🩺</div>
        <div class="stat-value">{{ symptomsCount }}</div>
        <div class="stat-label">Symptoms</div>
      </div>

      <div class="stat-card" *ngIf="riskFactorsCount > 0">
        <div class="stat-icon">⚠️</div>
        <div class="stat-value">{{ riskFactorsCount }}</div>
        <div class="stat-label">Risk Factors</div>
      </div>

      <div class="stat-card" *ngIf="bodySystemsCount > 0">
        <div class="stat-icon">🫀</div>
        <div class="stat-value">{{ bodySystemsCount }}</div>
        <div class="stat-label">Body Systems</div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">📚</div>
        <div class="stat-value">{{ sourcesCount }}</div>
        <div class="stat-label">Sources</div>
      </div>
    </div>
  `,
  styles: [`
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin: 24px 0;
      animation: fadeIn 0.6s ease-out;
    }

    .stat-card {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
      transition: all 0.3s ease;
      transform: translateY(0);
      /* Lightweight CSS entry animation to replace Angular animations */
      animation: fadeIn 0.45s ease-out both;
    }

    .stat-card:nth-child(2) {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
    }

    .stat-card:nth-child(3) {
      background: linear-gradient(135deg, var(--accent) 0%, #0891b2 100%);
      box-shadow: 0 4px 12px rgba(6, 182, 212, 0.2);
    }

    .stat-card:nth-child(4) {
      background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
    }

    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(37, 99, 235, 0.3);
    }

    .stat-icon {
      font-size: 32px;
      margin-bottom: 8px;
    }

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      margin: 8px 0;
    }

    .stat-label {
      font-size: 14px;
      opacity: 0.9;
      font-weight: 500;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Stagger effect for stat cards */
    .stat-card:nth-child(1) { animation-delay: 0s; }
    .stat-card:nth-child(2) { animation-delay: 0.05s; }
    .stat-card:nth-child(3) { animation-delay: 0.1s; }
    .stat-card:nth-child(4) { animation-delay: 0.15s; }

    @media (max-width: 640px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
    }
  `]
})
export class ConditionStatsComponent implements OnInit {
  @Input() data: ConditionDetails | null = null;

  symptomsCount = 0;
  riskFactorsCount = 0;
  bodySystemsCount = 0;
  sourcesCount = 0;

  ngOnInit() {
    if (this.data) {
      this.symptomsCount = this.data.sections.symptoms?.length ?? 0;
      this.riskFactorsCount = this.data.sections.riskFactors?.length ?? 0;
      this.bodySystemsCount = this.data.bodySystems?.length ?? 0;
      this.sourcesCount = this.data.sources?.length ?? 0;
    }
  }
}
