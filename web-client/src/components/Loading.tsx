import React from 'react';
import { Spin, Space } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

interface LoadingProps {
  size?: 'small' | 'default' | 'large';
  tip?: string;
  fullScreen?: boolean;
}

const Loading: React.FC<LoadingProps> = ({
  size = 'large',
  tip = 'Loading...',
  fullScreen = false,
}) => {
  const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

  const loadingContent = (
    <Space direction="vertical" align="center">
      <Spin indicator={antIcon} size={size} tip={tip} />
    </Space>
  );

  if (fullScreen) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          zIndex: 9999,
        }}
      >
        {loadingContent}
      </div>
    );
  }

  return loadingContent;
};

export default Loading;
