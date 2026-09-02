import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { IncomingMessage, ServerResponse } from 'http';

/**
 * The members of the platform response object used to answer an error.
 */
export interface ErrorResponse extends ServerResponse {
  status(statusCode: number): ErrorResponse;
  send(body: unknown): ErrorResponse;
}

/**
 * Answers a domain error with an HTTP 400 and the `{ error, errorName, stack }`
 * payload; `stack` is only exposed to local callers. This is the former
 * `logErrors` -> `manageError` middleware chain, shared by the global exception
 * filter below and by the middleware error handler of the HTTP adapter.
 */
export function manageError(err: any, request: IncomingMessage, response: ErrorResponse): void {
  const errorName = err.constructor.name;

  console.error(err.stack);
  console.log('error: ' + errorName);
  console.log(err);

  const remoteAddress = request.socket.remoteAddress;
  const isLocal = remoteAddress && ['localhost', '::1', '127.0.0.1'].includes(remoteAddress);
  const stack = isLocal ? err.stack!.split('\n') : undefined;

  // a route that declares a Content-Type never got to send its body, so the
  // error payload is negotiated from scratch like any other error answer.
  response.removeHeader('Content-Type');

  response.status(400).send({
    error: err,
    errorName,
    stack,
  });
}

/**
 * Global exception filter for the errors raised by the controllers.
 * HttpExceptions raised by the framework itself keep their own status and body.
 */
@Catch()
export class ManageErrorFilter extends BaseExceptionFilter {
  public catch(exception: unknown, host: ArgumentsHost): void {
    if (exception instanceof HttpException) {
      super.catch(exception, host);

      return;
    }

    const err: any = exception;

    if (err.constructor) {
      const ctx = host.switchToHttp();

      manageError(err, ctx.getRequest<IncomingMessage>(), ctx.getResponse<ErrorResponse>());
    } else {
      super.catch(exception, host);
    }
  }
}
