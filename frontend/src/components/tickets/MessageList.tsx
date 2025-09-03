import React from "react";
import { formatDateTime } from "../../utils/formatters";
import { Download, FileText, Image, File } from "lucide-react";
import type { Message, FileAttachment } from "../../types";

interface MessageListProps {
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const getFileIcon = (attachment: FileAttachment) => {
    if (attachment.mimeType.startsWith("image/"))
      return <Image className="h-4 w-4" />;
    if (attachment.mimeType.startsWith("text/"))
      return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleFileDownload = (attachment: FileAttachment) => {
    const link = document.createElement("a");
    link.href = attachment.url;
    link.download = attachment.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!messages || messages.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400">
          No messages yet. Start the conversation!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Messages
        </h3>
      </div>

      <div className="max-h-96 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="flex justify-start">
            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">
                  {message.sender.name}
                </span>
                <span className="text-xs opacity-75">
                  {formatDateTime(message.createdAt)}
                </span>
              </div>

              <p className="text-sm leading-relaxed">{message.content}</p>

              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs opacity-75 mb-2">Attachments:</div>
                  {message.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center space-x-2 p-2 bg-white dark:bg-gray-800 bg-opacity-50 dark:bg-opacity-50 rounded border border-gray-200 dark:border-gray-600"
                    >
                      {getFileIcon(attachment)}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">
                          {attachment.originalName}
                        </div>
                        <div className="text-xs opacity-75">
                          {formatFileSize(attachment.size)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleFileDownload(attachment)}
                        className="p-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Download file"
                      >
                        <Download className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
