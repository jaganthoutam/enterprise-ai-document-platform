import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import { styled } from '@mui/material/styles';

const AssistantContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  height: '100vh',
  backgroundColor: '#f5f5f5',
}));

const ChatContainer = styled(Paper)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  margin: theme.spacing(2),
  padding: theme.spacing(2),
}));

const MessageList = styled(Box)(({ theme }) => ({
  flex: 1,
  overflow: 'auto',
  marginBottom: theme.spacing(2),
}));

const InputContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
}));

const DocumentCards = styled(Paper)(({ theme }) => ({
  width: '300px',
  padding: theme.spacing(2),
  margin: theme.spacing(2),
  backgroundColor: '#f8f9fa',
}));

interface Message {
  sender: 'user' | 'ai';
  content: string;
  timestamp: string;
}

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'user',
      content: 'What are the key terms in the ACME Services Agreement?',
      timestamp: '10:30 AM',
    },
    {
      sender: 'ai',
      content:
        'Based on the ACME Services Agreement, the key terms include:\n- 24-month contract term with automatic renewal\n- Net 30 payment terms with 1.5% late fee\n- 99.9% uptime SLA with service credits\n- 60-day termination notice required\n\nWould you like me to explain any of these terms in more detail?',
      timestamp: '10:31 AM',
    },
  ]);

  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      setMessages([
        ...messages,
        {
          sender: 'user',
          content: input,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setInput('');
    }
  };

  return (
    <AssistantContainer>
      <ChatContainer>
        <Typography variant="h5" gutterBottom>
          AI Assistant
        </Typography>
        <MessageList>
          {messages.map((message, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                mb: 2,
              }}
            >
              <Paper
                sx={{
                  p: 2,
                  maxWidth: '70%',
                  backgroundColor: message.sender === 'user' ? '#e3f2fd' : '#f5f5f5',
                }}
              >
                <Typography variant="body1">{message.content}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {message.timestamp}
                </Typography>
              </Paper>
            </Box>
          ))}
        </MessageList>
        <InputContainer>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Type your message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSend()}
          />
          <Button variant="contained" color="primary" onClick={handleSend}>
            Send
          </Button>
        </InputContainer>
      </ChatContainer>

      <DocumentCards>
        <Typography variant="h6" gutterBottom>
          Document References
        </Typography>
        <List>
          <ListItem>
            <ListItemText primary="ACME Services Agreement" secondary="Section 3.2" />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemText primary="Previous Version Changes" secondary="Updated May 5, 2025" />
          </ListItem>
        </List>
      </DocumentCards>
    </AssistantContainer>
  );
};

export default AIAssistant;
