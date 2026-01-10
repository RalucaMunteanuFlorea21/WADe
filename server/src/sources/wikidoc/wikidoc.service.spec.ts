import { Test, TestingModule } from '@nestjs/testing';
import { WikidocService } from './wikidoc.service';

describe('WikidocService', () => {
  let service: WikidocService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WikidocService],
    }).compile();

    service = module.get<WikidocService>(WikidocService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
