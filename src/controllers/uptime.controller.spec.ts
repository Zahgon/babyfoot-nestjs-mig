import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

import { UptimeController } from './uptime.controller';

describe('Uptime Controller', () => {
  let t: UptimeController;
  let app: NestFastifyApplication;
  let registeredRoutes: Array<{ method: string; url: string }>;

  beforeEach(async () => {
    t = new UptimeController();

    registeredRoutes = [];
    const moduleRef = await Test.createTestingModule({ controllers: [UptimeController] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app
      .getHttpAdapter()
      .getInstance()
      .addHook('onRoute', (route: any) => {
        const methods: Array<string> = Array.isArray(route.method) ? route.method : [route.method];
        methods
          .filter(method => method === 'GET')
          .forEach(method => registeredRoutes.push({ method, url: route.url }));
      });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should initialize', () => {
    expect(t).not.to.be.undefined;
  });

  it('should register route /api/health', () => {
    expect(registeredRoutes.length).to.equal(1);
    expect(registeredRoutes[0].url).to.equal('/api/health');
  });

  it('should have a health route that returns HTTP 200 OK with an expected JSON payload', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).to.equal(200);
    expect(response.payload).to.equal('{"status":"OK"}');
  });
});
