import { useState, useEffect, useCallback } from 'react';

export const useResizablePanels = (initialLeftWidth = 45, initialBottomHeight = 35) => {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [bottomHeight, setBottomHeight] = useState(initialBottomHeight);
  const [isDragging, setIsDragging] = useState(null);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    if (isDragging === 'vertical') {
      const newWidth = (e.clientX / window.innerWidth) * 100;
      if (newWidth > 20 && newWidth < 80) setLeftWidth(newWidth);
    } else if (isDragging === 'horizontal') {
      const workspaceRect = document.getElementById('workspace-container').getBoundingClientRect();
      const relativeY = e.clientY - workspaceRect.top;
      const newHeight = ((workspaceRect.height - relativeY) / workspaceRect.height) * 100;
      if (newHeight > 10 && newHeight < 85) setBottomHeight(newHeight);
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => setIsDragging(null), []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.userSelect = 'auto';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return { leftWidth, bottomHeight, isDragging, setIsDragging };
};