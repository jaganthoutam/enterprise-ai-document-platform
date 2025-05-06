import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DescriptionIcon from '@mui/icons-material/Description';
import ChatIcon from '@mui/icons-material/Chat';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import DocumentViewer from './components/DocumentViewer';
import AIAssistant from './components/AIAssistant';

const theme = createTheme({
  palette: {
    primary: {
      main: '#0052CC',
    },
    background: {
      default: '#f5f5f5',
    },
  },
});

const drawerWidth = 240;

const App: React.FC = () => {
  const [activeRoute, setActiveRoute] = useState('/dashboard');

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Documents', icon: <DescriptionIcon />, path: '/documents' },
    { text: 'AI Assistant', icon: <ChatIcon />, path: '/assistant' },
    { text: 'Admin', icon: <AdminPanelSettingsIcon />, path: '/admin' },
  ];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <NotificationProvider>
            <AppProvider>
              <Box sx={{ display: 'flex' }}>
                <AppBar position="fixed" sx={{ zIndex: (theme: any) => theme.zIndex.drawer + 1 }}>
                  <Toolbar>
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                      Bedrock AI
                    </Typography>
                    <Button color="inherit">Logout</Button>
                  </Toolbar>
                </AppBar>
                <Drawer
                  variant="permanent"
                  sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                      width: drawerWidth,
                      boxSizing: 'border-box',
                    },
                  }}
                >
                  <Toolbar />
                  <Box sx={{ overflow: 'auto' }}>
                    <List>
                      {menuItems.map(item => (
                        <ListItem
                          button
                          key={item.text}
                          selected={activeRoute === item.path}
                          onClick={() => setActiveRoute(item.path)}
                        >
                          <ListItemIcon>{item.icon}</ListItemIcon>
                          <ListItemText primary={item.text} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                </Drawer>
                <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                  <Toolbar />
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute requireAdmin>
                          <AdminDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/documents/:id"
                      element={
                        <ProtectedRoute>
                          <DocumentViewer />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/assistant"
                      element={
                        <ProtectedRoute>
                          <AIAssistant />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Box>
              </Box>
            </AppProvider>
          </NotificationProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
};

export default App;
