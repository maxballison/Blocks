// components/SnippetToolbar.tsx

import React from 'react';
import { FaCircle, FaSquare, FaRedo, FaPalette, FaCodeBranch } from 'react-icons/fa';

/**
 * Simple definitions of snippet code for each item.
 * Customize the snippet text and indentation as desired.
 */
export const SNIPPETS: Record<string, string> = {
  circle: `circle(x, y, r)`,
  rectangle: `rectangle(x, y, w, h)`,
  forLoop: `loop i=10 times:\n    # your code here`,
  ifStatement: `if x > 10:\n    # your code here`,
  color: `color(r, g, b)`
};

interface SnippetButtonProps {
  label: string;
  snippetKey: string;
  icon?: React.ReactNode;
}

const SnippetButton: React.FC<SnippetButtonProps> = ({ label, snippetKey, icon }) => {
  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
    e.dataTransfer.setData('application/x-snippet', snippetKey);
  };

  return (
    <button 
      draggable
      onDragStart={handleDragStart}
      className="snippet-button"
    >
      {icon && <span>{icon}</span>}
      <span>{label}</span>
    </button>
  );
};

interface SnippetToolbarProps {
  style?: React.CSSProperties;
}

/** 
 * A simple toolbar containing draggable snippet buttons.
 */
export const SnippetToolbar: React.FC<SnippetToolbarProps> = ({ style }) => {
  return (
    <div style={style}>
      <SnippetButton label="Circle" snippetKey="circle" icon={<FaCircle />} />
      <SnippetButton label="Rectangle" snippetKey="rectangle" icon={<FaSquare />} />
      <SnippetButton label="For Loop" snippetKey="forLoop" icon={<FaRedo />} />
      <SnippetButton label="If" snippetKey="ifStatement" icon={<FaCodeBranch />} />
      <SnippetButton label="Color" snippetKey="color" icon={<FaPalette />} />
    </div>
  );
};