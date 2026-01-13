import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import serverless from 'serverless-http';

let cachedHandler: any;

async function bootstrap() {
  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    // keep logs on for debugging deploy
    logger: ['error', 'warn', 'log'],
  });

  // IMPORTANT: set CORS for your GH Pages frontend
  app.enableCors({
    origin: [
      'https://<YOUR_GH_USERNAME>.github.io',          // optional
      'https://<YOUR_GH_USERNAME>.github.io/wade',     // your actual frontend
      'http://localhost:4200',
    ],
    credentials: true,
  });

  await app.init();
  return serverless(expressApp);
}

export default async function handler(req: any, res: any) {
  if (!cachedHandler) cachedHandler = await bootstrap();
  return cachedHandler(req, res);
}
