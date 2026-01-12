import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as YAML from 'yaml';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: ['http://localhost:4200'] });

  // ✅ stop 304 caching behavior for API calls
  app.getHttpAdapter().getInstance().disable('etag');
  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  const config = new DocumentBuilder()
    .setTitle('HealthScope API')
    .setDescription('HealthScope REST API (WADe project). Educational only.')
    .setVersion('1.0.0')
    .addTag('Conditions')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document);

  // Optional: expose the spec too (useful for grading)
  app.getHttpAdapter().get('/docs-json', (_req, res) => res.json(document));
  app.getHttpAdapter().get('/docs-yaml', (_req, res) => {
    res.type('text/yaml').send(YAML.stringify(document));
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
}
bootstrap();
