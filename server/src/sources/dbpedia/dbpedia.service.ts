import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

export interface DbpediaAbstract {
  abstract: string | null;
  url: string | null;
}

@Injectable()
export class DbpediaService {
  constructor(private readonly config: ConfigService) {}

  async getAbstractByWikidataId(id: string): Promise<DbpediaAbstract> {
    const endpoint = this.config.get<string>('DBPEDIA_ENDPOINT') ?? 'https://dbpedia.org/sparql';
    const wikidataUri = `http://www.wikidata.org/entity/${id}`;

    // Find DBpedia resource that is owl:sameAs the Wikidata entity, then get dbo:abstract
    const query = `
      SELECT ?s ?abstract WHERE {
        ?s owl:sameAs <${wikidataUri}> .
        OPTIONAL { ?s dbo:abstract ?abstract . FILTER (lang(?abstract) = "en") }
      }
      LIMIT 1
    `;

    const res = await axios.get(endpoint, {
      params: { format: 'json', query },
      headers: { 'User-Agent': 'HealthScope/1.0 (student project)' },
    });

    const row = res.data.results.bindings?.[0];
    return {
      url: row?.s?.value ?? null,
      abstract: row?.abstract?.value ?? null,
    };
  }
}
