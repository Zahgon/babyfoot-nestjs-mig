import { Assertion, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

import { AppModule } from './app.module';

interface RegisteredRoute {
  method: string;
  url: string;
}

describe('AppModule', () => {
  let t: NestFastifyApplication;
  let registeredRoutes: Array<RegisteredRoute>;

  const applicationRegisteredWithRoute = (method: string, route: string): RegisteredRoute | undefined =>
    registeredRoutes.find(registered => registered.method === method && registered.url === route);
  const expectApplicationToHaveRegisteredRoute = (method: string, route: string): Assertion =>
    expect(applicationRegisteredWithRoute(method, route)).to.not.be.undefined;

  beforeEach(async () => {
    registeredRoutes = [];
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    t = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    t.getHttpAdapter()
      .getInstance()
      .addHook('onRoute', (route: any) => {
        const methods: Array<string> = Array.isArray(route.method) ? route.method : [route.method];
        methods.forEach(method => registeredRoutes.push({ method, url: route.url }));
      });
    await t.init();
  });

  afterEach(async () => {
    await t.close();
  });

  it('should initialize', () => {
    expect(t).not.to.be.undefined;
  });

  it('should register uptime routes', () => {
    expectApplicationToHaveRegisteredRoute('GET', '/api/health');
  });

  it('should register identity routes', () => {
    expectApplicationToHaveRegisteredRoute('POST', '/api/identity/userIdentities/register');
    expectApplicationToHaveRegisteredRoute('POST', '/api/identity/userIdentities/:id/logIn');
    expectApplicationToHaveRegisteredRoute('DELETE', '/api/identity/sessions/:id');
  });

  it('should register games routes', () => {
    expectApplicationToHaveRegisteredRoute('POST', '/api/games');
    expectApplicationToHaveRegisteredRoute('GET', '/api/games');
    expectApplicationToHaveRegisteredRoute('GET', '/api/games/:id');
    expectApplicationToHaveRegisteredRoute('DELETE', '/api/games/:id');
    expectApplicationToHaveRegisteredRoute('POST', '/api/games/:id/start');
    expectApplicationToHaveRegisteredRoute('POST', '/api/games/:id/end');
    expectApplicationToHaveRegisteredRoute('POST', '/api/games/:id');
    expectApplicationToHaveRegisteredRoute('GET', '/api/games/:id/players');
    expectApplicationToHaveRegisteredRoute('POST', '/api/games/:id/players/:player/:team');
    expectApplicationToHaveRegisteredRoute('DELETE', '/api/games/:id/players/:player');
    expectApplicationToHaveRegisteredRoute('POST', '/api/games/:id/goals/:player');
    expectApplicationToHaveRegisteredRoute('POST', '/api/games/:id/players/:player/position/:position');
  });

  it('should register players routes', () => {
    expectApplicationToHaveRegisteredRoute('POST', '/api/players');
    expectApplicationToHaveRegisteredRoute('GET', '/api/players');
    expectApplicationToHaveRegisteredRoute('GET', '/api/players/:id');
    expectApplicationToHaveRegisteredRoute('POST', '/api/players/:id');
    expectApplicationToHaveRegisteredRoute('DELETE', '/api/players/:id');
  });
});
