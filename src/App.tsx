import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Project from './components/Project';
import Documentation from './components/Documentation';
import './App.css'; // Single CSS file

function App() {
  // Track which tab is active: "project" or "docs"
  const [activeTab, setActiveTab] = useState<'project' | 'docs'>('project');

  return (
    <div id="root">
      {/* Navbar with logo and tabs */}
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Render either the "Project" view or the "Documentation" view */}
      {activeTab === 'project' && <Project />}
      {activeTab === 'docs' && <Documentation />}
    </div>
  );
}

export default App;