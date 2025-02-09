// components/Editor.tsx
import React, { useRef } from 'react';
import { Editor as MonacoEditor, OnMount } from '@monaco-editor/react';
import { SNIPPETS } from './SnippetToolbar';  // Use snippet definitions

interface EditorProps {
  code: string;
  onChange: (value: string) => void;
  style?: React.CSSProperties;
}

const Editor: React.FC<EditorProps> = ({ code, onChange, style }) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  // Attempt to convert the mouse position to text position
  const getEditorPositionFromMouse = (clientX: number, clientY: number) => {
    const editor = editorRef.current;
    if (!editor) return null;
    const pos = (editor as any).getTargetAtClientPoint?.(clientX, clientY);
    if (pos && pos.position) return pos.position;
    return editor.getPosition();
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const snippetKey = e.dataTransfer.getData('application/x-snippet');
    if (!snippetKey) return;
    const snippetText = SNIPPETS[snippetKey];
    if (!snippetText) return;

    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;

    // figure out drop position
    const dropPos = getEditorPositionFromMouse(e.clientX, e.clientY) || editor.getPosition();
    if (!dropPos) return;

    // Insert snippet in the next line with same indentation
    const lineContent = model.getLineContent(dropPos.lineNumber) || '';
    const match = lineContent.match(/^(\s+)/);
    const existingIndent = match ? match[1] : '';

    const lines = snippetText.split('\n');
    const adjustedSnippet = lines.map(l => existingIndent + l).join('\n');

    // Insert on the next line
    const insertionLine = dropPos.lineNumber + 1;
    editor.executeEdits('', [
      {
        range: new monaco.Range(insertionLine, 1, insertionLine, 1),
        text: adjustedSnippet + '\n',
        forceMoveMarkers: true,
      },
    ]);

    // Move cursor
    const snippetLineCount = lines.length;
    const lastSnippetLine = insertionLine + snippetLineCount - 1;
    const lastLineText = lines[snippetLineCount - 1];
    const lastColumn = existingIndent.length + lastLineText.length + 1;

    editor.setPosition({ lineNumber: lastSnippetLine, column: lastColumn });
    editor.focus();
  };

  return (
    <div
      style={{ width: '100%', height: '100%', ...style }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <MonacoEditor
        height="100%"
        defaultLanguage="python"
        theme="vs-light"
        value={code}
        onMount={handleEditorMount}
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