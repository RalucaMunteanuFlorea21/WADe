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
    riskFactors: string[];
    prevention: string[]; // might be empty
  };
  bodySystems: Array<{ id: string; label: string }>;
  sources: Array<{ name: string; url: string | null }>;
}

@Injectable({ providedIn: 'root' })
export class ConditionsApiService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  search(q: string) {
    return this.http.get<ConditionSearchItem[]>(
      `${this.base}/api/conditions/search`,
      { params: { q } }
    );
  }

  getCondition(id: string) {
    return this.http.get<ConditionDetails>(`${this.base}/api/conditions/${id}`);
  }

  getBody(id: string) {
    return this.http.get<{ id: string; bodySystems: any[] }>(`${this.base}/api/conditions/${id}/body`);
  }

  getGeo(id: string, country: string) {
    return this.http.get(`${this.base}/api/conditions/${id}/geo`, { params: { country } });
  }
}
