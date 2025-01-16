import { io, Socket } from 'socket.io-client';
import { config } from '../config';

class WebSocketService {
  private socket: Socket | null = null;
  private messageHandlers: ((data: any) => void)[] = [];

  connect(userId: string) {
    if (!this.socket) {
      this.socket = io(config.apiBaseUrl, {
        transports: ['websocket'],
        query: { userId },
      });

      this.socket.on('connect', () => {
        console.log('Connected to WebSocket server');
      });

      this.socket.on('notification', (data) => {
        console.log('Received notification:', data);
        this.messageHandlers.forEach((handler) => handler(data));
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from WebSocket server');
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onMessage(handler: (data: any) => void) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    };
  }
}

export const webSocketService = new WebSocketService();
