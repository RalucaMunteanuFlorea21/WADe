import { Module } from '@nestjs/common';
import { ConditionsController } from './conditions.controller';
import { ConditionsService } from './conditions.service';
import { SourcesModule } from '../sources/sources.module';

@Module({
  imports: [SourcesModule],
  controllers: [ConditionsController],
  providers: [ConditionsService],
})
export class ConditionsModule {}
