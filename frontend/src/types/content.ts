export interface Reservation {
  id: string;
  contentId: string;
  contentTitle: string;
  location: string;
  date: string;
  time: string;
  status: 'completed';
  paymentMethod: 'USDT';
  amount: number;
  transactionHash?: string;
  customerEmail?: string;
}

export interface ContentItem {
  id: string;
  title: string;
  format: 'image' | 'video' | 'slideshow';
  description: string;
  owner: string;
  fileType: string;
  thumbnail?: string;
  file?: File;
  fileUrl?: string; // Object URL for preview
  createdAt: Date;
  status: 'draft' | 'ready' | 'scheduled' | 'completed';
  slideCount?: number;
  duration?: number; // in seconds for video
  fileSize?: number; // in bytes
  dimensions?: { width: number; height: number };
  mimeType?: string;
  imageCount?: number;
  slideThumbnails?: string[];
  source?: 'upload' | 'slide-editor' | 'video-editor'; // Track content origin
  editData?: {
    slides?: SlideItem[];
    videoEdits?: VideoEditData;
  };
}

export interface VideoEditData {
  clips?: any[];
  subtitles?: any[];
  freeTexts?: any[];
  stickers?: any[];
  filters?: any;
}


export interface SlideItem {
  id: string;
  elements: CanvasElement[];
  backgroundColor: string;
}

export interface CanvasElement {
  id: string;
  type: 'text' | 'shape' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  shapeType?: 'rectangle' | 'circle' | 'triangle';
}
