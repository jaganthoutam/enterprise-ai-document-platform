import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  Divider,
  Chip,
  Grid,
  Button,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slide,
  Fade,
  useTheme,
  useMediaQuery,
  Alert,
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as AIAvatarIcon,
  Person as UserAvatarIcon,
  Description as DocumentIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  fetchConversations,
  createConversation,
  fetchConversationMessages,
  sendMessage,
} from '../api/aiAssistant';
import { API } from 'aws-amplify';

function AIAssistant() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [newConversationTitle, setNewConversationTitle] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef(null);
  const [editingConversationId, setEditingConversationId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const inputRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [errorBanner, setErrorBanner] = useState('');

  useEffect(() => {
    fetchRecentDocuments();
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
    } else {
      setMessages([]);
    }
  }, [selectedConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (inputRef.current && selectedConversationId) {
      inputRef.current.focus();
    }
  }, [selectedConversationId]);

  const fetchRecentDocuments = async () => {
    try {
      const response = await API.get('api', '/documents/recent');
      setDocuments(response);
    } catch (error) {
      console.error('Error fetching recent documents:', error);
    }
  };

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const data = await fetchConversations();
      setConversations(data);
      if (data.length > 0) {
        setSelectedConversationId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadMessages = async (conversationId) => {
    setLoadingMessages(true);
    try {
      const data = await fetchConversationMessages(conversationId);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedConversationId) return;
    const userMessage = {
      id: Date.now(),
      text: input,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    try {
      const response = await sendMessage(selectedConversationId, userMessage.text, documents.map((doc) => doc.documentId));
      const aiMessage = {
        id: Date.now() + 1,
        text: response.message,
        sender: 'ai',
        timestamp: new Date().toISOString(),
        references: response.references,
      };
      setMessages((prev) => [...prev, aiMessage]);
      // Optionally update conversation list (last message, timestamp)
      loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'ai',
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleSelectConversation = (id) => {
    setSelectedConversationId(id);
  };

  const handleStartNewConversation = async () => {
    setCreatingConversation(true);
    try {
      const newConv = await createConversation(newConversationTitle || 'New Conversation');
      await loadConversations();
      setSelectedConversationId(newConv.id);
      setNewConversationTitle('');
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setCreatingConversation(false);
    }
  };

  const scrollToBottom = () => {
    if (!messagesEndRef.current) return;
    const container = messagesEndRef.current.parentNode;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
    if (isAtBottom) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const deleteConversation = async (id) => {
    // TODO: Implement in your API client
    await API.del('api', `/ai/conversations/${id}`);
  };

  const renameConversation = async (id, title) => {
    // TODO: Implement in your API client
    await API.put('api', `/ai/conversations/${id}`, { body: { title } });
  };

  const handleDeleteConversation = async () => {
    if (!conversationToDelete) return;
    try {
      await deleteConversation(conversationToDelete.id);
      setShowDeleteDialog(false);
      setConversationToDelete(null);
      await loadConversations();
      setSelectedConversationId((prev) => {
        if (prev === conversationToDelete.id) {
          return conversations.length > 1 ? conversations.find((c) => c.id !== prev)?.id : null;
        }
        return prev;
      });
    } catch (error) {
      alert('Failed to delete conversation.');
    }
  };

  const handleRenameConversation = async (id) => {
    try {
      await renameConversation(id, editingTitle);
      setEditingConversationId(null);
      setEditingTitle('');
      await loadConversations();
    } catch (error) {
      alert('Failed to rename conversation.');
    }
  };

  const showError = (msg) => {
    setErrorBanner(msg);
    setTimeout(() => setErrorBanner(''), 4000);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        AI Assistant
      </Typography>
      {errorBanner && (
        <Fade in={!!errorBanner}><Box mb={2}><Alert severity="error">{errorBanner}</Alert></Box></Fade>
      )}
      <Grid container spacing={isMobile ? 1 : 3} direction={isMobile ? 'column' : 'row'}>
        {/* Conversation List */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: isMobile ? 1 : 2, height: isMobile ? 'auto' : '80vh', display: 'flex', flexDirection: 'column', boxShadow: 3, borderRadius: 3 }}>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="New conversation title..."
                value={newConversationTitle}
                onChange={(e) => setNewConversationTitle(e.target.value)}
                disabled={creatingConversation}
                sx={{ flexGrow: 1, mr: 1 }}
                inputProps={{ maxLength: 40 }}
              />
              <IconButton color="primary" onClick={handleStartNewConversation} disabled={creatingConversation || !newConversationTitle.trim()}>
                <AddIcon />
              </IconButton>
            </Box>
            <Divider />
            <Box sx={{ flexGrow: 1, overflow: 'auto', mt: 2 }}>
              {loadingConversations ? (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%"><CircularProgress /></Box>
              ) : conversations.length === 0 ? (
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%">
                  <Typography variant="body2" color="textSecondary">No conversations yet. Start a new one!</Typography>
                </Box>
              ) : (
                <List>
                  {conversations.map((conv) => (
                    <Slide in direction="right" key={conv.id}>
                      <ListItem
                        button
                        selected={conv.id === selectedConversationId}
                        onClick={() => handleSelectConversation(conv.id)}
                        alignItems="flex-start"
                        sx={{
                          bgcolor: conv.id === selectedConversationId ? theme.palette.primary.light : undefined,
                          borderRadius: 1,
                          mb: 1,
                          transition: 'background 0.2s',
                          '&:hover': { bgcolor: theme.palette.action.hover },
                          boxShadow: conv.id === selectedConversationId ? 2 : 0,
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar>
                            <AIAvatarIcon />
                          </Avatar>
                        </ListItemAvatar>
                        {editingConversationId === conv.id ? (
                          <TextField
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            size="small"
                            onBlur={() => setEditingConversationId(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameConversation(conv.id);
                              if (e.key === 'Escape') setEditingConversationId(null);
                            }}
                            autoFocus
                            sx={{ flexGrow: 1, mr: 1 }}
                          />
                        ) : (
                          <ListItemText
                            primary={
                              <Tooltip title={conv.title || 'Untitled'} placement="top">
                                <Typography variant="subtitle2" noWrap sx={{ maxWidth: 120 }}>{conv.title || 'Untitled'}</Typography>
                              </Tooltip>
                            }
                            secondary={
                              <Box>
                                <Tooltip title={conv.lastMessage || ''} placement="top">
                                  <Typography variant="caption" color="textSecondary" noWrap>
                                    {conv.lastMessage ? conv.lastMessage.slice(0, 40) : 'No messages yet.'}
                                  </Typography>
                                </Tooltip>
                                <br />
                                <Tooltip title={conv.updatedAt ? new Date(conv.updatedAt).toLocaleString() : ''} placement="top">
                                  <Typography variant="caption" color="textSecondary">
                                    {conv.updatedAt ? new Date(conv.updatedAt).toLocaleTimeString() : ''}
                                  </Typography>
                                </Tooltip>
                              </Box>
                            }
                          />
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                          {editingConversationId === conv.id ? (
                            <>
                              <IconButton size="small" color="primary" onClick={() => handleRenameConversation(conv.id)}>
                                <CheckIcon />
                              </IconButton>
                              <IconButton size="small" color="secondary" onClick={() => setEditingConversationId(null)}>
                                <CloseIcon />
                              </IconButton>
                            </>
                          ) : (
                            <>
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditingConversationId(conv.id); setEditingTitle(conv.title); }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); setShowDeleteDialog(true); setConversationToDelete(conv); }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </>
                          )}
                        </Box>
                      </ListItem>
                    </Slide>
                  ))}
                </List>
              )}
            </Box>
            <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
              <DialogTitle>Delete Conversation?</DialogTitle>
              <DialogContent>
                <Typography>Are you sure you want to delete this conversation?</Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
                <Button color="error" onClick={handleDeleteConversation}>Delete</Button>
              </DialogActions>
            </Dialog>
          </Paper>
        </Grid>

        {/* Chat Interface */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: isMobile ? 1 : 2, height: isMobile ? 'auto' : '80vh', display: 'flex', flexDirection: 'column', boxShadow: 3, borderRadius: 3 }}>
            <Box sx={{ flexGrow: 1, overflow: 'auto', mb: 2 }}>
              {!selectedConversationId ? (
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%">
                  <Typography variant="body2" color="textSecondary">Select or start a conversation to begin chatting.</Typography>
                </Box>
              ) : loadingMessages ? (
                <ListItem><CircularProgress /></ListItem>
              ) : messages.length === 0 ? (
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%">
                  <Typography variant="body2" color="textSecondary">No messages yet. Start the conversation!</Typography>
                </Box>
              ) : (
                <List>
                  {messages.map((message, idx) => (
                    <Fade in key={message.id} timeout={400 + idx * 40}>
                      <React.Fragment>
                        <ListItem
                          alignItems="flex-start"
                          sx={{
                            flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                            transition: 'background 0.2s',
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar>
                              {message.sender === 'user' ? <UserAvatarIcon /> : <AIAvatarIcon />}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box
                                sx={{
                                  bgcolor: message.sender === 'user' ? theme.palette.primary.main : '#f5f5f5',
                                  color: message.sender === 'user' ? 'white' : 'text.primary',
                                  p: 2,
                                  borderRadius: 2,
                                  maxWidth: '70%',
                                  boxShadow: 1,
                                }}
                              >
                                <Typography variant="caption" color="inherit" sx={{ fontWeight: 600 }}>
                                  {message.sender === 'user' ? 'You' : 'AI Assistant'}
                                </Typography>
                                <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>{message.text}</Typography>
                                {message.references && (
                                  <Box mt={1}>
                                    <Typography variant="caption" color="textSecondary">
                                      References:
                                    </Typography>
                                    {message.references.map((ref) => (
                                      <Chip
                                        key={ref.documentId}
                                        icon={<DocumentIcon />}
                                        label={ref.title}
                                        size="small"
                                        sx={{ ml: 1 }}
                                        onClick={() => window.open(`/documents/${ref.documentId}`, '_blank')}
                                      />
                                    ))}
                                  </Box>
                                )}
                              </Box>
                            }
                            secondary={
                              <Tooltip title={new Date(message.timestamp).toLocaleString()} placement="top">
                                <Typography
                                  variant="caption"
                                  color="textSecondary"
                                  sx={{
                                    textAlign: message.sender === 'user' ? 'right' : 'left',
                                    mt: 1,
                                  }}
                                >
                                  {new Date(message.timestamp).toLocaleTimeString()}
                                </Typography>
                              </Tooltip>
                            }
                          />
                        </ListItem>
                        <Divider variant="inset" component="li" />
                      </React.Fragment>
                    </Fade>
                  ))}
                  {loading && (
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar>
                          <AIAvatarIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <Box display="flex" alignItems="center" gap={1}>
                        <CircularProgress size={24} />
                        <Typography variant="body2" color="textSecondary">AI Assistant is typing…</Typography>
                      </Box>
                    </ListItem>
                  )}
                  <div ref={messagesEndRef} />
                </List>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', pt: 1 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading || !selectedConversationId}
                multiline
                maxRows={4}
                inputRef={inputRef}
                sx={{ borderRadius: 2, bgcolor: 'background.paper' }}
              />
              <IconButton
                color="primary"
                onClick={handleSend}
                disabled={loading || !input.trim() || !selectedConversationId}
                sx={{ ml: 1, borderRadius: 2, bgcolor: theme.palette.primary.main, color: 'white', '&:hover': { bgcolor: theme.palette.primary.dark } }}
              >
                <SendIcon />
              </IconButton>
            </Box>
          </Paper>
        </Grid>

        {/* Document Context */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: isMobile ? 1 : 2, height: isMobile ? 'auto' : '80vh', overflow: 'auto', boxShadow: 3, borderRadius: 3 }}>
            <Typography variant="h6" gutterBottom>
              Available Documents
            </Typography>
            <List>
              {documents.map((doc) => (
                <ListItem
                  key={doc.documentId}
                  button
                  onClick={() => window.open(`/documents/${doc.documentId}`, '_blank')}
                  sx={{ borderRadius: 1, mb: 1, '&:hover': { bgcolor: theme.palette.action.hover } }}
                >
                  <ListItemAvatar>
                    <Avatar>
                      <DocumentIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Tooltip title={doc.fileName}><span>{doc.fileName}</span></Tooltip>}
                    secondary={`Last modified: ${new Date(doc.uploadDate).toLocaleDateString()}`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default AIAssistant; 