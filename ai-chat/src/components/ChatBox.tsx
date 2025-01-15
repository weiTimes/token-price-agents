import React, { useEffect, useRef, useState } from 'react';
import { Card, message } from 'antd';
import {
  RobotOutlined,
  UserOutlined,
  BulbOutlined,
  ClockCircleOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { Bubble, Welcome, Sender, Prompts } from '@ant-design/x';
import type { GetProp, GetRef } from 'antd';
import type { PromptProps } from '@ant-design/x';
import { createIntent } from '../services/api';
import { webSocketService } from '../services/websocket';

interface Message {
  id: string;
  type: 'user' | 'bot' | 'notification';
  content: string;
  timestamp: Date;
}

const USER_ID = 'user123'; // 在实际应用中，这应该是从认证系统获取的

const roles: GetProp<typeof Bubble.List, 'roles'> = {
  bot: {
    placement: 'start',
    avatar: { icon: <RobotOutlined />, style: { background: '#fde3cf' } },
    style: { maxWidth: 600 },
  },
  user: {
    placement: 'end',
    avatar: { icon: <UserOutlined />, style: { background: '#87d068' } },
  },
  notification: {
    placement: 'start',
    avatar: { icon: <RobotOutlined />, style: { background: '#91caff' } },
    style: { maxWidth: 600 },
  },
};

const promptItems: PromptProps[] = [
  {
    key: '1',
    icon: <BulbOutlined style={{ color: '#FFD700' }} />,
    label: '简单价格监控',
    description: '当价格高于100时通知我',
  },
  {
    key: '2',
    icon: <ClockCircleOutlined style={{ color: '#1890FF' }} />,
    label: '定时价格监控',
    description: '每分钟通知我，当价格高于105时',
  },
  {
    key: '3',
    icon: <LineChartOutlined style={{ color: '#722ED1' }} />,
    label: '复杂价格模式',
    description:
      '每秒通知我，当开盘价低于前一价格柱开盘价，且收盘价高于前一价格柱收盘价时',
  },
];

export const ChatBox: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [userScrolled, setUserScrolled] = useState(false);
  const listRef = useRef<GetRef<typeof Bubble.List>>(null);

  useEffect(() => {
    // 添加欢迎消息（仅在第一次渲染时添加）
    addMessage({
      type: 'bot',
      content: '你好！我是价格监控助手。你可以点击下方的示例来了解如何使用我。',
    });

    // 连接 WebSocket
    webSocketService.connect(USER_ID);

    // 监听通知消息
    const unsubscribe = webSocketService.onMessage((data) => {
      addMessage({
        type: 'notification',
        content: data.message,
      });
    });

    return () => {
      unsubscribe();
      webSocketService.disconnect();
    };
  }, []);

  useEffect(() => {
    // 只有在用户没有手动滚动时，才自动滚动到最新消息
    if (!userScrolled) {
      listRef.current?.scrollTo({ key: messages.length - 1, block: 'end' });
    }
  }, [messages, userScrolled]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;
    const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 1;

    // 如果滚动到底部，重置 userScrolled 标记
    if (isAtBottom) {
      setUserScrolled(false);
    } else {
      setUserScrolled(true);
    }
  };

  const addMessage = (msg: Partial<Message>) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      timestamp: new Date(),
      ...msg,
    } as Message;

    setMessages((prev) => [...prev, newMessage]);
  };

  const handleSubmit = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue;
    setInputValue('');
    setLoading(true);

    // 添加用户消息
    addMessage({
      type: 'user',
      content: userMessage,
    });

    try {
      // 发送意图到服务器
      const response = await createIntent({
        userId: USER_ID,
        intent: userMessage,
      });

      // 添加机器人响应
      addMessage({
        type: 'bot',
        content: `我已经记录了你的监控条件：${response.condition.description}`,
      });
    } catch (error) {
      message.error('发送失败，请重试');
      console.error('Failed to send intent:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setLoading(false);
    setInputValue('');
  };

  const handlePromptClick = (info: { data: PromptProps }) => {
    if (typeof info.data.description === 'string') {
      setInputValue(info.data.description);
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <Welcome
        icon="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*s5sNRo5LjfQAAAAAAAAAAAAADgCCAQ/fmt.webp"
        title="代币价格监控助手"
        description="基于自然语言的智能价格监控系统，支持多种监控条件和通知方式，让价格监控更简单、更智能！"
      />
      <Card style={{ width: 800, margin: '12px auto' }}>
        <div style={{ height: 600, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{ flex: 1, overflow: 'auto', marginBottom: '10px' }}
            onScroll={handleScroll}
          >
            <Bubble.List
              autoScroll
              ref={listRef}
              roles={roles}
              items={messages.map((msg, index) => ({
                key: index,
                role: msg.type,
                content: <div className="bubble-text">{msg.content}</div>,
              }))}
            />
          </div>
          <Prompts
            title="✨ 示例监控条件"
            items={promptItems}
            onItemClick={handlePromptClick}
            style={{ marginBottom: '12px' }}
          />
          <Sender
            loading={loading}
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            placeholder="输入你想监控的价格条件..."
          />
        </div>
      </Card>
    </div>
  );
};
