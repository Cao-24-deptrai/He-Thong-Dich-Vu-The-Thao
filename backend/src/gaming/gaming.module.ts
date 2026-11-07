import { Module } from '@nestjs/common';
import { GamingController } from './gaming.controller';
import { GamingService } from './gaming.service';

@Module({
  controllers: [GamingController],
  providers: [GamingService],
  exports: [GamingService],
})
export class GamingModule {}
