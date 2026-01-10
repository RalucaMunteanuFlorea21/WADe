import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConditionsModule } from './conditions/conditions.module';
import { SourcesModule } from './sources/sources.module';
import { GeoModule } from './geo/geo.module';
import { CacheModule } from './cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule,
    SourcesModule,
    ConditionsModule,
    GeoModule,
  ],
})
export class AppModule {}
