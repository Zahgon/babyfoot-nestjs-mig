import { Module } from '@nestjs/common';

import { BFEventsStore, EventPublisher, SessionHandler, SessionsRepository, UserIdentityRepository } from '.';
import { GamesRepository } from './infrastructure/game-repository';
import { PlayersRepository } from './infrastructure/player-repository';
import { GameHandler } from './domains/game/game-handler';
import { PlayerHandler } from './domains/player/player-handler';
import { GamesController } from './controllers/games.controller';
import { IdentityController } from './controllers/identity.controller';
import { PlayersController } from './controllers/players.controller';
import { UptimeController } from './controllers/uptime.controller';
import { FirebaseAuthGuard } from './security';

/**
 * Composition root of the application. It replaces the former `Routes` class:
 * the event store, the repositories and the event publisher are now provided by
 * the Nest injector and injected into the controllers.
 */
@Module({
  controllers: [UptimeController, IdentityController, GamesController, PlayersController],
  providers: [
    FirebaseAuthGuard,
    {
      provide: BFEventsStore,
      useFactory: () => new BFEventsStore(),
    },
    {
      provide: UserIdentityRepository,
      useFactory: (eventsStore: BFEventsStore) => new UserIdentityRepository(eventsStore),
      inject: [BFEventsStore],
    },
    {
      provide: SessionsRepository,
      useFactory: (eventsStore: BFEventsStore) => new SessionsRepository(eventsStore),
      inject: [BFEventsStore],
    },
    {
      provide: GamesRepository,
      useFactory: (eventsStore: BFEventsStore) => new GamesRepository(eventsStore),
      inject: [BFEventsStore],
    },
    {
      provide: PlayersRepository,
      useFactory: (eventsStore: BFEventsStore) => new PlayersRepository(eventsStore),
      inject: [BFEventsStore],
    },
    {
      provide: EventPublisher,
      useFactory: (
        eventsStore: BFEventsStore,
        sessionsRepository: SessionsRepository,
        gamesRepository: GamesRepository,
        playersRepository: PlayersRepository,
      ) => {
        const eventPublisher = new EventPublisher();
        eventPublisher.onAny(eventsStore.store);
        new SessionHandler(sessionsRepository).register(eventPublisher);
        new GameHandler(gamesRepository).register(eventPublisher);
        new PlayerHandler(playersRepository).register(eventPublisher);

        return eventPublisher;
      },
      inject: [BFEventsStore, SessionsRepository, GamesRepository, PlayersRepository],
    },
  ],
})
export class AppModule {}
