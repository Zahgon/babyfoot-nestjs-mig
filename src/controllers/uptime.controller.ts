import { Controller, Get } from '@nestjs/common';

@Controller('api/health')
export class UptimeController {
  @Get()
  public health(): { status: string } {
    return { status: 'OK' };
  }
}
