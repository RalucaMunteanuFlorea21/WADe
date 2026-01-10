import { Test, TestingModule } from '@nestjs/testing';
import { ConditionsController } from './conditions.controller';

describe('ConditionsController', () => {
  let controller: ConditionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConditionsController],
    }).compile();

    controller = module.get<ConditionsController>(ConditionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
