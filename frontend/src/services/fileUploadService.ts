import { config } from "../config";
import { authService } from "./authService";

export interface FileUploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: "uploading" | "completed" | "error";
  error?: string;
  url?: string;
}

export interface FileUploadOptions {
  maxFileSize?: number;
  allowedTypes?: string[];
  chunkSize?: number;
  onProgress?: (progress: FileUploadProgress) => void;
}

export interface UploadedFile {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: string;
}

class FileUploadService {
  private uploads = new Map<string, FileUploadProgress>();

  async uploadFile(
    file: File,
    options: FileUploadOptions = {}
  ): Promise<UploadedFile> {
    const {
      maxFileSize = config.app.maxFileSize,
      allowedTypes = [...config.app.supportedFileTypes],
      chunkSize = 1024 * 1024,
      onProgress,
    } = options;

    this.validateFile(file, maxFileSize, allowedTypes);

    const fileId = this.generateFileId();

    const progress: FileUploadProgress = {
      fileId,
      fileName: file.name,
      progress: 0,
      status: "uploading",
    };

    this.uploads.set(fileId, progress);
    onProgress?.(progress);

    try {
      if (file.size > chunkSize) {
        return await this.uploadFileInChunks(
          file,
          fileId,
          chunkSize,
          onProgress
        );
      } else {
        return await this.uploadFileDirect(file, fileId, onProgress);
      }
    } catch (error) {
      progress.status = "error";
      progress.error = error instanceof Error ? error.message : "Upload failed";
      this.uploads.set(fileId, progress);
      onProgress?.(progress);
      throw error;
    }
  }

  private async uploadFileDirect(
    file: File,
    fileId: string,
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<UploadedFile> {
    const progress = this.uploads.get(fileId)!;
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${config.apiBaseUrl}/files/upload`, {
      method: "POST",
      headers: {
        Authorization: authService.getAuthHeader() || "",
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Upload failed");
    }

    progress.status = "completed";
    progress.progress = 100;
    progress.url = result.data.url;
    this.uploads.set(fileId, progress);
    onProgress?.(progress);

    return result.data;
  }

  private async uploadFileInChunks(
    file: File,
    fileId: string,
    chunkSize: number,
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<UploadedFile> {
    const progress = this.uploads.get(fileId)!;
    const totalChunks = Math.ceil(file.size / chunkSize);
    let uploadedChunks = 0;

    const initResponse = await fetch(`${config.apiBaseUrl}/files/upload/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authService.getAuthHeader() || "",
      },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        totalChunks,
      }),
    });

    if (!initResponse.ok) {
      throw new Error("Failed to initialize upload");
    }

    const initResult = await initResponse.json();
    const uploadId = initResult.data.uploadId;

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      const chunkFormData = new FormData();
      chunkFormData.append("chunk", chunk);
      chunkFormData.append("chunkIndex", chunkIndex.toString());
      chunkFormData.append("uploadId", uploadId);

      const chunkResponse = await fetch(
        `${config.apiBaseUrl}/files/upload/chunk`,
        {
          method: "POST",
          headers: {
            Authorization: authService.getAuthHeader() || "",
          },
          body: chunkFormData,
        }
      );

      if (!chunkResponse.ok) {
        throw new Error(`Chunk ${chunkIndex} upload failed`);
      }

      uploadedChunks++;
      progress.progress = Math.round((uploadedChunks / totalChunks) * 100);
      this.uploads.set(fileId, progress);
      onProgress?.(progress);
    }

    const completeResponse = await fetch(
      `${config.apiBaseUrl}/files/upload/complete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authService.getAuthHeader() || "",
        },
        body: JSON.stringify({ uploadId }),
      }
    );

    if (!completeResponse.ok) {
      throw new Error("Failed to complete upload");
    }

    const result = await completeResponse.json();

    if (!result.success) {
      throw new Error(result.message || "Upload completion failed");
    }

    progress.status = "completed";
    progress.progress = 100;
    progress.url = result.data.url;
    this.uploads.set(fileId, progress);
    onProgress?.(progress);

    return result.data;
  }

  private validateFile(
    file: File,
    maxFileSize: number,
    allowedTypes: string[]
  ): void {
    if (file.size > maxFileSize) {
      throw new Error(
        `File size exceeds maximum allowed size of ${this.formatFileSize(
          maxFileSize
        )}`
      );
    }

    const fileExtension = this.getFileExtension(file.name);
    if (!allowedTypes.includes(fileExtension)) {
      throw new Error(
        `File type not allowed. Supported types: ${allowedTypes.join(", ")}`
      );
    }
  }

  private getFileExtension(fileName: string): string {
    return fileName.substring(fileName.lastIndexOf(".")).toLowerCase();
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  private generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getUploadProgress(fileId: string): FileUploadProgress | undefined {
    return this.uploads.get(fileId);
  }

  getAllUploads(): FileUploadProgress[] {
    return Array.from(this.uploads.values());
  }

  clearUpload(fileId: string): void {
    this.uploads.delete(fileId);
  }

  clearAllUploads(): void {
    this.uploads.clear();
  }

  isImage(file: File): boolean {
    return file.type.startsWith("image/");
  }

  createImagePreview(file: File): string {
    if (!this.isImage(file)) {
      throw new Error("File is not an image");
    }
    return URL.createObjectURL(file);
  }

  revokeImagePreview(url: string): void {
    URL.revokeObjectURL(url);
  }
}

export const fileUploadService = new FileUploadService();
export default fileUploadService;
