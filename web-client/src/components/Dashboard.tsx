import React, { useEffect } from 'react';
import styled from 'styled-components';
import { useApp } from '../contexts/AppContext';

const DashboardContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const MetricCard = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const MetricTitle = styled.h3`
  margin: 0;
  color: #666;
  font-size: 0.9rem;
`;

const MetricValue = styled.h2`
  margin: 0.5rem 0 0;
  color: #333;
  font-size: 1.8rem;
`;

const Section = styled.section`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  margin-bottom: 1rem;
  color: #333;
`;

const DocumentList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
`;

const DocumentCard = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const DocumentTitle = styled.h3`
  margin: 0 0 0.5rem;
  color: #333;
`;

const DocumentMeta = styled.div`
  color: #666;
  font-size: 0.9rem;
`;

const Loading = styled.div`
  text-align: center;
  padding: 2rem;
  color: #666;
`;

const Error = styled.div`
  color: #dc3545;
  padding: 1rem;
  background: #f8d7da;
  border-radius: 4px;
  margin-bottom: 1rem;
`;

const Dashboard: React.FC = () => {
  const {
    metrics,
    recentDocuments,
    pendingApprovals,
    loading,
    error,
    fetchMetrics,
    fetchRecentDocuments,
    fetchPendingApprovals,
  } = useApp();

  useEffect(() => {
    fetchMetrics();
    fetchRecentDocuments();
    fetchPendingApprovals();
  }, [fetchMetrics, fetchRecentDocuments, fetchPendingApprovals]);

  if (loading) {
    return <Loading>Loading dashboard data...</Loading>;
  }

  return (
    <DashboardContainer>
      {error && <Error>{error}</Error>}

      <MetricsGrid>
        <MetricCard>
          <MetricTitle>Total Documents</MetricTitle>
          <MetricValue>{metrics?.totalDocuments || 0}</MetricValue>
        </MetricCard>
        <MetricCard>
          <MetricTitle>Processed Today</MetricTitle>
          <MetricValue>{metrics?.processedToday || 0}</MetricValue>
        </MetricCard>
        <MetricCard>
          <MetricTitle>Pending Approval</MetricTitle>
          <MetricValue>{metrics?.pendingApproval || 0}</MetricValue>
        </MetricCard>
        <MetricCard>
          <MetricTitle>Average Processing Time</MetricTitle>
          <MetricValue>{metrics?.avgProcessingTime || '0'}s</MetricValue>
        </MetricCard>
      </MetricsGrid>

      <Section>
        <SectionTitle>Recent Documents</SectionTitle>
        <DocumentList>
          {recentDocuments.map(doc => (
            <DocumentCard key={doc.id}>
              <DocumentTitle>{doc.title}</DocumentTitle>
              <DocumentMeta>
                <div>Status: {doc.status}</div>
                {doc.processedAt && (
                  <div>Processed: {new Date(doc.processedAt).toLocaleDateString()}</div>
                )}
              </DocumentMeta>
            </DocumentCard>
          ))}
        </DocumentList>
      </Section>

      <Section>
        <SectionTitle>Pending Approvals</SectionTitle>
        <DocumentList>
          {pendingApprovals.map(doc => (
            <DocumentCard key={doc.id}>
              <DocumentTitle>{doc.title}</DocumentTitle>
              <DocumentMeta>
                {doc.submittedBy && <div>Submitted by: {doc.submittedBy}</div>}
                {doc.submittedAt && (
                  <div>Submitted on: {new Date(doc.submittedAt).toLocaleDateString()}</div>
                )}
              </DocumentMeta>
            </DocumentCard>
          ))}
        </DocumentList>
      </Section>
    </DashboardContainer>
  );
};

export default Dashboard;
