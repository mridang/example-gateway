import request from 'supertest';
import { HttpStatus } from '@nestjs/common';
import { End2EndModule } from './e2e.module';
import { AppModule } from '../src/app.module';

const testModule = new End2EndModule({
  imports: [
    {
      module: AppModule,
      providers: [],
    },
  ],
});

describe('app.controller test', () => {
  beforeAll(async () => {
    await testModule.beforeAll();
  });

  afterAll(async () => {
    await testModule.afterAll();
  });

  test('should return the current context', async () => {
    return request(testModule.app.getHttpServer())
      .get('/debug')
      .send()
      .expect(HttpStatus.OK);
  });
});
