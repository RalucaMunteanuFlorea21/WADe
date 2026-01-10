import { Test, TestingModule } from '@nestjs/testing';
import { DbpediaService } from './dbpedia.service';

describe('DbpediaService', () => {
  let service: DbpediaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DbpediaService],
    }).compile();

    service = module.get<DbpediaService>(DbpediaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
