import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { handlePrismaError } from '../common/prisma-error.handler';
import { MailService } from '../mail/mail.service';

@Injectable()
export class PostsService {
  constructor(
    private db: DatabaseService,
    
    private mailService: MailService,
  ) {}

  async create(userId: string, createPostDto: CreatePostDto) {
    try {
      // Create post with relation to user
      const post = await this.db.post.create({
        data: {
          ...createPostDto,
          authorId: userId,
        },
        include: {
          author: {
            select: { id: true, email: true, name: true },
          },
        },
      });

      // Send email notification (async, don't wait)
      this.mailService.sendPostCreatedEmail(
        post.author.email,
        post.author.name,
        post.title,
        post.id,
      );

      return post;
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    try {
      const skip = (page - 1) * limit;

      const where = search
        ? {
            OR: [
              { title: { contains: search } },
              { content: { contains: search } },
            ],
          }
        : {};

      const [posts, total] = await Promise.all([
        this.db.post.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: { id: true, email: true, name: true },
            },
            _count: {
              select: { replies: true },
            },
          },
        }),
        this.db.post.count({ where }),
      ]);

      return {
        posts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('Error in findAll:', error);
      handlePrismaError(error);
    }
  }

  async findOne(id: string) {
    const post = await this.db.post.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, email: true, name: true },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  async update(id: string, userId: string, updatePostDto: UpdatePostDto) {
    try {
      // Check if post exists and user owns it
      const post = await this.db.post.findUnique({
        where: { id },
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      if (post.authorId !== userId) {
        throw new ForbiddenException('You can only update your own posts');
      }

      const updatedPost = await this.db.post.update({
        where: { id },
        data: updatePostDto,
        include: {
          author: {
            select: { id: true, email: true, name: true },
          },
        },
      });

      return updatedPost;
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async remove(id: string, userId: string) {
    try {
      // Check if post exists and user owns it
      const post = await this.db.post.findUnique({
        where: { id },
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      if (post.authorId !== userId) {
        throw new ForbiddenException('You can only delete your own posts');
      }

      await this.db.post.delete({
        where: { id },
      });

      return { message: 'Post deleted successfully' };
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async createReply(postId: string, content: string, userId: string) {
    try {
      // Check if post exists
      const post = await this.db.post.findUnique({
        where: { id: postId },
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      return await this.db.reply.create({
        data: {
          content,
          postId,
          authorId: userId,
        },
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async deleteReply(replyId: string, userId: string) {
    try {
      // Find the reply
      const reply = await this.db.reply.findUnique({
        where: { id: replyId },
      });

      if (!reply) {
        throw new NotFoundException('Reply not found');
      }

      // Check if user is the author of the reply
      if (reply.authorId !== userId) {
        throw new ForbiddenException('You can only delete your own replies');
      }

      // Delete the reply
      await this.db.reply.delete({
        where: { id: replyId },
      });

      return { message: 'Reply deleted successfully' };
    } catch (error) {
      handlePrismaError(error);
    }
  }
}

