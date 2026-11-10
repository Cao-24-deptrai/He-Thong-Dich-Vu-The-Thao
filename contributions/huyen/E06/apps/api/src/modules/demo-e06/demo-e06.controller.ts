import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'node:path';
import { Public } from '../auth/decorators/auth.decorators.js';

/** Development-only presentation. All business API routes retain JWT and role guards. */
@Controller('demo/e06')
export class DemoE06Controller {
  @Get()
  @Public()
  show(@Res() res: Response) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).send('Not found');
    }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.sendFile(join(process.cwd(), 'public', 'e06.html'));
  }
}
