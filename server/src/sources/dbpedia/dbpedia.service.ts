import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { dump, logger } from '../../utils/log';
import * as cheerio from 'cheerio';

export interface DbpediaAbstract {
  abstract: string | null;
  url: string | null;
}

@Injectable()
export class DbpediaService {
  private cache: Map<string, { data: DbpediaAbstract; expiresAt: number }> = new Map();
  private cacheTtlSec: number;

  constructor(private readonly config: ConfigService) {
    const ttl = Number(this.config.get<number>('DBPEDIA_CACHE_TTL'));
    this.cacheTtlSec = Number.isFinite(ttl) && ttl > 0 ? ttl : 3600; // default 1 hour
  }

  async getAbstractByWikidataId(id: string): Promise<DbpediaAbstract> {
    const endpoint = this.config.get<string>('DBPEDIA_ENDPOINT') ?? 'https://dbpedia.org/sparql';
    const wikidataUri = `http://www.wikidata.org/entity/${id}`;

    // cache check
    const cached = this.cache.get(id);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      logger('[DBpedia] cache hit for', id, cached.data);
      return cached.data;
    }
    logger('[DBpedia] cache miss for', id);

    // Find DBpedia resource that is owl:sameAs the Wikidata entity, then get dbo:abstract
    const query = `
      PREFIX dbo: <http://dbpedia.org/ontology/>
      PREFIX owl: <http://www.w3.org/2002/07/owl#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

      SELECT ?s ?abstract ?comment WHERE {
        ?s owl:sameAs <${wikidataUri}> .
        OPTIONAL { ?s dbo:abstract ?abstract . FILTER (langMatches(lang(?abstract), "en")) }
        OPTIONAL { ?s rdfs:comment ?comment . FILTER (langMatches(lang(?comment), "en")) }
      }
      LIMIT 1
    `;


    try {
      const res = await axios.get(endpoint, {
        params: { format: 'json', query },
        headers: { 'User-Agent': 'HealthScope/1.0 (student project)' },
        timeout: 30000,
      });

      logger('[DBpedia] sparql response for', id, res.data);
      const row = res.data?.results?.bindings?.[0];
      const out: DbpediaAbstract = {
      url: row?.s?.value ?? null,
      abstract: row?.abstract?.value ?? row?.comment?.value ?? null,
    };


      // DBpedia HTML pages are slow; skip fallback for now

      this.cache.set(id, { data: out, expiresAt: now + this.cacheTtlSec * 1000 });
      return out;
    } catch (err) {
      logger('[DBpedia] error fetching for', id, err);
      // graceful failure: return nulls and do not throw to keep higher-level flows resilient
      return { url: null, abstract: null };
    }
  }
}
