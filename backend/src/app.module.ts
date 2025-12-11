import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PostsModule } from './posts/posts.module';
import { DatabaseModule } from './database/database.module';
import { TestController } from './test.controller';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [DatabaseModule, AuthModule, PostsModule, MailModule],
  controllers: [AppController, TestController],
  providers: [AppService],
})
export class AppModule {}
