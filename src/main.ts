import 'reflect-metadata';

import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import admin from 'firebase-admin';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { BabyfootExpressAdapter } from './adapters/express.adapter';
import { ManageErrorFilter } from './filters/manage-error.filter';

export async function createNestApplication(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, new BabyfootExpressAdapter());

  app.use(helmet());
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.BABYFOOTAPI_CORS_ORIGINS) {
      console.error('in production mode, you need to specify BABYFOOTAPI_CORS_ORIGINS for CORS!');
      process.exit(1);
    }
    app.enableCors({ origin: process.env.BABYFOOTAPI_CORS_ORIGINS!.split(' ') });
  } else {
    app.enableCors();
  }

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new ManageErrorFilter(httpAdapter));

  return app;
}

function configureFirebaseAdminSDK(): void {
  if (process.env.NODE_ENV === 'production') {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const databaseURL = process.env.FIREBASE_DATABASE_URL;
    if (!projectId || !clientEmail || !privateKey) {
      console.error('ERROR: you need to pass an environment variable named'
        + 'FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY'
        + ' containing the related Firebase Admin SDK authentication information');
      process.exit(1);
    } else {
      console.log('FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY environment variable found');
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        databaseURL,
      });
    }
  } else {
    console.warn('No firebase admin SDK init in development mode');
  }
}

async function startServer(app: NestExpressApplication, port: string | number): Promise<void> {
  await app.listen(port);
  console.log('Babyfoot API NestJS server listening on port ' + port);
}

export async function run(port: string | number): Promise<void> {
  const app = await createNestApplication();

  configureFirebaseAdminSDK();

  await startServer(app, port);
}
