import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDocumentContext } from '../contexts/Documents/DocumentContext';
import { storageService, Document as StorageDocument } from '../services/storage';
import { Button, Table, Modal, message } from 'antd';
import { UploadOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  status: string;
  createdAt: string;
}

const DocumentManagement: React.FC = () => {
  const { user } = useAuth();
  const { documents, setDocuments } = useDocumentContext();
  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  useEffect(() => {
    if (user?.tenantId) {
      fetchDocuments();
    }
  }, [user?.tenantId]);

  const fetchDocuments = async () => {
    if (!user?.tenantId) return;
    
    try {
      setLoading(true);
      const storageDocs = await storageService.getDocuments(user.tenantId);
      // Transform storage documents to match the UI document type
      const uiDocs: Document[] = storageDocs.map(doc => ({
        id: doc.id,
        name: doc.title,
        type: 'document',
        size: doc.content.length,
        status: doc.status,
        createdAt: doc.submittedAt,
      }));
      setDocuments(uiDocs);
    } catch (error) {
      message.error('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!user?.tenantId || !user?.id) return;

    try {
      setLoading(true);
      await storageService.createDocument({
        title: file.name,
        content: await file.text(),
        status: 'pending',
        submittedBy: user.id,
        tenantId: user.tenantId,
      });
      message.success('Document uploaded successfully');
      fetchDocuments();
    } catch (error) {
      message.error('Failed to upload document');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      setLoading(true);
      await storageService.deleteDocument(documentId);
      message.success('Document deleted successfully');
      fetchDocuments();
    } catch (error) {
      message.error('Failed to delete document');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: 'Size',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => `${(size / 1024).toFixed(2)} KB`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Document) => (
        <div>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedDocument(record);
              setPreviewVisible(true);
            }}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="document-management">
      <div className="header">
        <h2>Document Management</h2>
        <Button
          type="primary"
          icon={<UploadOutlined />}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.onchange = e => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleUpload(file);
            };
            input.click();
          }}
        >
          Upload Document
        </Button>
      </div>

      <Table columns={columns} dataSource={documents} loading={loading} rowKey="id" />

      <Modal
        title="Document Preview"
        visible={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={800}
      >
        {selectedDocument && (
          <div className="document-preview">
            <iframe
              src={`/api/documents/${selectedDocument.id}/preview`}
              width="100%"
              height="600px"
              title={selectedDocument.name}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DocumentManagement;
