import { Global, Module } from '@nestjs/common';
import { secretName } from './constants';
import { DefaultsModule } from '@mridang/nestjs-defaults';
import { AppController } from './app.controller';

@Global()
@Module({
  imports: [
    DefaultsModule.register({
      configName: secretName,
    }),
  ],
  controllers: [AppController],
  providers: [
    //
  ],
  exports: [
    //
  ],
})
export class AppModule {
  //
}
