import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Avatar, 
  CircularProgress, 
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SendIcon from '@mui/icons-material/Send';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import { useAuth } from '../../contexts/AuthContext';
import { aiAPI } from '../../services/api';
import ReactMarkdown from 'react-markdown';

// Styled components
const ChatContainer = styled(Paper)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: 'calc(100vh - 180px)',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden'
}));

const MessagesContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2)
}));

const MessageBubble = styled(Paper)(({ theme, isUser }) => ({
  padding: theme.spacing(2),
  maxWidth: '80%',
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  backgroundColor: isUser ? theme.palette.primary.main : theme.palette.grey[100],
  color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
  borderRadius: theme.shape.borderRadius,
  position: 'relative'
}));

const InputContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  padding: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper
}));

const SourceBadge = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: theme.spacing(0.5, 1),
  backgroundColor: theme.palette.primary.light,
  color: theme.palette.primary.contrastText,
  borderRadius: 12,
  fontSize: '0.75rem',
  marginTop: theme.spacing(1),
  marginRight: theme.spacing(1),
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.palette.primary.main,
  },
}));

/**
 * AIAssistant Component
 * Provides a chat interface for interacting with the AI assistant
 */
const AIAssistant = () => {
  // State
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  
  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Auth context
  const { currentUser } = useAuth();
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Initialize conversation
  useEffect(() => {
    // Check if there's a saved conversation ID in local storage
    const savedConversationId = localStorage.getItem('aiConversationId');
    const savedMessages = localStorage.getItem('aiMessages');
    
    if (savedConversationId) {
      setConversationId(savedConversationId);
      
      if (savedMessages) {
        try {
          setMessages(JSON.parse(savedMessages));
        } catch (err) {
          console.error('Error parsing saved messages:', err);
          // Clear corrupted messages
          localStorage.removeItem('aiMessages');
        }
      }
    } else {
      // Create a new conversation ID
      createNewConversation();
    }
  }, []);
  
  // Save messages when they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('aiMessages', JSON.stringify(messages));
    }
  }, [messages]);
  
  // Create a new conversation
  const createNewConversation = () => {
    const newConversationId = `conv_${Date.now()}`;
    setConversationId(newConversationId);
    localStorage.setItem('aiConversationId', newConversationId);
    setMessages([]);
    localStorage.removeItem('aiMessages');
  };
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Handle input change
  const handleInputChange = (e) => {
    setInput(e.target.value);
  };
  
  // Handle send message
  const handleSendMessage = async () => {
    // Don't send empty messages
    if (!input.trim()) {
      return;
    }
    
    // Add user message to chat
    const userMessage = {
      content: input.trim(),
      role: 'user',
      timestamp: new Date().toISOString()
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setError(null);
    setLoading(true);
    
    try {
      // Prepare messages array for API
      const messageHistory = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Call AI API
      const response = await aiAPI.chatWithAI({
        messages: messageHistory,
        conversationId,
        useAgent: true // Use Bedrock agent for enhanced capabilities
      });
      
      if (response.data) {
        // Add AI response to chat
        const aiMessage = {
          content: response.data.message || response.data.content,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          sources: response.data.sources || []
        };
        
        setMessages(prevMessages => [...prevMessages, aiMessage]);
      } else {
        throw new Error('Invalid response from AI service');
      }
    } catch (err) {
      console.error('Error sending message to AI:', err);
      setError(err.message || 'Failed to communicate with AI service');
    } finally {
      setLoading(false);
      // Focus back on input
      inputRef.current?.focus();
    }
  };
  
  // Handle keypress in input field
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Start a new conversation
  const handleNewConversation = () => {
    createNewConversation();
  };
  
  // Export conversation as text
  const handleExportConversation = () => {
    if (messages.length === 0) {
      return;
    }
    
    // Format messages as text
    const conversationText = messages.map(msg => {
      const role = msg.role === 'user' ? 'You' : 'AI Assistant';
      return `${role}: ${msg.content}`;
    }).join('\n\n');
    
    // Create a blob and download
    const blob = new Blob([conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-conversation-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  // Handle click on source badge
  const handleSourceClick = (documentId) => {
    // Navigate to document viewer
    window.location.href = `/documents/${documentId}`;
  };
  
  // Render source badges
  const renderSourceBadges = (sources) => {
    if (!sources || sources.length === 0) {
      return null;
    }
    
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', mt: 1 }}>
        {sources.map((source, index) => (
          <SourceBadge 
            key={index}
            onClick={() => handleSourceClick(source.documentId)}
          >
            Source: {source.title || source.documentId}
          </SourceBadge>
        ))}
      </Box>
    );
  };
  
  // Render message content with markdown support
  const renderMessageContent = (content) => {
    return (
      <ReactMarkdown>
        {content}
      </ReactMarkdown>
    );
  };
  
  return (
    <ChatContainer elevation={2}>
      {/* Chat Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">AI Assistant</Typography>
        <Box>
          <Tooltip title="Start new conversation">
            <IconButton onClick={handleNewConversation} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export conversation">
            <IconButton onClick={handleExportConversation} size="small" disabled={messages.length === 0}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Messages Container */}
      <MessagesContainer>
        {messages.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
            <Typography variant="h6">Start a conversation with the AI Assistant</Typography>
            <Typography variant="body2" color="textSecondary">
              Ask questions about documents, policies, or any other information
            </Typography>
          </Box>
        ) : (
          messages.map((message, index) => (
            <MessageBubble key={index} isUser={message.role === 'user'} elevation={1}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar 
                  sx={{ 
                    width: 24, 
                    height: 24, 
                    mr: 1,
                    bgcolor: message.role === 'user' ? 'primary.dark' : 'secondary.main'
                  }}
                >
                  {message.role === 'user' ? 'U' : 'AI'}
                </Avatar>
                <Typography variant="caption" color={message.role === 'user' ? 'inherit' : 'textSecondary'}>
                  {message.role === 'user' ? 'You' : 'AI Assistant'}
                </Typography>
              </Box>
              
              <Typography variant="body1" component="div">
                {renderMessageContent(message.content)}
              </Typography>
              
              {message.role === 'assistant' && renderSourceBadges(message.sources)}
            </MessageBubble>
          ))
        )}
        
        {/* Loading indicator */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        
        {/* Error message */}
        {error && (
          <Box sx={{ p: 2, color: 'error.main' }}>
            <Typography variant="body2">{error}</Typography>
          </Box>
        )}
        
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </MessagesContainer>
      
      {/* Input Container */}
      <InputContainer>
        <TextField
          inputRef={inputRef}
          fullWidth
          variant="outlined"
          placeholder="Type your message..."
          multiline
          maxRows={4}
          value={input}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          disabled={loading}
          InputProps={{
            sx: { pr: 1 }
          }}
        />
        <Button
          color="primary"
          variant="contained"
          endIcon={<SendIcon />}
          onClick={handleSendMessage}
          disabled={loading || !input.trim()}
          sx={{ ml: 1, alignSelf: 'flex-end' }}
        >
          Send
        </Button>
      </InputContainer>
    </ChatContainer>
  );
};

export default AIAssistant;