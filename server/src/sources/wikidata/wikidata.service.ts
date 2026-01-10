import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

export interface WikidataConditionDetails {
  id: string;
  name: string | null;
  description: string | null;
  symptoms: string[];
  riskFactors: string[];
  bodySystems: Array<{ id: string; label: string }>;
}


@Injectable()
export class WikidataService {
  constructor(private readonly config: ConfigService) {}

  async searchCondition(q: string): Promise<Array<{ id: string; label: string; description?: string }>> {
    const endpoint = this.config.get<string>('WIKIDATA_ENDPOINT') ?? 'https://query.wikidata.org/sparql';

    const query = `
      SELECT ?item ?itemLabel ?itemDescription WHERE {
        ?item rdfs:label ?label .
        FILTER(CONTAINS(LCASE(?label), LCASE("${q}")))
        FILTER(LANG(?label) = "en")
        ?item wdt:P31/wdt:P279* wd:Q12136 .
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      LIMIT 10
    `;

    const response = await axios.get(endpoint, {
      params: { format: 'json', query },
      headers: { 'User-Agent': 'HealthScope/1.0 (student project)' },
    });

    return response.data.results.bindings.map((b: any) => ({
      id: b.item.value.split('/').pop(),
      label: b.itemLabel.value,
      description: b.itemDescription?.value,
    }));
  }

  async getConditionDetails(id: string) {
    // leave Step 3 details for next, or paste it after search works
    return { id, name: null, description: null, symptoms: [], riskFactors: [], bodySystems: [] };
  }
}
