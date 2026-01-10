import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class DbpediaService {
  async getAbstractByWikidataId(id: string) {
    throw new NotImplementedException('Step 3: implement DBpedia abstract');
  }
}
