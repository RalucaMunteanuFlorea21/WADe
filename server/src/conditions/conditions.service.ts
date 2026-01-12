import { BadRequestException, Injectable } from '@nestjs/common';
import {
  WikidataService,
  WikidataConditionDetails,
} from '../sources/wikidata/wikidata.service';
import {
  DbpediaService,
  DbpediaAbstract,
} from '../sources/dbpedia/dbpedia.service';
import {
  WikidocService,
  WikidocPage,
} from '../sources/wikidoc/wikidoc.service';
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
      throw new BadRequestException(
        'Invalid id. Expected something like Q35869.',
      );
    }

    const wd: WikidataConditionDetails =
      await this.wikidata.getConditionDetails(qid);

    // If name is missing or looks like a Q-id, don’t send it to WikiDoc.
    const docName =
      wd?.name && typeof wd.name === 'string' && !WD_ID_RE.test(wd.name)
        ? wd.name
        : null;

    // Fetch optional sources in parallel; never fail the endpoint if they fail.
    const [dbp, doc] = await Promise.all([
      this.safeDbpedia(qid),
      this.safeWikidoc(docName),
    ]);

    const wikidocUrl =
      doc?.url && doc.url !== 'https://www.wikidoc.org/index.php/'
        ? doc.url
        : null;

    // Build overview from best available narrative source.
    const overview =
      (doc?.overview && doc.overview.trim().length ? doc.overview : null) ??
      (dbp?.abstract && dbp.abstract.trim().length ? dbp.abstract : null) ??
      null;

    // Build scored lists for symptoms and risk factors using presence in
    // Wikidata (wd) and WikiDoc (doc). This produces deterministic scores
    // that the client can visualise instead of random widths.
    const prevention = Array.isArray(doc?.prevention) ? doc!.prevention : [];

    const buildScoreList = (wdArr: any[], docArr: any[]) => {
      const map = new Map<string, { wd: boolean; doc: boolean }>();
      for (const s of Array.isArray(wdArr) ? wdArr : []) {
        const key = (s ?? '').toString();
        if (!key) continue;
        const cur = map.get(key) ?? { wd: false, doc: false };
        cur.wd = true;
        map.set(key, cur);
      }
      for (const s of Array.isArray(docArr) ? docArr : []) {
        const key = (s ?? '').toString();
        if (!key) continue;
        const cur = map.get(key) ?? { wd: false, doc: false };
        cur.doc = true;
        map.set(key, cur);
      }

      const list = Array.from(map.entries()).map(([label, f]) => ({
        label,
        rawScore: (f.wd ? 0.6 : 0) + (f.doc ? 0.4 : 0),
      }));

      // normalize to 0..100 and clamp sensible min/max so bars are visible
      const maxRaw = list.reduce((m, it) => Math.max(m, it.rawScore), 0) || 1;
      return list
        .map((it) => ({
          label: it.label,
          score: Math.round((it.rawScore / maxRaw) * 100),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);
    };

    const symptoms = buildScoreList(wd?.symptoms ?? [], doc?.symptoms ?? []);
    const riskFactors = buildScoreList(
      wd?.riskFactors ?? [],
      doc?.riskFactors ?? [],
    );

    // Compute lightweight indicators derived from available data so
    // the frontend has consistent values to show in prevalence bars.
    const symptomsCount = Array.isArray(symptoms) ? symptoms.length : 0;
    const riskCount = Array.isArray(riskFactors) ? riskFactors.length : 0;
    const bodyCount = Array.isArray(wd?.bodySystems)
      ? wd.bodySystems.length
      : 0;

    const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));

    const indicators = [
      {
        label: 'Prevalence',
        value: clamp(
          20 + symptomsCount * 3 + riskCount * 1 + bodyCount * 4,
          5,
          95,
        ),
      },
      {
        label: 'Severity',
        value: clamp(
          30 +
            bodyCount * 12 +
            (wd?.description
              ? Math.min(20, (wd.description.length / 200) | 0)
              : 0),
          5,
          95,
        ),
      },
      {
        label: 'Impact',
        value: clamp(25 + symptomsCount * 4 + riskCount * 2, 5, 95),
      },
      {
        label: 'Treatment Options',
        value: clamp(prevention.length ? 70 : 35, 5, 95),
      },
    ];

    const out = {
      id: qid,
      name: wd?.name ?? qid,
      description: wd?.description ?? null,
      sections: {
        overview,
        // Keep legacy arrays for compatibility
        symptoms: (Array.isArray(wd?.symptoms) ? wd.symptoms : [])
          .concat(Array.isArray(doc?.symptoms) ? doc.symptoms : [])
          .slice(0, 20),
        riskFactors: (Array.isArray(wd?.riskFactors) ? wd.riskFactors : [])
          .concat(Array.isArray(doc?.riskFactors) ? doc.riskFactors : [])
          .slice(0, 20),
        prevention,
        // New scored lists
        symptomsScores: symptoms,
        riskFactorsScores: riskFactors,
      },
      bodySystems: Array.isArray(wd?.bodySystems) ? wd.bodySystems : [],
      indicators,
      sources: [
        { name: 'Wikidata', url: `https://www.wikidata.org/wiki/${qid}` },
        { name: 'WikiDoc', url: wikidocUrl },
        { name: 'DBpedia', url: dbp?.url ?? null },
      ].filter((s) => !!s.url),
    };

    // Lightweight log (shape only)
    logger('[Conditions] getCondition', {
      id: qid,
      hasName: !!wd?.name,
      hasDescription: !!wd?.description,
      overviewSource: doc?.overview
        ? 'wikidoc'
        : dbp?.abstract
          ? 'dbpedia'
          : 'none',
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
      throw new BadRequestException(
        'Invalid id. Expected something like Q35869.',
      );
    }

    const wd = await this.wikidata.getConditionDetails(qid);
    return {
      id: qid,
      bodySystems: Array.isArray(wd?.bodySystems) ? wd.bodySystems : [],
    };
  }

  async getGeo(id: string, country: string) {
    const qid = (id ?? '').trim();
    if (!WD_ID_RE.test(qid)) {
      throw new BadRequestException(
        'Invalid id. Expected something like Q35869.',
      );
    }

    const iso = (country ?? '').toString().trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(iso)) {
      throw new BadRequestException(
        'Invalid country code. Use ISO alpha-2, e.g. RO',
      );
    }

    // Fetch condition overview (includes our indicators) and country stats in parallel
    const [cond, countryStats] = await Promise.all([
      this.getCondition(qid).catch(() => null),
      this.wikidata.getCountryStats(iso).catch(() => null),
    ]);

    const indicators =
      cond && Array.isArray((cond as any).indicators)
        ? (cond as any).indicators
        : [];

    const population = countryStats?.population ?? null;
    const area = countryStats?.areaKm2 ?? null;
    const density = population && area ? population / Math.max(1, area) : null; // people per km2

    // Build a conservative estimator using prevalence indicator and population density
    const prevalenceIndicator =
      indicators?.find((i: any) => i.label === 'Prevalence')?.value ?? 30;

    // densityMultiplier: low density -> lower multiplier; high density -> higher
    let densityMultiplier = 1;
    if (typeof density === 'number') {
      // log scale: density 1 -> 0, 10 -> 1, 100 -> 2, etc.
      densityMultiplier = 1 + Math.log10(density + 1) * 0.25; // moderate effect
      densityMultiplier = Math.max(0.5, Math.min(2.5, densityMultiplier));
    }

    const estimatedPrevalencePerc = Math.round(
      Math.max(1, Math.min(95, prevalenceIndicator * densityMultiplier)),
    );

    const confidence =
      (Array.isArray((cond as any)?.sections?.symptoms) ? 1 : 0) +
      (Array.isArray((cond as any)?.sections?.riskFactors) ? 1 : 0) +
      (population ? 1 : 0);

    return {
      id: qid,
      country: iso,
      countryLabel: countryStats?.label ?? null,
      population: population ?? null,
      areaKm2: area ?? null,
      density: density ?? null,
      estimatedPrevalencePercent: estimatedPrevalencePerc,
      confidence: Math.min(3, confidence), // rough 0-3 scale
      components: {
        prevalenceIndicator,
        densityMultiplier: Number(densityMultiplier.toFixed(3)),
      },
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

  private async safeWikidoc(
    conditionName: string | null,
  ): Promise<WikidocPage | null> {
    try {
      return await this.wikidoc.getConditionPage(conditionName);
    } catch (e) {
      logger('[Conditions] WikiDoc failed', {
        name: conditionName,
        error: String(e),
      });
      return null;
    }
  }
}
