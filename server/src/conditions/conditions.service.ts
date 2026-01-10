import { BadRequestException, Injectable } from '@nestjs/common';
import { WikidataService, WikidataConditionDetails } from '../sources/wikidata/wikidata.service';
import { DbpediaService } from '../sources/dbpedia/dbpedia.service';
import { WikidocService } from '../sources/wikidoc/wikidoc.service';



@Injectable()
export class ConditionsService {
  constructor(
    private readonly wikidata: WikidataService,
    private readonly dbpedia: DbpediaService,
    private readonly wikidoc: WikidocService,
  ) {}

  async search(q: string) {
    if (!q || q.trim().length < 2) {
      throw new BadRequestException('Query must be at least 2 characters.');
    }
    // Step 3 will implement real search.
    return this.wikidata.searchCondition(q.trim());
  }

  async getCondition(id: string) {
    // Step 3 will implement real aggregation/normalization.
    const wd = await this.wikidata.getConditionDetails(id);

    // Optional secondary source (don’t fail if DBpedia is down)
    let dbp: any = null;
    try {
      dbp = await this.dbpedia.getAbstractByWikidataId(id);
    } catch {
      dbp = null;
    }

    // WikiDoc narrative (best effort)
    let doc: any = null;
    try {
      doc = await this.wikidoc.getConditionPage(wd?.name);
    } catch {
      doc = null;
    }

    return {
      id,
      name: wd?.name ?? id,
      description: wd?.description ?? null,
      sections: {
        overview: doc?.overview ?? dbp?.abstract ?? null,
        symptoms: wd?.symptoms ?? [],
        riskFactors: wd?.riskFactors ?? [],
        prevention: doc?.prevention ?? [],
      },
      bodySystems: wd?.bodySystems ?? [],
      sources: [
        { name: 'Wikidata', url: `https://www.wikidata.org/wiki/${id}` },
        ...(doc?.url ? [{ name: 'WikiDoc', url: doc.url }] : []),
        ...(dbp?.url ? [{ name: 'DBpedia', url: dbp.url }] : []),
      ],
    };
  }

  async getBodyImpact(id: string) {
    // Step 3: comes from Wikidata + your mapping.
    const wd = await this.wikidata.getConditionDetails(id);
    return {
      id,
      bodySystems: wd?.bodySystems ?? [],
    };
  }

  async getGeoContext(id: string, country: string) {
    if (!country) throw new BadRequestException('country is required, e.g. RO');

    // For MVP (Step 7 gets better): return proxies/factors per country + condition
    // Keep it simple now: just placeholders.
    return {
      id,
      country: country.toUpperCase(),
      value: 0.6,
      valueLabel: 'Estimated risk context (proxy)',
      factors: ['Climate', 'Population density', 'Industrial exposure', 'Lifestyle/diet'],
      sources: [{ name: 'Educational proxy', url: null }],
    };
  }
}
