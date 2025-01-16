import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ConfigModule } from '@nestjs/config';

const httpsOptions = {
  cors: true,
};

async function bootstrap() {
  await ConfigModule.envVariablesLoaded;
  const app = await NestFactory.create(AppModule, httpsOptions);
  app.useWebSocketAdapter(new IoAdapter(app));
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
