import { Injectable, NotImplementedException } from '@nestjs/common';
export type BodySystem = { id: string; label: string };

export interface WikidataConditionDetails {
  id: string;
  name: string | null;
  description: string | null;
  symptoms: string[];
  riskFactors: string[];
  bodySystems: BodySystem[];
}
@Injectable()
export class WikidataService {
  async searchCondition(q: string): Promise<Array<{ id: string; label: string; description?: string }>> {
    throw new NotImplementedException('Step 3: Wikidata search');
  }

  async getConditionDetails(id: string): Promise<WikidataConditionDetails> {
    throw new NotImplementedException('Step 3: Wikidata details');
  }
}

