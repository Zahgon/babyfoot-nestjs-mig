import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AddressInfo } from 'net';
import { Server, request } from 'http';

import { UptimeController } from './uptime.controller';
import { BabyfootExpressAdapter } from '../adapters/express.adapter';

const get = (server: Server, path: string): Promise<{ statusCode: number; payload: string }> =>
  new Promise((resolve, reject) => {
    const { port } = server.address() as AddressInfo;
    const call = request({ host: '127.0.0.1', port, path }, response => {
      let payload = '';
      response.setEncoding('utf8');
      response.on('data', chunk => (payload += chunk));
      response.on('end', () => resolve({ statusCode: response.statusCode!, payload }));
    });
    call.on('error', reject);
    call.end();
  });

describe('Uptime Controller', () => {
  let t: UptimeController;
  let app: NestExpressApplication;
  let registeredRoutes: Array<{ method: string; url: string }>;

  beforeEach(async () => {
    t = new UptimeController();

    const moduleRef = await Test.createTestingModule({ controllers: [UptimeController] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>(new BabyfootExpressAdapter());
    await app.listen(0, '127.0.0.1');

    registeredRoutes = app
      .getHttpAdapter()
      .getInstance()
      ._router.stack.filter((layer: any) => layer.route && layer.route.methods.get)
      .map((layer: any) => ({ method: 'GET', url: layer.route.path }));
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
    const response = await get(app.getHttpServer(), '/api/health');

    expect(response.statusCode).to.equal(200);
    expect(response.payload).to.equal('{"status":"OK"}');
  });
});
