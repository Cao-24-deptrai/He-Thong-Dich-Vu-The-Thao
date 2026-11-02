import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Tournament, TournamentSchema } from './schemas/tournament.schema';
import { TournamentTeam, TournamentTeamSchema } from './schemas/tournament-team.schema';
import { TournamentMatch, TournamentMatchSchema } from './schemas/tournament-match.schema';
import { TournamentStanding, TournamentStandingSchema } from './schemas/tournament-standing.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { TournamentsService } from './tournaments.service';
import { TournamentsController } from './tournaments.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tournament.name, schema: TournamentSchema },
      { name: TournamentTeam.name, schema: TournamentTeamSchema },
      { name: TournamentMatch.name, schema: TournamentMatchSchema },
      { name: TournamentStanding.name, schema: TournamentStandingSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [TournamentsController],
  providers: [TournamentsService],
  exports: [TournamentsService],
})
export class TournamentsModule {}
