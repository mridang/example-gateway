import { Controller, Get, Logger } from '@nestjs/common';
import { getCurrentInvoke } from '@codegenie/serverless-express';

@Controller()
export class AppController {
  @Get('debug')
  debug() {
    return {
      ...getCurrentInvoke(),
    };
  }
}
