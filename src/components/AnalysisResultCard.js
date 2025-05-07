import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HourglassEmpty as HourglassIcon,
  Info as InfoIcon,
  SentimentSatisfied as PositiveIcon,
  SentimentNeutral as NeutralIcon,
  SentimentDissatisfied as NegativeIcon,
  Lightbulb as LightbulbIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Event as EventIcon,
} from '@mui/icons-material';

const AnalysisResultCard = ({ result, title }) => {
  if (!result) return null;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'processing':
        return <HourglassIcon color="warning" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return <PositiveIcon color="success" />;
      case 'negative':
        return <NegativeIcon color="error" />;
      case 'neutral':
      default:
        return <NeutralIcon color="info" />;
    }
  };

  const getEntityIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'person':
        return <PersonIcon />;
      case 'organization':
      case 'company':
        return <BusinessIcon />;
      case 'location':
      case 'place':
        return <LocationIcon />;
      case 'date':
      case 'time':
        return <EventIcon />;
      default:
        return <InfoIcon />;
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            {title || 'Analysis Results'}
          </Typography>
          {result.status && (
            <Chip
              icon={getStatusIcon(result.status)}
              label={result.status}
              color={
                result.status === 'completed'
                  ? 'success'
                  : result.status === 'failed'
                  ? 'error'
                  : 'default'
              }
            />
          )}
        </Box>

        {result.summary && (
          <>
            <Typography variant="subtitle1" gutterBottom>
              Summary
            </Typography>
            <Typography variant="body1" paragraph>
              {result.summary}
            </Typography>
            <Divider sx={{ my: 2 }} />
          </>
        )}

        {result.keyPoints && result.keyPoints.length > 0 && (
          <>
            <Typography variant="subtitle1" gutterBottom>
              Key Points
            </Typography>
            <List dense>
              {result.keyPoints.map((point, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <LightbulbIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary={point} />
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 2 }} />
          </>
        )}

        {result.entities && result.entities.length > 0 && (
          <>
            <Typography variant="subtitle1" gutterBottom>
              Entities
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {result.entities.map((entity, index) => (
                <Chip
                  key={index}
                  icon={getEntityIcon(entity.type)}
                  label={`${entity.text} (${entity.type})`}
                  variant="outlined"
                />
              ))}
            </Box>
            <Divider sx={{ my: 2 }} />
          </>
        )}

        {result.sentiment && (
          <>
            <Typography variant="subtitle1" gutterBottom>
              Sentiment Analysis
            </Typography>
            <Box display="flex" alignItems="center" mb={1}>
              {getSentimentIcon(result.sentiment)}
              <Typography variant="body1" sx={{ ml: 1 }}>
                {result.sentiment}
              </Typography>
            </Box>
            {result.sentimentScore && (
              <Typography variant="body2" color="text.secondary">
                Confidence: {Math.round(result.sentimentScore * 100)}%
              </Typography>
            )}
            <Divider sx={{ my: 2 }} />
          </>
        )}

        {result.recommendations && result.recommendations.length > 0 && (
          <>
            <Typography variant="subtitle1" gutterBottom>
              Recommendations
            </Typography>
            <List dense>
              {result.recommendations.map((recommendation, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <CheckCircleIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary={recommendation} />
                </ListItem>
              ))}
            </List>
          </>
        )}

        {result.metadata && (
          <Box mt={2}>
            <Typography variant="caption" color="text.secondary">
              Analysis completed: {new Date(result.metadata.completedAt).toLocaleString()}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AnalysisResultCard; 