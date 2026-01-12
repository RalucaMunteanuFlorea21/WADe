import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConditionsApiService, ConditionSearchItem } from '../../services/conditions-api.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class Home {
  q = 'hypertension';
  lastQuery = '';
  results: ConditionSearchItem[] = [];
  loading = false;
  error: string | null = null;

  constructor(private api: ConditionsApiService, private cdr: ChangeDetectorRef) {}

  doSearch() {
    const query = this.q.trim();
    if (query.length < 2) {
      this.error = 'Type at least 2 characters.';
      this.cdr.detectChanges();
      return;
    }

    this.lastQuery = query;

    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();

    this.api.search(query).subscribe({
      next: (r) => {
        this.results = r ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.error = e?.error?.message ?? e?.message ?? 'Request failed';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }
}
