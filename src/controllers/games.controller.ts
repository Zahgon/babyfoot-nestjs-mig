import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';

import { BFEventsStore, EventPublisher, Game, GameId, PositionValue, generateUUID } from '..';
import { GamesRepository } from '../infrastructure/game-repository';
import { GameListItemProjection } from '../domains/game/game-list-item-projection';
import { TeamColors } from '../domains/game/game-id';
import { PlayerId } from '../domains/player';
import { PlayersRepository } from '../infrastructure/player-repository';
import { FirebaseAuthGuard } from '../security';

@Controller('api/games')
@UseGuards(FirebaseAuthGuard)
export class GamesController {
  constructor(
    @Inject(BFEventsStore) public eventsStore: BFEventsStore,
    @Inject(GamesRepository) public gamesRepository: GamesRepository,
    @Inject(PlayersRepository) public playersRepository: PlayersRepository,
    @Inject(EventPublisher) public eventPublisher: EventPublisher,
  ) {}

  @Post()
  public createGame() {
    const id = generateUUID();
    // call COMMAND on Aggregate (this time it is a static method, because the Entity does not yet exist)
    Game.createGame(this.eventPublisher, id);

    // send response
    return {
      gameId: new GameId(id),
      // TODO: the HATEOAS links should be generated in some way given the state of the Game. Maybe it is a new ActionsOnGameProjection ?
      end: `/api/games/${encodeURIComponent(id)}/end`,
      start: `/api/games/${encodeURIComponent(id)}/start`,
      url: '/api/games/' + encodeURIComponent(id),
    };
  }

  @Get(':id')
  public getGame(@Param('id') id: string, @Query('_embedded') embedded?: string) {
    // create ID value type based on request parameters
    const gameId = new GameId(id);

    // call COMMAND on Aggregate (this time it is a static method, because the Entity does not yet exist)
    const found: Game = this.gamesRepository.getGame(gameId);
    const embedPlayers = embedded
      ? (list: Array<PlayerId>) => list.map(it => this.playersRepository.getPlayerFromList(it))
      : (list: Array<PlayerId>) => list;
    // send response
    return this.standardGameOKResponseWithAddedAttributes(gameId, {
      currentEndDatetime: found.projection.currentEndDatetime,
      currentStartDatetime: found.projection.currentStartDatetime,
      duration: found.projection.duration,
      initialDatetime: found.projection.initialDatetime,
      isDeleted: found.projection.isDeleted,
      players: embedPlayers(found.projection.players),
      pointsTeamBlue: found.projection.pointsTeamBlue,
      pointsTeamRed: found.projection.pointsTeamRed,
      teamBlueMembers: embedPlayers(found.projection.teamBlueMembers),
      teamRedMembers: embedPlayers(found.projection.teamRedMembers),
      winner: found.projection.winner,

      end: `/api/games/${encodeURIComponent(gameId.id)}/end`,
      start: `/api/games/${encodeURIComponent(gameId.id)}/start`,
    });
  }

  @Get()
  public getGameList() {
    // TODO : add _embedded option? (will be 1000 times slower)

    const all: Array<GameListItemProjection> = this.gamesRepository.getGames();

    // send response
    return {
      list: all.map(game => {
        return {
          created: game.timestamp,
          gameId: game.gameId,

          url: '/api/games/' + encodeURIComponent(game.gameId.id),
        };
      }),
      url: '/api/games',
    };
  }

  @Post(':id/start')
  @HttpCode(200)
  public startGame(@Param('id') id: string) {
    const now = new Date();
    // create ID value type based on request parameters
    const gameId = new GameId(id);
    // find Aggregate for this ID in repository
    const game = this.gamesRepository.getGame(gameId);
    // call COMMAND on Aggregate
    game.startGame(this.eventPublisher);

    return this.standardGameOKResponseWithAddedAttributes(gameId, {
      end: `/api/games/${encodeURIComponent(gameId.id)}/end`,
      time: now,
    });
  }

  @Post(':id/end')
  @HttpCode(200)
  public endGame(@Param('id') id: string) {
    const now = new Date();
    // create ID value type based on request parameters
    const gameId = new GameId(id);
    // find Aggregate for this ID in repository
    const game = this.gamesRepository.getGame(gameId);
    // call COMMAND on Aggregate
    game.endGame(this.eventPublisher);

    return this.standardGameOKResponseWithAddedAttributes(gameId, { time: now });
  }

