import { Controller, Get, Logger } from '@nestjs/common';
import { getCurrentInvoke } from '@codegenie/serverless-express';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  @Get('logme')
  logMe() {
    this.logger.log('this is a test message');
    this.logger.log('this is a test message', 'foo');
    this.logger.log('this is a test message', 'foo', { baz: 'bar' });
    return 'ok';
  }

  @Get('goboom')
  goBoom() {
    try {
      throw new Error('boom');
    } catch (err) {
      this.logger.error('this is a test message', err);
      throw err;
    }
  }

  @Get('debug')
  debug() {
    return {
      ...getCurrentInvoke(),
    };
  }

  @Get('goboom')
  goboom() {
    throw new Error('Oh no!');
  }
}
