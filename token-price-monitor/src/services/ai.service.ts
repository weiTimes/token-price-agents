import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

const TEXT_GENERATION_URL =
  'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

@Injectable()
export class AIService implements OnModuleInit {
  private readonly logger = new Logger(AIService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    this.httpService.axiosRef.interceptors.request.use(
      (config) => {
        if (config.url.indexOf('dashscope.aliyuncs.com') > -1) {
          const apiKey = this.configService.get<string>('ai.apiKey');
          //   this.logger.debug(`Using API key: ${apiKey}`);
          config.headers.Authorization = `Bearer ${apiKey}`;
          config.headers['Content-Type'] = 'application/json';
        }
        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      },
    );
  }

  async parseIntent(userPrompt: string) {
    try {
      //   this.logger.debug(`Parsing intent: ${userPrompt}`);

      const promptTemplate = `
        Context: 你是一个价格监控意图解析助手。请将用户的价格监控意图解析为JSON格式。
        
        价格监控系统支持以下功能：
        1. 监控开盘价(OPEN)、收盘价(CLOSE)、最高价(HIGH)、最低价(LOW)
        2. 支持与固定值比较(FIXED_VALUE)或与前一个价格比较(PREVIOUS)
        3. 支持高于(HIGHER)或低于(LOWER)的比较操作
        4. 支持多个条件的与(AND)或或(OR)组合
        5. 支持通知频率设置：
           - 立即通知(IMMEDIATE)
           - 间隔通知(INTERVAL)，可以指定间隔时间
           - 默认为每秒通知(interval=1000)
           - "每秒通知"对应 interval=1000
           - "每分钟通知"对应 interval=60000
           - "每小时通知"对应 interval=3600000

        请将意图解析为以下JSON格式：
        {
          "conditions": [
            {
              "type": "OPEN|CLOSE|HIGH|LOW",  // 价格类型，必须是这四个之一
              "comparison": "HIGHER|LOWER",    // 比较方式
              "target": "PREVIOUS|FIXED_VALUE", // 比较目标
              "value": number                  // 当target为FIXED_VALUE时的具体值
            }
          ],
          "operator": "AND|OR",               // 多个条件的组合方式
          "notification": {
            "frequency": "IMMEDIATE|INTERVAL", // 通知频率
            "interval": number                // 当frequency为INTERVAL时的间隔（毫秒）
          }
        }

        示例：
        1. "每分钟通知我，当价格高于100时" 应该解析为：
        {
          "conditions": [
            {
              "type": "CLOSE",
              "comparison": "HIGHER",
              "target": "FIXED_VALUE",
              "value": 100
            }
          ],
          "operator": "AND",
          "notification": {
            "frequency": "INTERVAL",
            "interval": 60000
          }
        }

        2. "每秒通知我，当开盘价低于前一个开盘价，且收盘价高于前一个收盘价时" 应该解析为：
        {
          "conditions": [
            {
              "type": "OPEN",
              "comparison": "LOWER",
              "target": "PREVIOUS"
            },
            {
              "type": "CLOSE",
              "comparison": "HIGHER",
              "target": "PREVIOUS"
            }
          ],
          "operator": "AND",
          "notification": {
            "frequency": "INTERVAL",
            "interval": 1000
          }
        }

        3. "当开盘价低于前一个开盘价，且收盘价高于前一个收盘价时立即通知我" 应该解析为：
        {
          "conditions": [
            {
              "type": "OPEN",
              "comparison": "LOWER",
              "target": "PREVIOUS"
            },
            {
              "type": "CLOSE",
              "comparison": "HIGHER",
              "target": "PREVIOUS"
            }
          ],
          "operator": "AND",
          "notification": {
            "frequency": "IMMEDIATE"
          }
        }

        请解析以下意图，只返回JSON，不要其他输出：
        ${userPrompt}
      `;

      const response = await firstValueFrom(
        this.httpService.post(TEXT_GENERATION_URL, {
          model: 'qwen-turbo',
          messages: [
            {
              role: 'system',
              content: '你是一个价格监控意图解析助手',
            },
            {
              role: 'user',
              content: promptTemplate,
            },
          ],
          parameters: {
            result_format: 'message',
            temperature: 0.5,
          },
        }),
      );

      //   this.logger.debug('API Response:', response.data);

      const content = response.data?.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('Invalid API response format');
      }

      //   this.logger.debug('Raw content:', content);

      // 去除JSON中的注释和markdown标记
      const cleanContent = content
        .replace(/(\/\/.*)|(\/\*[\s\S]*?\*\/)/g, '')
        .replace(/(```json)|(```[\S\s]*$)/g, '');

      //   this.logger.debug('Cleaned content:', cleanContent);

      const parsedJson = JSON.parse(cleanContent);
      //   this.logger.debug('Parsed JSON:', parsedJson);

      return parsedJson;
    } catch (error) {
      if (error instanceof AxiosError) {
        this.logger.error('API request failed:', {
          status: error.response?.status,
          data: error.response?.data,
        });
        throw new Error(`API请求失败: ${error.message}`);
      }

      this.logger.error('Failed to parse intent:', error);
      throw new Error(`无法解析意图: ${error.message}`);
    }
  }
}
