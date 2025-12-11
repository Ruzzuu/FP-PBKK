import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { HttpException, HttpStatus } from '@nestjs/common';

export function handlePrismaError(error: any): never {
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        throw new HttpException(
          `Duplicate field value: ${error.meta?.target}`,
          HttpStatus.CONFLICT,
        );
      case 'P2025':
        throw new HttpException('Record not found', HttpStatus.NOT_FOUND);
      case 'P2003':
        throw new HttpException(
          'Foreign key constraint failed',
          HttpStatus.BAD_REQUEST,
        );
      default:
        throw new HttpException(
          'Database error occurred',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }
  }
  throw error;
}
