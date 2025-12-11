import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from './database/database.service';

@Controller('test')
export class TestController {
  constructor(private db: DatabaseService) {}

  @Get('users')
  async testUsers() {
    try {
      const users = await this.db.user.findMany({ take: 3 });
      return { success: true, count: users.length, users };
    } catch (error) {
      return { success: false, error: error.message, stack: error.stack };
    }
  }

  @Get('posts')
  async testPosts() {
    try {
      const posts = await this.db.post.findMany({ take: 3 });
      return { success: true, count: posts.length, posts };
    } catch (error) {
      return { success: false, error: error.message, stack: error.stack };
    }
  }
}
