import { ExpressAdapter } from '@nestjs/platform-express';
import { IncomingMessage } from 'http';

import { ErrorResponse, manageError } from '../filters/manage-error.filter';

/**
 * Express platform adapter for the Babyfoot API.
 *
 * The errors raised by the middleware chain (body parsing, parameter decoding)
 * are answered with the same payload as the errors raised by the controllers,
 * instead of being translated into framework exceptions.
 */
export class BabyfootExpressAdapter extends ExpressAdapter {
  public registerParserMiddleware(_prefix?: string, rawBody = false): void {
    this.useBodyParser('json', rawBody);
    this.useBodyParser('urlencoded', rawBody, { extended: false });
  }

  public setNotFoundHandler(): void {
    // unknown routes are left to the Express final handler
  }

  public setErrorHandler(): void {
    this.use((err: any, request: IncomingMessage, response: ErrorResponse, next: (error?: any) => void) => {
      if (err.constructor) {
        manageError(err, request, response);
      } else {
        next(err);
      }
    });
  }
}
