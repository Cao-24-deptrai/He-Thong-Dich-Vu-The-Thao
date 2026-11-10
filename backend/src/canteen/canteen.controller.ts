import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CanteenService } from './canteen.service';
@ApiTags('E06 Canteen POS') @ApiBearerAuth()
@Controller('canteen') @UseGuards(JwtAuthGuard,RolesGuard) @Roles(UserRole.STAFF,UserRole.OWNER,UserRole.ADMIN)
export class CanteenController {
 constructor(private readonly svc:CanteenService){}
 @Get('products') products(){return this.svc.listProducts();}
 @Post('products') @Roles(UserRole.OWNER,UserRole.ADMIN) addProduct(@Body() b:{name:string;price:number;stock:number;category?:string}){return this.svc.createProduct(b);}
 @Post('products/:id/stock') @Roles(UserRole.OWNER,UserRole.ADMIN) stock(@Param('id') id:string,@Body('delta') delta:number){return this.svc.stock(id,delta);}
 @Get('shifts/current') current(@Req() req:any){return this.svc.currentShift(req.user.userId);}
 @Post('shifts/open') open(@Req() req:any,@Body('openingCash') cash:number){return this.svc.openShift(req.user.userId,cash);}
 @Post('shifts/:id/close') close(@Req() req:any,@Param('id') id:string,@Body('closingCash') cash:number){return this.svc.closeShift(req.user.userId,id,cash);}
 @Post('orders') order(@Req() req:any,@Body() b:{items:Array<{productId:string;quantity:number}>;paymentMethod:'CASH'|'TRANSFER'}){return this.svc.createOrder(req.user.userId,b);}
 @Get('orders') @Roles(UserRole.OWNER,UserRole.ADMIN) orders(){return this.svc.listOrders();}
}
