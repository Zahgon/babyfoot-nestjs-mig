import { Assertion, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { BabyfootExpressAdapter } from './adapters/express.adapter';

interface RegisteredRoute {
  method: string;
  url: string;
}

const listRegisteredRoutes = (app: NestExpressApplication): Array<RegisteredRoute> =>
  app
    .getHttpAdapter()
    .getInstance()
    ._router.stack.filter((layer: any) => layer.route)
    .flatMap((layer: any) =>
      Object.keys(layer.route.methods).map(method => ({ method: method.toUpperCase(), url: layer.route.path })),
    );

describe('AppModule', () => {
  let t: NestExpressApplication;
  let registeredRoutes: Array<RegisteredRoute>;

  const applicationRegisteredWithRoute = (method: string, route: string): RegisteredRoute | undefined =>
    registeredRoutes.find(registered => registered.method === method && registered.url === route);
  const expectApplicationToHaveRegisteredRoute = (method: string, route: string): Assertion =>
    expect(applicationRegisteredWithRoute(method, route)).to.not.be.undefined;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    t = moduleRef.createNestApplication<NestExpressApplication>(new BabyfootExpressAdapter());
    await t.init();
    registeredRoutes = listRegisteredRoutes(t);
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
