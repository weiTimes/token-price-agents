import { IsString, IsObject, IsNotEmpty } from 'class-validator';
import { PriceCondition } from '../interfaces/price.interface';

export class CreateNotificationPreferenceDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsObject()
  @IsNotEmpty()
  condition: PriceCondition;
}

export class NotificationPreferenceResponseDto {
  id: string;
  userId: string;
  condition: PriceCondition;
  createdAt: Date;
  updatedAt: Date;
}
