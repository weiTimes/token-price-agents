import { Controller, Post, Get, Body, Param, Sse } from '@nestjs/common';
import { NotificationService } from '../services/notification.service';
import {
  CreateNotificationPreferenceDto,
  NotificationPreferenceResponseDto,
} from '../dto/notification-preference.dto';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  createNotificationPreference(
    @Body() createDto: CreateNotificationPreferenceDto,
  ): NotificationPreferenceResponseDto {
    return this.notificationService.registerPreference(
      createDto.userId,
      createDto.condition,
    );
  }

  @Get(':id')
  getNotificationPreference(@Param('id') id: string) {
    return this.notificationService.getPreference(id);
  }

  @Get('user/:userId')
  getUserNotificationPreferences(@Param('userId') userId: string) {
    return this.notificationService.getUserPreferences(userId);
  }
}
