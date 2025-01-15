import { Controller, Post, Body } from '@nestjs/common';
import { IntentParserService } from '../services/intent-parser.service';
import { CreateIntentDto } from '../dto/intent.dto';

@Controller('intents')
export class IntentController {
  constructor(private readonly intentParserService: IntentParserService) {}

  @Post()
  createFromIntent(@Body() createIntentDto: CreateIntentDto) {
    return this.intentParserService.processIntent(
      createIntentDto.userId,
      createIntentDto.intent,
    );
  }
}