  @Post(':id')
  @HttpCode(200)
  public updateGame(@Param('id') id: string, @Body() body: any = {}) {
    // create ID value type based on request parameters
    const gameId = new GameId(id);
    const initialDatetime = body.initialDatetime;
    // find Aggregate for this ID in repository
    const game = this.gamesRepository.getGame(gameId);
    // call COMMAND on Aggregate
    game.updateInitialDateTime(this.eventPublisher, initialDatetime);

    // API User should make a GET after this. This endpoint does not send the updated Game projection.
    return this.standardGameOKResponseWithAddedAttributes(gameId, {
      end: `/api/games/${encodeURIComponent(gameId.id)}/end`,
      start: `/api/games/${encodeURIComponent(gameId.id)}/start`,
    });
  }

  @Delete(':id')
  public deleteGame(@Param('id') id: string) {
    const gameId = new GameId(id);
    const game = this.gamesRepository.getGame(gameId);
    game.deleteGame(this.eventPublisher);

    return this.standardGameOKResponseWithAddedAttributes(gameId);
  }

  @Post(':id/goals/:player')
  @HttpCode(200)
  public addGoalFromPlayerToGame(@Param('id') id: string, @Param('player') player: string) {
    const gameId = new GameId(id);
    const playerId = new PlayerId(player);

    // find Aggregate for this ID in repository
    const game = this.gamesRepository.getGame(gameId);

    // call COMMAND on Aggregate
    game.addGoalFromPlayer(this.eventPublisher, playerId);

    return this.standardGameOKResponseWithAddedAttributes(gameId, { playerId });
  }

  @Get(':id/players')
  public getPlayersInGame(@Param('id') id: string) {
    const gameId = new GameId(id);

    // find Aggregate for this ID in repository
    const found = this.gamesRepository.getGame(gameId);

    return this.standardGameOKResponseWithAddedAttributes(
      gameId,
      {
        players: found.projection.players,
        pointsTeamBlue: found.projection.pointsTeamBlue,
        pointsTeamRed: found.projection.pointsTeamRed,
        teamBlueMembers: found.projection.teamBlueMembers,
        teamRedMembers: found.projection.teamRedMembers,
        winner: found.projection.winner,
      },
      '/players',
    );
  }

  @Post(':id/players/:player/:team')
  @HttpCode(200)
  public addPlayerToGame(@Param('id') id: string, @Param('player') player: string, @Param('team') team: string) {
    const gameId = new GameId(id);
    const playerId = new PlayerId(player);
    const teamColor: TeamColors = team as TeamColors;

    // find Aggregate for this ID in repository
    const found = this.gamesRepository.getGame(gameId);

    // call COMMAND on Aggregate
    found.addPlayerToGame(this.eventPublisher, playerId, teamColor);

    return this.standardGameOKResponseWithAddedAttributes(gameId, { playerId, team: teamColor }, '/players');
  }

  @Delete(':id/players/:player')
  public removePlayerFromGame(@Param('id') id: string, @Param('player') player: string) {
    const gameId = new GameId(id);
    const playerId = new PlayerId(player);

    // find Aggregate for this ID in repository
    const found = this.gamesRepository.getGame(gameId);

    // call COMMAND on Aggregate
    found.removePlayerFromGame(this.eventPublisher, playerId);

    return this.standardGameOKResponseWithAddedAttributes(gameId, { playerId }, '/players');
  }

  @Post(':id/players/:player/position/:position')
  @HttpCode(200)
  public changeUserPositionToGame(
    @Param('id') id: string,
    @Param('player') playerParam: string,
    @Param('position') positionParam: string,
  ) {
    const gameId = new GameId(id);
    const player = new PlayerId(playerParam);
    const position: PositionValue = positionParam as PositionValue;

    // find Aggregate for this ID in repository
    const found = this.gamesRepository.getGame(gameId);

    // call COMMAND on Aggregate
    found.changeUserPositionOnGame(this.eventPublisher, player, position);

    return this.standardGameOKResponseWithAddedAttributes(gameId, {
      player,
      position,
    });
  }

  // @Get(':id/comments') getCommentsOnGame
  // @Post(':id/comments') addCommentToGame
  // @Post(':id/comments/:commentId') changeCommentOnGame
  // @Delete(':id/comments/:commentId') removeCommentOnGame

  // @Get(':id/reviews') getReviewsOnGame
  // @Post(':id/reviews') addReviewOnGame
  // @Post(':id/reviews/:reviewId') updateReviewOnGame
  // @Delete(':id/reviews/:reviewId') removeReviewOnGame

  private standardGameOKResponseWithAddedAttributes(
    gameId: GameId,
    addThisToTheBody: any = {},
    context: string = '',
  ): any {
    return {
      gameId,
      ...addThisToTheBody, // destructuring FTW! \o/
      url: `/api/games/${encodeURIComponent(gameId.id)}${context}`,
    };
  }
}
