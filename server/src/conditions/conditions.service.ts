import { BadRequestException, Injectable } from '@nestjs/common';
import { WikidataService, WikidataConditionDetails } from '../sources/wikidata/wikidata.service';
import { DbpediaService, DbpediaAbstract } from '../sources/dbpedia/dbpedia.service';
import { WikidocService, WikidocPage } from '../sources/wikidoc/wikidoc.service';
import { logger } from '../utils/log'; // adjust path if yours differs

const WD_ID_RE = /^Q\d+$/;

@Injectable()
export class ConditionsService {
  constructor(
    private readonly wikidata: WikidataService,
    private readonly dbpedia: DbpediaService,
    private readonly wikidoc: WikidocService,
  ) {}

  async search(q: string) {
    const query = (q ?? '').trim();
    if (query.length < 2) {
      throw new BadRequestException('Query must be at least 2 characters.');
    }
    return this.wikidata.searchCondition(query);
  }

  async getCondition(id: string) {
    const qid = (id ?? '').trim();
    if (!WD_ID_RE.test(qid)) {
      throw new BadRequestException('Invalid id. Expected something like Q35869.');
    }

    const wd: WikidataConditionDetails = await this.wikidata.getConditionDetails(qid);

    // If name is missing or looks like a Q-id, don’t send it to WikiDoc.
    const docName =
      wd?.name && typeof wd.name === 'string' && !WD_ID_RE.test(wd.name) ? wd.name : null;

    // Fetch optional sources in parallel; never fail the endpoint if they fail.
    const [dbp, doc] = await Promise.all([
      this.safeDbpedia(qid),
      this.safeWikidoc(docName),
    ]);

    // Build overview from best available narrative source.
    const overview = (doc?.overview && doc.overview.trim().length ? doc.overview : null)
      ?? (dbp?.abstract && dbp.abstract.trim().length ? dbp.abstract : null)
      ?? null;

    const symptoms = [
      ...(Array.isArray(wd?.symptoms) ? wd.symptoms : []),
      ...(Array.isArray(doc?.symptoms) && doc.symptoms.length ? doc.symptoms : []),
    ].slice(0, 20); // limit to 20 unique items

    const riskFactors = [
      ...(Array.isArray(wd?.riskFactors) ? wd.riskFactors : []),
      ...(Array.isArray(doc?.riskFactors) && doc.riskFactors.length ? doc.riskFactors : []),
    ].slice(0, 20);

    const prevention = Array.isArray(doc?.prevention) ? doc!.prevention : [];

    const out = {
      id: qid,
      name: wd?.name ?? qid,
      description: wd?.description ?? null,
      sections: {
        overview,
        symptoms,
        riskFactors,
        prevention,
      },
      bodySystems: Array.isArray(wd?.bodySystems) ? wd.bodySystems : [],
      sources: [
        { name: 'Wikidata', url: `https://www.wikidata.org/wiki/${qid}` },
        { name: 'WikiDoc', url: doc?.url ?? null },
        { name: 'DBpedia', url: dbp?.url ?? null },
      ].filter(s => !!s.url),
    };

    // Lightweight log (shape only)
    logger('[Conditions] getCondition', {
      id: qid,
      hasName: !!wd?.name,
      hasDescription: !!wd?.description,
      overviewSource: doc?.overview ? 'wikidoc' : dbp?.abstract ? 'dbpedia' : 'none',
      symptoms: symptoms.length,
      riskFactors: riskFactors.length,
      prevention: out.sections.prevention.length,
      bodySystems: out.bodySystems.length,
    });

    return out;
  }

  async getBodyImpact(id: string) {
    const qid = (id ?? '').trim();
    if (!WD_ID_RE.test(qid)) {
      throw new BadRequestException('Invalid id. Expected something like Q35869.');
    }

    const wd = await this.wikidata.getConditionDetails(qid);
    return {
      id: qid,
      bodySystems: Array.isArray(wd?.bodySystems) ? wd.bodySystems : [],
    };
  }

  async getGeoContext(id: string, country: string) {
    const qid = (id ?? '').trim();
    if (!WD_ID_RE.test(qid)) {
      throw new BadRequestException('Invalid id. Expected something like Q35869.');
    }

    const c = (country ?? '').trim().toUpperCase();
    if (!c) throw new BadRequestException('country is required, e.g. RO');

    // MVP proxy response (stable shape)
    return {
      id: qid,
      country: c,
      value: 0.6,
      valueLabel: 'Estimated risk context (proxy)',
      factors: ['Climate', 'Population density', 'Industrial exposure', 'Lifestyle/diet'],
      sources: [{ name: 'Educational proxy', url: null }],
    };
  }

  // ---- helpers ----

  private async safeDbpedia(id: string): Promise<DbpediaAbstract | null> {
    try {
      return await this.dbpedia.getAbstractByWikidataId(id);
    } catch (e) {
      logger('[Conditions] DBpedia failed', { id, error: String(e) });
      return null;
    }
  }

  private async safeWikidoc(conditionName: string | null): Promise<WikidocPage | null> {
    try {
      return await this.wikidoc.getConditionPage(conditionName);
    } catch (e) {
      logger('[Conditions] WikiDoc failed', { name: conditionName, error: String(e) });
      return null;
    }
  }
}
