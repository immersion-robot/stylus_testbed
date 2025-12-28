import { useState, useCallback } from 'react';
import { Upload, Image, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface FileUploaderProps {
  onFileSelect: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
}

export function FileUploader({ onFileSelect, accept = 'image/*,video/*', multiple = true }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      return isImage || isVideo;
    });

    if (validFiles.length === 0) {
      toast.error('Please upload image or video files only');
      return;
    }

    setSelectedFiles(prev => multiple ? [...prev, ...validFiles] : validFiles);
    onFileSelect(validFiles);
    toast.success(`${validFiles.length} file(s) selected`);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    return file.type.startsWith('video/') ? Video : Image;
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200
          ${isDragging 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50 hover:bg-secondary/50'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-secondary rounded-2xl flex items-center justify-center">
            <Upload className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-medium">
              Drag & drop files here
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Supports: JPG, PNG, GIF, MP4, WebM (FHD 1920x1080 recommended)
          </p>
        </div>
      </div>

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Selected Files:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {selectedFiles.map((file, index) => {
              const Icon = getFileIcon(file);
              return (
                <div 
                  key={index}
                  className="relative bg-secondary rounded-xl p-4 group"
                >
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  
                  {file.type.startsWith('image/') ? (
                    <img 
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full aspect-video object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full aspect-video bg-primary rounded-lg flex items-center justify-center">
                      <Icon className="w-8 h-8 text-primary-foreground" />
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground mt-2 truncate">
                    {file.name}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
