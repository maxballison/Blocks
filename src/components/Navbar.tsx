import React from 'react';

interface NavbarProps {
  activeTab: 'project' | 'docs';
  onTabChange: (tab: 'project' | 'docs') => void;
}

function Navbar({ activeTab, onTabChange }: NavbarProps) {
  return (
    <div className="navbar-container">
      {/* Logo (placeholder: "BLOX") */}
      <div className="navbar-logo">BLOCKS</div>

      {/* Tabs */}
      <div className="navbar-tabs">
        <div
          className={`navbar-tab ${activeTab === 'project' ? 'active' : ''}`}
          onClick={() => onTabChange('project')}
        >
          Project
        </div>
        <div
          className={`navbar-tab ${activeTab === 'docs' ? 'active' : ''}`}
          onClick={() => onTabChange('docs')}
        >
          Documentation
        </div>
      </div>
    </div>
  );
}

export default Navbar;