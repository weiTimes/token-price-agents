import { IsString, IsNotEmpty } from 'class-validator';

export class CreateIntentDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  intent: string;
}
