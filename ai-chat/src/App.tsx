import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { ChatBox } from './components/ChatBox';
import './App.css';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <div className="App">
        <ChatBox />
      </div>
    </ConfigProvider>
  );
}

export default App;
