import { useState, useRef, useEffect } from 'react';

export function useSearch(activeSection) {
  const [searchTermLeft, setSearchTermLeft] = useState('');
  const [searchTermRight, setSearchTermRight] = useState('');
  const [showSearchLeft, setShowSearchLeft] = useState(false);
  const [showSearchRight, setShowSearchRight] = useState(false);
  
  const searchInputLeftRef = useRef(null);
  const searchInputRightRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        
        if (activeSection === 'left') {
          setShowSearchLeft(true);
          setTimeout(() => searchInputLeftRef.current?.focus(), 100);
        } else if (activeSection === 'right') {
          setShowSearchRight(true);
          setTimeout(() => searchInputRightRef.current?.focus(), 100);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSection]);

  return {
    searchTermLeft,
    setSearchTermLeft,
    searchTermRight,
    setSearchTermRight,
    showSearchLeft,
    setShowSearchLeft,
    showSearchRight,
    setShowSearchRight,
    searchInputLeftRef,
    searchInputRightRef
  };
}
