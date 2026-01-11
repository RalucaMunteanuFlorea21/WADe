import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface BodyPart {
  name: string;
  icon: string;
  affected: boolean;
  description?: string;
}

@Component({
  selector: 'app-body-visualization',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="body-viz-container">
      <h4>Body Systems Impact</h4>
      <div class="body-grid">
        <div 
          class="body-part" 
          *ngFor="let part of bodyParts"
          [class.affected]="part.affected"
          [title]="part.description"
        >
          <div class="icon">{{ part.icon }}</div>
          <div class="name">{{ part.name }}</div>
        </div>
      </div>
      <p class="viz-note">Click on affected systems to see details</p>
    </div>
  `,
  styles: [`
    .body-viz-container {
      margin: 24px 0;
    }

    h4 {
      margin-bottom: 16px;
      color: var(--text-dark);
    }

    .body-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 12px;
      margin: 16px 0;
    }

    .body-part {
      background: var(--bg-light);
      border: 2px solid var(--border-light);
      border-radius: 8px;
      padding: 12px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      opacity: 0.6;
    }

    .body-part:hover {
      opacity: 0.8;
      transform: translateY(-2px);
    }

    .body-part.affected {
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(8, 145, 178, 0.1) 100%);
      border-color: var(--accent);
      opacity: 1;
      box-shadow: 0 4px 12px rgba(6, 182, 212, 0.2);
    }

    .body-part.affected:hover {
      box-shadow: 0 6px 16px rgba(6, 182, 212, 0.3);
      transform: translateY(-4px);
    }

    .icon {
      font-size: 32px;
      margin-bottom: 8px;
    }

    .name {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-dark);
    }

    .viz-note {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 12px;
      font-style: italic;
    }

    @media (max-width: 640px) {
      .body-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class BodyVisualizationComponent {
  @Input() affectedSystems: string[] = [];

  bodyParts: BodyPart[] = [
    { name: 'Respiratory', icon: '🫁', affected: false, description: 'Lungs & airways' },
    { name: 'Cardiovascular', icon: '❤️', affected: false, description: 'Heart & blood vessels' },
    { name: 'Nervous', icon: '🧠', affected: false, description: 'Brain & nerves' },
    { name: 'Digestive', icon: '🫔', affected: false, description: 'Stomach & intestines' },
    { name: 'Musculoskeletal', icon: '💪', affected: false, description: 'Bones & muscles' },
    { name: 'Immune', icon: '🛡️', affected: false, description: 'Immune system' },
    { name: 'Endocrine', icon: '⚗️', affected: false, description: 'Glands & hormones' },
    { name: 'Urinary', icon: '💧', affected: false, description: 'Kidneys & bladder' },
  ];

  ngOnInit() {
    // Mark affected systems
    if (this.affectedSystems && this.affectedSystems.length > 0) {
      const affectedLower = this.affectedSystems.map(s => s.toLowerCase());
      this.bodyParts = this.bodyParts.map(part => ({
        ...part,
        affected: affectedLower.some(
          a => part.name.toLowerCase().includes(a) || a.includes(part.name.toLowerCase())
        )
      }));
    }
  }
}
