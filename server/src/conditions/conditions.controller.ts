import { Controller, Get, Param, Query } from '@nestjs/common';
import { ConditionsService } from './conditions.service';

@Controller('api/conditions')
export class ConditionsController {
  constructor(private readonly conditionsService: ConditionsService) {}

  @Get('search')
  search(@Query('q') q: string) {
    return this.conditionsService.search(q);
  }

  @Get(':id')
  getCondition(@Param('id') id: string) {
    return this.conditionsService.getCondition(id);
  }

  @Get(':id/body')
  getBody(@Param('id') id: string) {
    return this.conditionsService.getBodyImpact(id);
  }

  @Get(':id/geo')
  getGeo(@Param('id') id: string, @Query('country') country: string) {
    return this.conditionsService.getGeoContext(id, country);
  }
}
