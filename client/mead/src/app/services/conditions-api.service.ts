import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface ConditionSearchItem {
  id: string;
  label: string;
  description?: string;
}

export interface ConditionDetails {
  id: string;
  name: string | null;
  description: string | null;
  sections: {
    overview: string | null;
    symptoms: string[];
    symptomsScores?: Array<{ label: string; score: number }>;
    riskFactors: string[];
    riskFactorsScores?: Array<{ label: string; score: number }>;
    prevention: string[];
  };
  bodySystems: Array<{ id: string; label: string }>;
  sources: Array<{ name: string; url: string | null }>;
  indicators?: Array<{ label: string; value: number }>;
}

@Injectable({ providedIn: 'root' })
export class ConditionsApiService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  search(q: string) {
    return this.http.get<ConditionSearchItem[]>(`${this.base}/api/conditions/search`, {
      params: { q, _t: Date.now() } as any,
    });
  }

  getCondition(id: string) {
    return this.http.get<ConditionDetails>(`${this.base}/api/conditions/${id}`, {
      params: { _t: Date.now() } as any,
    });
  }

  getGeo(id: string, country: string) {
    return this.http.get<any>(`${this.base}/api/conditions/${id}/geo`, {
      params: { country, _t: Date.now() } as any,
    });
  }
}
