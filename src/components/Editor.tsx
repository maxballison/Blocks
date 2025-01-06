// components/Editor.tsx
import React from 'react';
import { Editor as MonacoEditor } from '@monaco-editor/react';

interface EditorProps {
  code: string;
  onChange: (value: string) => void;
  style?: React.CSSProperties;
}

const Editor: React.FC<EditorProps> = ({ code, onChange, style }) => {
  return (
    <div style={{ width: '100%', height: '100%', ...style }}>
      <MonacoEditor
        height="100%"
        defaultLanguage="python" 
        // Our language is "Python-like" but you can also choose "javascript" or "plaintext"
        theme="vs-dark"
        value={code}
        onChange={(newValue) => {
          if (newValue !== undefined) {
            onChange(newValue);
          }
        }}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
        }}
      />
    </div>
  );
};

export default Editor;