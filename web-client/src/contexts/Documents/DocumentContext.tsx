import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  status: string;
  createdAt: string;
}

interface DocumentContextType {
  documents: Document[];
  setDocuments: (documents: Document[]) => void;
  selectedDocument: Document | null;
  setSelectedDocument: (document: Document | null) => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const DocumentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  return (
    <DocumentContext.Provider
      value={{
        documents,
        setDocuments,
        selectedDocument,
        setSelectedDocument,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocumentContext = () => {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocumentContext must be used within a DocumentProvider');
  }
  return context;
};
