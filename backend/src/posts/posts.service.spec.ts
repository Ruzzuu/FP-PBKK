import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PostsService } from './posts.service';
import { DatabaseService } from '../database/database.service';
import { MailService } from '../mail/mail.service';

describe('PostsService', () => {
  let service: PostsService;
  let db: DatabaseService;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashed',
    refreshToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPost = {
    id: '1',
    title: 'Test Post',
    content: 'Test Content',
    published: true,
    authorId: '1',
    fileUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDatabaseService = {
    post: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    reply: {
      create: jest.fn(),
    },
  };

  const mockMailService = {
    sendPostCreatedEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
    db = module.get<DatabaseService>(DatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createPostDto = {
      title: 'Test Post',
      content: 'Test Content',
      published: true,
    };

    it('should successfully create a post', async () => {
      mockDatabaseService.post.create.mockResolvedValue({
        ...mockPost,
        author: mockUser,
      });

      const result = await service.create('1', createPostDto);

      expect(result).toHaveProperty('id');
      expect(result.title).toBe(createPostDto.title);
      expect(mockDatabaseService.post.create).toHaveBeenCalled();
    });

    it('should create post with file URL', async () => {
      const dtoWithFile = { ...createPostDto, fileUrl: '/uploads/test.jpg' };
      mockDatabaseService.post.create.mockResolvedValue({
        ...mockPost,
        fileUrl: '/uploads/test.jpg',
        author: mockUser,
      });

      const result = await service.create('1', dtoWithFile);

      expect(result.fileUrl).toBe('/uploads/test.jpg');
    });
  });

  describe('findAll', () => {
    it('should return paginated posts', async () => {
      const mockPosts = [mockPost];
      mockDatabaseService.post.findMany.mockResolvedValue(mockPosts);
      mockDatabaseService.post.count.mockResolvedValue(1);

      const result = await service.findAll(1, 10);

      expect(result).toHaveProperty('posts');
      expect(result).toHaveProperty('total', 1);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 10);
      expect(Array.isArray(result.posts)).toBe(true);
    });

    it('should filter posts by search query', async () => {
      mockDatabaseService.post.findMany.mockResolvedValue([mockPost]);
      mockDatabaseService.post.count.mockResolvedValue(1);

      await service.findAll(1, 10, 'Test');

      expect(mockDatabaseService.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a post by ID', async () => {
      mockDatabaseService.post.findUnique.mockResolvedValue({
        ...mockPost,
        author: mockUser,
        replies: [],
      });

      const result = await service.findOne('1');

      expect(result).toHaveProperty('id', '1');
      expect(result).toHaveProperty('author');
    });

    it('should throw NotFoundException if post not found', async () => {
      mockDatabaseService.post.findUnique.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto = { title: 'Updated Title' };

    it('should successfully update a post', async () => {
      mockDatabaseService.post.findUnique.mockResolvedValue(mockPost);
      mockDatabaseService.post.update.mockResolvedValue({
        ...mockPost,
        ...updateDto,
      });

      const result = await service.update('1', '1', updateDto);

      expect(result.title).toBe('Updated Title');
    });

    it('should throw NotFoundException if post not found', async () => {
      mockDatabaseService.post.findUnique.mockResolvedValue(null);

      await expect(service.update('1', '999', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not the author', async () => {
      mockDatabaseService.post.findUnique.mockResolvedValue({
        ...mockPost,
        authorId: '2',
      });

      await expect(service.update('1', '1', updateDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('should successfully delete a post', async () => {
      mockDatabaseService.post.findUnique.mockResolvedValue(mockPost);
      mockDatabaseService.post.delete.mockResolvedValue(mockPost);

      const result = await service.remove('1', '1');

      expect(result).toHaveProperty('message', 'Post deleted successfully');
      expect(mockDatabaseService.post.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException if post not found', async () => {
      mockDatabaseService.post.findUnique.mockResolvedValue(null);

      await expect(service.remove('1', '999')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the author', async () => {
      mockDatabaseService.post.findUnique.mockResolvedValue({
        ...mockPost,
        authorId: '2',
      });

      await expect(service.remove('1', '1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createReply', () => {
    const replyContent = 'Test Reply';
    const testUserId = 'test-user-id';

    it('should successfully add a reply to a post', async () => {
      const mockReply = {
        id: '1',
        content: 'Test Reply',
        postId: '1',
        authorId: testUserId,
        createdAt: new Date(),
      };

      mockDatabaseService.post.findUnique.mockResolvedValue(mockPost);
      mockDatabaseService.reply.create.mockResolvedValue({
        ...mockReply,
        author: mockUser,
      });

      const result = await service.createReply('1', replyContent, testUserId);

      expect(result).toHaveProperty('id');
      expect(result.content).toBe(replyContent);
    });

    it('should throw NotFoundException if post not found', async () => {
      mockDatabaseService.post.findUnique.mockResolvedValue(null);

      await expect(service.createReply('999', replyContent, testUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
