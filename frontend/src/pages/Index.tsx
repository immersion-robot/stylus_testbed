import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { MenuSection } from '@/components/MenuSection';
import { GallerySection } from '@/components/GallerySection';
import { TutorialDialog } from '@/components/TutorialDialog';

const Index = () => {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    // Check if user has completed tutorial
    const tutorialCompleted = localStorage.getItem('roboad_tutorial_completed');
    if (!tutorialCompleted) {
      // Small delay to let page render first
      const timer = setTimeout(() => setShowTutorial(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <MenuSection />
        <GallerySection />
      </main>
      <TutorialDialog open={showTutorial} onOpenChange={setShowTutorial} />
    </div>
  );
};

export default Index;
