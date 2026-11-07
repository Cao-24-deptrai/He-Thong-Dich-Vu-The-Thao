import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Tournament, TournamentSchema } from './schemas/tournament.schema.js';
import { TournamentTeam, TournamentTeamSchema } from './schemas/tournament-team.schema.js';
import { TournamentMatch, TournamentMatchSchema } from './schemas/tournament-match.schema.js';
import { TournamentStanding, TournamentStandingSchema } from './schemas/tournament-standing.schema.js';
import { TournamentService } from './services/tournament.service.js';
import { TournamentRegistrationService } from './services/tournament-registration.service.js';
import { TournamentBracketService } from './services/tournament-bracket.service.js';
import { TournamentPublicController } from './controllers/tournament-public.controller.js';
import { AdminTournamentController } from './controllers/admin-tournament.controller.js';
import { CanteenModule } from '../canteen/canteen.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tournament.name, schema: TournamentSchema },
      { name: TournamentTeam.name, schema: TournamentTeamSchema },
      { name: TournamentMatch.name, schema: TournamentMatchSchema },
      { name: TournamentStanding.name, schema: TournamentStandingSchema },
    ]),
    CanteenModule,
    AuthModule,
  ],
  controllers: [
    TournamentPublicController,
    AdminTournamentController,
  ],
  providers: [
    TournamentService,
    TournamentRegistrationService,
    TournamentBracketService,
  ],
  exports: [
    TournamentService,
    TournamentRegistrationService,
    TournamentBracketService,
  ],
})
export class TournamentModule {}
