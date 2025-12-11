import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma.service';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load test environment variables
config({ path: resolve(__dirname, '../.env.test') });

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: number;
  let postId: number;

  beforeAll(async () => {
    // Verify we're using test database
    console.log('🧪 Test Database:', process.env.DATABASE_URL);
    if (!process.env.DATABASE_URL?.includes('test.db')) {
      throw new Error('❌ DANGER: Not using test database! Aborting tests to protect data.');
    }
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api');

    prisma = app.get<PrismaService>(PrismaService);

    // Clean database before tests (ONLY in test.db, not dev.db!)
    console.log('🧹 Cleaning test database...');
    await prisma.reply.deleteMany();
    await prisma.post.deleteMany();
    await prisma.user.deleteMany();
    console.log('✅ Test database cleaned');

    await app.init();
  });

  afterAll(async () => {
    // Clean database after tests (ONLY in test.db!)
    console.log('🧹 Cleaning up test database...');
    await prisma.reply.deleteMany();
    await prisma.post.deleteMany();
    await prisma.user.deleteMany();
    console.log('✅ Test cleanup complete');
    await prisma.$disconnect();
    await app.close();
  });

  describe('Root', () => {
    it('/ (GET)', () => {
      return request(app.getHttpServer())
        .get('/api')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Backend API');
          expect(res.body).toHaveProperty('status', 'running');
          expect(res.body).toHaveProperty('version', '1.0.0');
        });
    });

    it('/health (GET)', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('timestamp');
        });
    });
  });

  describe('Authentication', () => {
    const testUser = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('/api/auth/register (POST)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.user).toHaveProperty('email', testUser.email);
          expect(res.body.user).toHaveProperty('name', testUser.name);
          expect(res.body.user).not.toHaveProperty('password');
          userId = res.body.user.id;
        });
    });

    it('/api/auth/register (POST) - duplicate email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('/api/auth/login (POST)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.user).toHaveProperty('email', testUser.email);
          accessToken = res.body.accessToken;
        });
    });

    it('/api/auth/login (POST) - invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('/api/auth/refresh (POST)', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: loginRes.body.refreshToken,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });
  });

  describe('Posts', () => {
    describe('Protected Routes', () => {
      it('/api/posts (POST) - unauthorized', () => {
        return request(app.getHttpServer())
          .post('/api/posts')
          .send({
            title: 'Test Post',
            content: 'Test content',
          })
          .expect(401);
      });

      it('/api/posts/:id (PATCH) - unauthorized', () => {
        return request(app.getHttpServer())
          .patch('/api/posts/1')
          .send({
            title: 'Updated',
          })
          .expect(401);
      });

      it('/api/posts/:id (DELETE) - unauthorized', () => {
        return request(app.getHttpServer())
          .delete('/api/posts/1')
          .expect(401);
      });
    });

    describe('CRUD Operations', () => {
      it('/api/posts (POST) - create post', () => {
        return request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            title: 'My First Post',
            content: 'This is my first post content',
            published: true,
          })
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('title', 'My First Post');
            expect(res.body).toHaveProperty('content', 'This is my first post content');
            expect(res.body).toHaveProperty('published', true);
            expect(res.body).toHaveProperty('authorId', userId);
            postId = res.body.id;
          });
      });

      it('/api/posts (POST) - create post with file upload', () => {
        const testImageBuffer = Buffer.from('fake-image-data');
        return request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', `Bearer ${accessToken}`)
          .field('title', 'Post with Image')
          .field('content', 'Post content with image attachment')
          .field('published', 'true')
          .attach('file', testImageBuffer, 'test-image.jpg')
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('title', 'Post with Image');
            expect(res.body).toHaveProperty('fileUrl');
            expect(res.body.fileUrl).toMatch(/^\/uploads\/.+\.jpg$/);
          });
      });

      it('/api/posts (POST) - create post with invalid file type', () => {
        const testFileBuffer = Buffer.from('fake-exe-data');
        return request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', `Bearer ${accessToken}`)
          .field('title', 'Post with Invalid File')
          .field('content', 'Post with invalid file type')
          .field('published', 'true')
          .attach('file', testFileBuffer, 'test.exe')
          .expect(500); // Multer throws internal error for invalid file type
      });

      it('/api/posts (GET) - list posts', () => {
        return request(app.getHttpServer())
          .get('/api/posts')
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('posts');
            expect(res.body).toHaveProperty('total');
            expect(res.body).toHaveProperty('page', 1);
            expect(res.body).toHaveProperty('limit', 10);
            expect(Array.isArray(res.body.posts)).toBe(true);
            expect(res.body.posts.length).toBeGreaterThan(0);
          });
      });

      it('/api/posts?search=First (GET) - search posts', () => {
        return request(app.getHttpServer())
          .get('/api/posts?search=First')
          .expect(200)
          .expect((res) => {
            expect(res.body.posts.length).toBeGreaterThan(0);
            expect(res.body.posts[0].title).toContain('First');
          });
      });

      it('/api/posts/:id (GET) - get single post', () => {
        return request(app.getHttpServer())
          .get(`/api/posts/${postId}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('id', postId);
            expect(res.body).toHaveProperty('title', 'My First Post');
            expect(res.body).toHaveProperty('author');
            expect(res.body).toHaveProperty('replies');
            expect(res.body.author).toHaveProperty('name', 'Test User');
          });
      });

      it('/api/posts/:id (PATCH) - update post', () => {
        return request(app.getHttpServer())
          .patch(`/api/posts/${postId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            title: 'Updated Post Title',
            published: false,
          })
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('title', 'Updated Post Title');
            expect(res.body).toHaveProperty('published', false);
          });
      });

      it('/api/posts/:id/reply (POST) - add reply', () => {
        return request(app.getHttpServer())
          .post(`/api/posts/${postId}/reply`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            content: 'This is a reply to the post',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('content', 'This is a reply to the post');
            expect(res.body).toHaveProperty('postId', postId);
          });
      });

      it('/api/posts/:id (DELETE) - delete post', () => {
        return request(app.getHttpServer())
          .delete(`/api/posts/${postId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('message', 'Post deleted successfully');
          });
      });

      it('/api/posts/:id (GET) - get deleted post', () => {
        return request(app.getHttpServer())
          .get(`/api/posts/${postId}`)
          .expect(404);
      });
    });
  });

  describe('Logout', () => {
    it('/api/auth/logout (POST)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('/api/posts (POST) - after logout', () => {
      // Note: JWT tokens remain valid until expiration (stateless architecture)
      // In production, implement token blacklist or check refreshToken in database
      return request(app.getHttpServer())
        .post('/api/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Post After Logout',
          content: 'JWT still valid until expiration',
        })
        .expect(201); // JWT is still valid (stateless token)
    });
  });
});
