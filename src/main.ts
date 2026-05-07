import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptors';
import { HttpExceptionFilter } from './common/filters/http.exception.filter';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({
    origin: [
      'https://fe-insidia.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
