import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';

export const ScrollNavigation = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Show scroll-to-top button when user has scrolled down
      setShowScrollTop(scrollTop > 200);
      
      // Hide scroll-to-bottom button when user is near the bottom
      setShowScrollBottom(scrollTop + windowHeight < documentHeight - 100);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  };

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-40">
      {showScrollBottom && (
        <Button
          variant="secondary"
          size="icon"
          onClick={scrollToBottom}
          className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 text-white hover:bg-gray-700/80 h-10 w-10 rounded-full shadow-lg"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      )}
      
      {showScrollTop && (
        <Button
          variant="secondary"
          size="icon"
          onClick={scrollToTop}
          className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 text-white hover:bg-gray-700/80 h-10 w-10 rounded-full shadow-lg"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};