export interface UploadedDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
  uploadedAt: string;
}

export interface DocumentUploadResponse {
  success: boolean;
  message: string;
  documents: UploadedDocument[];
}

/**
 * Service abstraction for Medical Document Upload.
 * Pure frontend implementation with clean API placeholders prepared for backend hookup.
 * Future Endpoints:
 * - POST /kiosk/sessions/{session_id}/document-upload-token
 * - POST /kiosk/documents/upload
 * - GET /doctor/sessions/{session_id}/documents
 */
class DocumentService {
  /**
   * Generates a client-side upload token for the QR flow.
   */
  generateUploadToken(sessionId: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `upload_${sessionId || 'demo'}_${timestamp}_${random}`;
  }

  /**
   * Placeholder function for document upload.
   * Simulates network upload latency and returns structured document metadata.
   */
  async uploadDocuments(token: string, files: File[]): Promise<DocumentUploadResponse> {
    // Simulate network latency (1.2 seconds)
    await new Promise((resolve) => setTimeout(resolve, 1200));

    if (!files || files.length === 0) {
      return {
        success: false,
        message: 'No files selected for upload.',
        documents: [],
      };
    }

    const uploadedDocs: UploadedDocument[] = files.map((file, idx) => ({
      id: `doc_${Date.now()}_${idx}`,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
    }));

    // Store in localStorage for demo continuity
    const existing = JSON.parse(localStorage.getItem(`docs_${token}`) || '[]');
    localStorage.setItem(`docs_${token}`, JSON.stringify([...existing, ...uploadedDocs]));

    return {
      success: true,
      message: `${files.length} document(s) uploaded successfully.`,
      documents: uploadedDocs,
    };
  }

  /**
   * Fetch documents associated with a session or token.
   */
  getUploadedDocuments(token: string): UploadedDocument[] {
    try {
      return JSON.parse(localStorage.getItem(`docs_${token}`) || '[]');
    } catch {
      return [];
    }
  }
}

export const documentService = new DocumentService();
