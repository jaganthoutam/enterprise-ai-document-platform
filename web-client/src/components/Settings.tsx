import React, { useState } from 'react';
import { Form, Switch, Select, Button, message, Card, Divider } from 'antd';
import { useAuth } from '../contexts/AuthContext';

const { Option } = Select;

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      // TODO: Implement settings update
      message.success('Settings updated successfully');
    } catch (error) {
      message.error('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings">
      <Card title="Application Settings">
        <Form
          name="settings"
          initialValues={{
            notifications: true,
            theme: 'light',
            language: 'en',
            timezone: 'UTC',
          }}
          onFinish={onFinish}
          layout="vertical"
        >
          <Divider orientation="left">Notifications</Divider>
          <Form.Item name="notifications" label="Enable Notifications" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Divider orientation="left">Appearance</Divider>
          <Form.Item name="theme" label="Theme">
            <Select>
              <Option value="light">Light</Option>
              <Option value="dark">Dark</Option>
              <Option value="system">System</Option>
            </Select>
          </Form.Item>

          <Divider orientation="left">Language & Region</Divider>
          <Form.Item name="language" label="Language">
            <Select>
              <Option value="en">English</Option>
              <Option value="es">Spanish</Option>
              <Option value="fr">French</Option>
              <Option value="de">German</Option>
            </Select>
          </Form.Item>

          <Form.Item name="timezone" label="Timezone">
            <Select>
              <Option value="UTC">UTC</Option>
              <Option value="EST">Eastern Time</Option>
              <Option value="PST">Pacific Time</Option>
              <Option value="CET">Central European Time</Option>
            </Select>
          </Form.Item>

          <Divider orientation="left">Data & Privacy</Divider>
          <Form.Item name="dataCollection" label="Allow Data Collection" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Save Settings
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Settings;
