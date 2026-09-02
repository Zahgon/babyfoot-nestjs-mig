import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Global exception filter replacing the `logErrors` -> `manageError` Express
 * error middleware chain. Domain errors are answered with an HTTP 400 and the
 * `{ error, errorName, stack }` payload; `stack` is only exposed to local callers.
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

    // logErrors
    console.error(err.stack);

    // manageError
    if (err.constructor) {
      const errorName = err.constructor.name;

      console.log('error: ' + errorName);
      console.log(err);

      const ctx = host.switchToHttp();
      const request = ctx.getRequest<FastifyRequest>();
      const reply = ctx.getResponse<FastifyReply>();

      const remoteAddress = request.raw.socket.remoteAddress;
      const isLocal = remoteAddress && ['localhost', '::1', '127.0.0.1'].includes(remoteAddress);
      const stack = isLocal ? err.stack!.split('\n') : undefined;

      reply.status(400).send({
        error: err,
        errorName,
        stack,
      });
    } else {
      super.catch(exception, host);
    }
  }
}
