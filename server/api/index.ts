import express from 'express';
import serverless from 'serverless-http';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';

let cachedHandler: any;

async function bootstrap() {
  const expressApp = express();

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    { logger: ['error', 'warn', 'log'] },
  );

  // If you have app.setGlobalPrefix('api') in main.ts, keep it there.
  // Otherwise you can set it here. Uncomment ONLY if you need it:
  // app.setGlobalPrefix('api');

  // CORS so your GitHub Pages frontend can call it
  app.enableCors({
    origin: [
      'http://localhost:4200',
      'https://<YOUR_GH_USERNAME>.github.io',
      'https://<YOUR_GH_USERNAME>.github.io/<YOUR_REPO_NAME>',
    ],
  });

  await app.init();
  return serverless(expressApp);
}

export default async function handler(req: any, res: any) {
  if (!cachedHandler) cachedHandler = await bootstrap();
  return cachedHandler(req, res);
}
