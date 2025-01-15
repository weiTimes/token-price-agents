import React, { useEffect, useRef, useState } from 'react';
import { Card, Input, Button, List, Avatar, message } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons';
import { createIntent } from '../services/api';
import { webSocketService } from '../services/websocket';

interface Message {
  id: string;
  type: 'user' | 'bot' | 'notification';
  content: string;
  timestamp: Date;
}

const USER_ID = 'user123'; // 在实际应用中，这应该是从认证系统获取的

export const ChatBox: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 连接 WebSocket
    webSocketService.connect(USER_ID);

    // 监听通知消息
    const unsubscribe = webSocketService.onMessage((data) => {
      addMessage({
        type: 'notification',
        content: data.message,
      });
    });

    // 添加欢迎消息
    addMessage({
      type: 'bot',
      content:
        '你好！我是价格监控助手。你可以告诉我你想监控的价格条件，比如："当价格高于100时通知我"',
    });

    return () => {
      unsubscribe();
      webSocketService.disconnect();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addMessage = (msg: Partial<Message>) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      timestamp: new Date(),
      ...msg,
    } as Message;

    setMessages((prev) => [...prev, newMessage]);
  };

  const handleSend = async () => {
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card
      title="代币价格监控助手"
      style={{ width: 600, margin: '20px auto' }}
      bodyStyle={{ padding: '10px' }}
    >
      <div style={{ height: 600, overflowY: 'auto', marginBottom: '10px' }}>
        <List
          itemLayout="horizontal"
          dataSource={messages}
          renderItem={(msg) => (
            <List.Item
              style={{
                flexDirection: msg.type === 'user' ? 'row-reverse' : 'row',
              }}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    icon={
                      msg.type === 'user' ? <UserOutlined /> : <RobotOutlined />
                    }
                  />
                }
                description={
                  <div
                    style={{
                      background:
                        msg.type === 'user'
                          ? '#e6f7ff'
                          : msg.type === 'notification'
                          ? '#f6ffed'
                          : '#f5f5f5',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      maxWidth: '80%',
                      wordBreak: 'break-word',
                    }}
                  >
                    {msg.content}
                  </div>
                }
                style={{
                  textAlign: msg.type === 'user' ? 'right' : 'left',
                }}
              />
            </List.Item>
          )}
        />
        <div ref={messagesEndRef} />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <Input.TextArea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入你想监控的价格条件..."
          autoSize={{ minRows: 1, maxRows: 4 }}
          style={{ flex: 1 }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={loading}
        />
      </div>
    </Card>
  );
};
