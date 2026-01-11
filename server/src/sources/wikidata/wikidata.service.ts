import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { dump, logger } from '../../utils/log';

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

const safeQ = q.replace(/["\\]/g, ''); // minimal sanitize

const query = `
  SELECT ?item ?itemLabel ?itemDescription
         (COUNT(DISTINCT ?sym) AS ?symCount)
         (COUNT(DISTINCT ?rf) AS ?rfCount)
         (IF(LCASE(STR(?itemLabel)) = LCASE("${safeQ}"), 3, 0) AS ?exactBoost)
         (IF(STRSTARTS(LCASE(STR(?itemLabel)), LCASE("${safeQ}")), 1, 0) AS ?startsBoost)
  WHERE {
    ?item wdt:P31/wdt:P279* wd:Q12136 .  # disease

    ?item rdfs:label ?label .
    FILTER(LANG(?label) = "en")
    FILTER(CONTAINS(LCASE(?label), LCASE("${safeQ}")))

    OPTIONAL { ?item wdt:P780 ?sym . }    # symptom
    OPTIONAL { ?item wdt:P5642 ?rf . }    # risk factor

    SERVICE wikibase:label {
      bd:serviceParam wikibase:language "en".
    }
  }
  GROUP BY ?item ?itemLabel ?itemDescription ?exactBoost ?startsBoost
  ORDER BY DESC(?exactBoost) DESC(?startsBoost) DESC(?symCount + ?rfCount) DESC(BOUND(?itemDescription))
  LIMIT 10
`;


    const response = await axios.get(endpoint, {
      params: { format: 'json', query },
      headers: { 'User-Agent': 'HealthScope/1.0 (student project)' },
    });

    logger('[Wikidata] searchCondition response for', q, response.data);

    return response.data.results.bindings.map((b: any) => ({
      id: b.item.value.split('/').pop(),
      label: b.itemLabel.value,
      description: b.itemDescription?.value,
    }));
  }

  async getConditionDetails(id: string) {
    const api = 'https://www.wikidata.org/w/api.php';
    try {
      const res = await axios.get(api, {
        params: {
          action: 'wbgetentities',
          ids: id,
          props: 'labels|descriptions|claims',
          languages: 'en',
          format: 'json',
        },
        headers: { 'User-Agent': 'HealthScope/1.0 (student project)' },
        timeout: 15000,
      });

      logger('[Wikidata] wbgetentities response for', id, res.data);

      const entity = res.data?.entities?.[id];
      if (!entity) {
        return { id, name: null, description: null, symptoms: [], riskFactors: [], bodySystems: [] };
      }

      const name = entity.labels?.en?.value ?? (entity.labels ? (Object.values(entity.labels)[0] as any)?.value ?? null : null);
      const description = entity.descriptions?.en?.value ?? (entity.descriptions ? (Object.values(entity.descriptions)[0] as any)?.value ?? null : null);

      const extractIdsFromClaims = (props: string[]) => {
        const ids: string[] = [];
        for (const p of props) {
          const arr = entity.claims?.[p] ?? [];
          for (const c of arr) {
            const dv = c.mainsnak?.datavalue;
            if (!dv) continue;
            if (dv.type === 'wikibase-entityid' && dv.value?.id) ids.push(dv.value.id);
            else if (dv.type === 'string' && dv.value) ids.push(dv.value);
            else if (dv.type === 'monolingualtext' && dv.value?.text) ids.push(dv.value.text);
          }
        }
        return ids;
      };

      const symptomProps = ['P780'];
      const riskProps = ['P5642', 'P1542', 'P828']; 
      const bodyProps = ['P927', 'P361', 'P527'];   



      const symptomsIds = extractIdsFromClaims(symptomProps);
      const riskIds = extractIdsFromClaims(riskProps);
      const bodyIds = extractIdsFromClaims(bodyProps);

      const allEntityIds = Array.from(new Set([...symptomsIds, ...riskIds, ...bodyIds].filter(i => typeof i === 'string' && i.startsWith('Q'))));

      const idToLabel: Record<string, string> = {};
      if (allEntityIds.length) {
        const batch = allEntityIds.join('|');
        try {
          const lblRes = await axios.get(api, {
            params: { action: 'wbgetentities', ids: batch, props: 'labels', languages: 'en', format: 'json' },
            headers: { 'User-Agent': 'HealthScope/1.0 (student project)' },
            timeout: 15000,
          });
          logger('[Wikidata] wbgetentities labels response for batch', batch, lblRes.data);
          const entities = lblRes.data.entities || {};
          for (const k of Object.keys(entities)) {
            idToLabel[k] = entities[k].labels?.en?.value ?? ((Object.values(entities[k].labels || {})[0] as any)?.value) ?? k;
          }
        } catch (e) {
          // ignore label resolution failures
        }
      }

      const mapIdsToLabels = (arr: string[]) =>
        arr
          .map(i => (i && idToLabel[i] ? idToLabel[i] : i))
          .filter(Boolean);

      const mapIdsToIdLabel = (arr: string[]) =>
        arr
          .filter(i => typeof i === 'string' && i.startsWith('Q'))
          .map(i => ({ id: i, label: idToLabel[i] ?? i }));

      return {
        id,
        name: name,
        description,
        symptoms: mapIdsToLabels(symptomsIds),
        riskFactors: mapIdsToLabels(riskIds),
        bodySystems: mapIdsToIdLabel(bodyIds),
      } as WikidataConditionDetails;

    } catch (err) {
      return { id, name: null, description: null, symptoms: [], riskFactors: [], bodySystems: [] };
    }
  }
}
