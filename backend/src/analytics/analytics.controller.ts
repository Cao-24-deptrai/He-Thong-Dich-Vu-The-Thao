import { Controller,Get,Query,UseGuards } from '@nestjs/common';
import { ApiBearerAuth,ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { AnalyticsService } from './analytics.service';
@ApiTags('E16 Analytics') @ApiBearerAuth() @Controller('analytics')
@UseGuards(JwtAuthGuard,RolesGuard) @Roles(UserRole.OWNER,UserRole.ADMIN)
export class AnalyticsController {
 constructor(private readonly svc:AnalyticsService){}
 @Get('summary') summary(@Query('from') from?:string,@Query('to') to?:string){return this.svc.summary(from,to);}
}
