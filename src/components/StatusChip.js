import React from 'react';
import { Chip } from '@mui/material';

const statusColor = {
  approved: 'success',
  pending: 'warning',
  rejected: 'error',
  completed: 'success',
  failed: 'error',
  processing: 'info',
};

function StatusChip({ status }) {
  return <Chip label={status} color={statusColor[status] || 'default'} size="small" />;
}

export default StatusChip; 