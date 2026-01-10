import { Injectable, NotImplementedException } from '@nestjs/common';

export interface WikidocPage {
  url: string;
  overview: string | null;
  prevention: string[]; // keep as [] for now
}

@Injectable()
export class WikidocService {
  async getConditionPage(conditionName?: string | null): Promise<WikidocPage> {
    throw new NotImplementedException('Step 3: WikiDoc fetch/parse');
  }
}
