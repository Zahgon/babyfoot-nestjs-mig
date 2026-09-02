import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import admin from 'firebase-admin';

/**
 * Guard equivalent of the former `checkFirebaseAuthToken` Express middleware.
 * It is applied on the controllers that used to register that middleware.
 */
@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  public async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.NODE_ENV === 'production') {
      const request = context.switchToHttp().getRequest<FastifyRequest>();
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        throw new HttpException('Authentication required.', HttpStatus.UNAUTHORIZED);
      }
      const [, idToken] = authHeader.split('Bearer ');
      try {
        // const decodedToken = await admin.auth().verifyIdToken(idToken);
        // const uid = decodedToken.uid;
        return true;
      } catch (error) {
        throw new HttpException(
          { message: 'error verifying the JWT ID token from Firebase Auth', error },
          HttpStatus.FORBIDDEN,
        );
      }
    } else {
      console.warn('bypassing checkFirebaseAuthToken in development');
      return true;
    }
  }
}
