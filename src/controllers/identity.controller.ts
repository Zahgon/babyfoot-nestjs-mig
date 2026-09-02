import { Body, Controller, Delete, Header, Inject, Param, Post } from '@nestjs/common';

import { BFEventsStore, EventPublisher, SessionId, SessionsRepository, UserId, UserIdentity } from '..';
import { UserIdentityRepository } from '../infrastructure/user-identity-repository';

@Controller('api/identity')
export class IdentityController {
  constructor(
    @Inject(BFEventsStore) public eventsStore: BFEventsStore,
    @Inject(UserIdentityRepository) public userIdentitiesRepository: UserIdentityRepository,
    @Inject(SessionsRepository) public sessionsRepository: SessionsRepository,
    @Inject(EventPublisher) public eventPublisher: EventPublisher,
  ) {}

  @Post('userIdentities/register')
  public registerUser(@Body() body: any = {}) {
    // parse request body attributes
    const email: string = body.email;

    // call COMMAND on Aggregate (this time it is a static method)
    UserIdentity.register(this.eventPublisher, email);

    // send response
    return {
      id: new UserId(email),
      logIn: `/api/identity/userIdentities/${encodeURIComponent(email)}/logIn`,
      url: '/api/identity/userIdentities/' + encodeURIComponent(email),
    };
  }

  @Post('userIdentities/:id/logIn')
  public logInUser(@Param('id') id: string) {
    // create ID value type based on request parameters
    const userId = new UserId(id);
    // find Aggregate for this ID in repository
    const userIdentity = this.userIdentitiesRepository.getUserIdentity(userId);
    // call COMMAND on Aggregate
    const sessionId = userIdentity.logIn(this.eventPublisher);

    return {
      id: sessionId,
      url: '/api/identity/sessions/' + encodeURIComponent(sessionId.id),
    };
  }

  @Delete('sessions/:id')
  @Header('Content-Type', 'text/html; charset=utf-8')
  public logOutUser(@Param('id') id: string): string {
    const sessionId = new SessionId(id);

    // QUERY to retrieve Aggregate
    const session = this.sessionsRepository.getSession(sessionId);

    // COMMAND
    session.logOut(this.eventPublisher);

    return 'User disconnected';
  }
}
