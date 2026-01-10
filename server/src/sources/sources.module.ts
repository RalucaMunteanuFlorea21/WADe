import { Module } from '@nestjs/common';
import { WikidataService } from './wikidata/wikidata.service';
import { DbpediaService } from './dbpedia/dbpedia.service';
import { WikidocService } from './wikidoc/wikidoc.service';

@Module({
  providers: [WikidataService, DbpediaService, WikidocService],
  exports: [WikidataService, DbpediaService, WikidocService],
})
export class SourcesModule {}
