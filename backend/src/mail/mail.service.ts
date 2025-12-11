import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    // Setup email transporter
    // For development: using Ethereal Email (fake SMTP service)
    // For production: replace with real SMTP credentials (Gmail, SendGrid, etc.)
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    try {
      // Create test account for development
      const testAccount = await nodemailer.createTestAccount();

      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      this.logger.log('Email service initialized with Ethereal Email');
      this.logger.log(`Preview emails at: https://ethereal.email`);
    } catch (error) {
      this.logger.error('Failed to initialize email service:', error.message);
    }
  }

  async sendWelcomeEmail(to: string, name: string) {
    try {
      const info = await this.transporter.sendMail({
        from: '"Task Manager App" <noreply@taskmanager.com>',
        to: to,
        subject: 'Welcome to Task Manager!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">Welcome to Task Manager!</h2>
            <p>Hi <strong>${name}</strong>,</p>
            <p>Thank you for registering! We're excited to have you on board.</p>
            <p>You can now:</p>
            <ul>
              <li>Create and manage posts</li>
              <li>Upload files and images</li>
              <li>Reply to posts</li>
              <li>Search and filter content</li>
            </ul>
            <p>Get started by creating your first post!</p>
            <br>
            <p>Best regards,<br><strong>Task Manager Team</strong></p>
          </div>
        `,
      });

      this.logger.log(`Welcome email sent to ${to}`);
      this.logger.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      
      return {
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl(info),
      };
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${to}:`, error.message);
      // Don't throw error - email failure shouldn't break registration
    }
  }

  async sendPostCreatedEmail(to: string, userName: string, postTitle: string, postId: string) {
    try {
      const info = await this.transporter.sendMail({
        from: '"Task Manager App" <noreply@taskmanager.com>',
        to: to,
        subject: `Your post "${postTitle}" has been created!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">Post Created Successfully!</h2>
            <p>Hi <strong>${userName}</strong>,</p>
            <p>Your post has been created and is now live!</p>
            <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1F2937;">${postTitle}</h3>
              <p style="color: #6B7280; margin-bottom: 0;">Post ID: ${postId}</p>
            </div>
            <p>You can view, edit, or share your post anytime from your dashboard.</p>
            <br>
            <p>Happy posting!<br><strong>Task Manager Team</strong></p>
          </div>
        `,
      });

      this.logger.log(`Post created email sent to ${to}`);
      this.logger.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      
      return {
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl(info),
      };
    } catch (error) {
      this.logger.error(`Failed to send post created email to ${to}:`, error.message);
    }
  }

  async sendReplyNotificationEmail(
    to: string,
    userName: string,
    postTitle: string,
    replyContent: string,
    replierName: string,
  ) {
    try {
      const info = await this.transporter.sendMail({
        from: '"Task Manager App" <noreply@taskmanager.com>',
        to: to,
        subject: `New reply on your post "${postTitle}" `,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">New Reply on Your Post!</h2>
            <p>Hi <strong>${userName}</strong>,</p>
            <p><strong>${replierName}</strong> replied to your post:</p>
            <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1F2937;">${postTitle}</h3>
              <p style="color: #374151; font-style: italic;">"${replyContent}"</p>
              <p style="color: #9CA3AF; font-size: 12px; margin-bottom: 0;">- ${replierName}</p>
            </div>
            <p>Check out the full conversation in your dashboard!</p>
            <br>
            <p>Best regards,<br><strong>Task Manager Team</strong></p>
          </div>
        `,
      });

      this.logger.log(`Reply notification sent to ${to}`);
      this.logger.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      
      return {
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl(info),
      };
    } catch (error) {
      this.logger.error(`Failed to send reply notification to ${to}:`, error.message);
    }
  }
}
