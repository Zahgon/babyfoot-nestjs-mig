import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, UseGuards } from '@nestjs/common';

import { BFEventsStore, EventPublisher } from '..';
import { PlayerListItemProjection, PlayersRepository } from '../infrastructure/player-repository';
import { Player, PlayerId } from '../domains/player';
import { FirebaseAuthGuard } from '../security';

@Controller('api/players')
@UseGuards(FirebaseAuthGuard)
export class PlayersController {
  constructor(
    @Inject(BFEventsStore) public eventsStore: BFEventsStore,
    @Inject(PlayersRepository) public playersRepository: PlayersRepository,
    @Inject(EventPublisher) public eventPublisher: EventPublisher,
  ) {}

  @Post()
  public createPlayer(@Body() body: any = {}) {
    const fields = new Map<string, any>();
    if (!body.displayName) {
      throw new Error('displayName is required');
    }
    fields.set('displayName', body.displayName);
    if (!body.email) {
      throw new Error('email is required');
    }
    fields.set('email', body.email);
    fields.set('avatar', body.avatar);

    // call COMMAND on Aggregate (this time it is a static method, because the Entity does not yet exist)
    const id = Player.createPlayer(this.eventPublisher, fields);

    // send response
    return {
      playerId: id,
      displayName: fields.get('displayName'),
      avatar: fields.get('avatar'),
      email: fields.get('email'),
      // TODO: the HATEOAS links should be generated in some way given the state of the Player. Maybe it is a new ActionsOnPlayerProjection ?
      url: '/api/players/' + encodeURIComponent(id.id),
    };
  }

  @Get(':id')
  public getPlayer(@Param('id') id: string) {
    // create ID value type based on request parameters
    const playerId = new PlayerId(id);

    // call COMMAND on Aggregate (this time it is a static method, because the Entity does not yet exist)
    const found: Player = this.playersRepository.getPlayer(playerId);

    // send response
    return this.standardPlayerOKResponseWithAddedAttributes(playerId, {
      isDeleted: found.projection.isDeleted,
      avatar: found.projection.avatar,
      displayName: found.projection.displayName,
      email: found.projection.email,
    });
  }

  @Get()
  public getPlayerList() {
    // TODO : add _embedded option? (will be 1000 times slower)

    const all: Array<PlayerListItemProjection> = this.playersRepository.getPlayers();

    // send response
    return {
      list: all.map(player => {
        return {
          ...player,
          url: '/api/players/' + encodeURIComponent(player.playerId.id),
        };
      }),
      url: '/api/players',
    };
  }

  @Delete(':id')
  public deletePlayer(@Param('id') id: string) {
    // create ID value type based on request parameters
    const playerId = new PlayerId(id);
    // find Aggregate for this ID in repository
    const player = this.playersRepository.getPlayer(playerId);
    // call COMMAND on Aggregate
    player.deletePlayer(this.eventPublisher);

    return this.standardPlayerOKResponseWithAddedAttributes(playerId);
  }

  @Post(':id')
  @HttpCode(200)
  public updatePlayer(@Param('id') id: string, @Body() body: any = {}) {
    const fields = new Map<string, any>();
    if (!body.displayName) {
      throw new Error('displayName is required');
    }
    fields.set('displayName', body.displayName);
    if (!body.email) {
      throw new Error('email is required');
    }
    fields.set('email', body.email);
    fields.set('avatar', body.avatar);

    // create ID value type based on request parameters
    const playerId = new PlayerId(id);
    // find Aggregate for this ID in repository
    const player = this.playersRepository.getPlayer(playerId);
    // call COMMAND on Aggregate
    player.updatePlayer(this.eventPublisher, fields);

    // find updated Aggregate
    const updatedPlayer = this.playersRepository.getPlayer(playerId);

    return this.standardPlayerOKResponseWithAddedAttributes(playerId, {
      displayName: updatedPlayer.projection.displayName,
      avatar: updatedPlayer.projection.avatar,
      isDeleted: updatedPlayer.projection.isDeleted,
      email: updatedPlayer.projection.email,
    });
  }

  public standardPlayerOKResponseWithAddedAttributes(
    playerId: PlayerId,
    addThisToTheBody: any = {},
    context: string = '',
  ): any {
    return {
      playerId,
      ...addThisToTheBody, // destructuring FTW! \o/
      url: `/api/players/${encodeURIComponent(playerId.id)}${context}`,
    };
  }
}
