import React, { createContext, useContext, useState, useCallback } from 'react';
import { ContentItem, Reservation } from '@/types/content';

interface ContentContextType {
  contents: ContentItem[];
  reservations: Reservation[];
  addContent: (content: ContentItem) => void;
  updateContent: (id: string, content: Partial<ContentItem>) => void;
  deleteContent: (id: string) => void;
  addReservation: (reservation: Reservation) => void;
  updateReservation: (id: string, reservation: Partial<Reservation>) => void;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export function ContentProvider({ children }: { children: React.ReactNode }) {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const addContent = useCallback((content: ContentItem) => {
    setContents(prev => [...prev, content]);
  }, []);

  const updateContent = useCallback((id: string, updates: Partial<ContentItem>) => {
    setContents(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const deleteContent = useCallback((id: string) => {
    setContents(prev => prev.filter(c => c.id !== id));
  }, []);

  const addReservation = useCallback((reservation: Reservation) => {
    setReservations(prev => [...prev, reservation]);
  }, []);

  const updateReservation = useCallback((id: string, updates: Partial<Reservation>) => {
    setReservations(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  return (
    <ContentContext.Provider value={{
      contents,
      reservations,
      addContent,
      updateContent,
      deleteContent,
      addReservation,
      updateReservation,
    }}>
      {children}
    </ContentContext.Provider>
  );
}

export function useContent() {
  const context = useContext(ContentContext);
  if (!context) {
    throw new Error('useContent must be used within a ContentProvider');
  }
  return context;
}
