import React from 'react';
import { 
  Scissors, 
  Layers, 
  Copy, 
  FolderCheck, 
  Download, 
  Settings, 
  HardDrive,
  Film
} from 'lucide-react';
import { NavigationTab, ClipSource } from '../types';

interface SidebarProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  activeSource: ClipSource | null;
  activeClipCount: number;
  queueCount: number;
  storageUsage: { usedBytes: number; totalBytes: number; percentage: number };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  activeSource,
  activeClipCount,
  queueCount,
  storageUsage,
}) => {
  const navItems: { id: NavigationTab; label: string; shortLabel: string; icon: React.ReactNode; badge?: number | string }[] = [
    { id: 'home', label: 'Home / Import', shortLabel: 'Import', icon: <Film className="w-4 h-4" /> },
    { id: 'quick', label: 'Quick Clipper', shortLabel: 'Quick', icon: <Scissors className="w-4 h-4" /> },
    { 
      id: 'multi', 
      label: 'Multi-Clip Workspace', 
      shortLabel: 'Clips',
      icon: <Layers className="w-4 h-4" />,
      badge: activeClipCount > 0 ? activeClipCount : undefined 
    },
    { id: 'batch', label: 'Batch Clipper', shortLabel: 'Batch', icon: <Copy className="w-4 h-4" /> },
    { id: 'saved', label: 'Saved Library', shortLabel: 'Saved', icon: <FolderCheck className="w-4 h-4" /> },
    { 
      id: 'queue', 
      label: 'Export Queue', 
      shortLabel: 'Queue',
      icon: <Download className="w-4 h-4" />,
      badge: queueCount > 0 ? queueCount : undefined 
    },
    { id: 'settings', label: 'Settings', shortLabel: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const formatStorage = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb > 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-60 lg:w-64 bg-surface-card border-r border-stone flex-col h-screen select-none shrink-0 z-20">
        {/* Brand Header */}
        <div className="p-4 lg:p-5 border-b border-stone flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Vector Brand Logo */}
            <div className="w-9 h-9 rounded-md bg-botanical flex items-center justify-center p-1.5 shadow-minimal">
              <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
                <rect x="4" y="6" width="32" height="28" rx="4" fill="#FAF8F2" stroke="#E8E3D8" strokeWidth="1.5"/>
                <rect x="8" y="10" width="5" height="4" rx="1" fill="#202822"/>
                <rect x="27" y="10" width="5" height="4" rx="1" fill="#202822"/>
                <rect x="8" y="26" width="5" height="4" rx="1" fill="#202822"/>
                <rect x="27" y="26" width="5" height="4" rx="1" fill="#202822"/>
                <rect x="13" y="14" width="14" height="12" rx="2" fill="#C9E865"/>
                <path d="M15 13L25 27M25 13L15 27" stroke="#FE5936" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div className="font-heading font-extrabold text-base text-botanical leading-tight tracking-tight">
                ClipForge
              </div>
              <div className="text-[10px] uppercase font-mono tracking-wider text-olive">
                Video Clipping Studio
              </div>
            </div>
          </div>
        </div>

        {/* Active Source Pill */}
        {activeSource && (
          <div className="mx-3 mt-3 p-2.5 bg-surface rounded border border-stone text-xs">
            <div className="flex items-center justify-between text-olive mb-1">
              <span className="font-mono text-[10px] uppercase tracking-wider">Active Media</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-stone text-botanical uppercase font-semibold">
                {activeSource.platform}
              </span>
            </div>
            <div className="font-medium text-botanical truncate" title={activeSource.title}>
              {activeSource.title}
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-mono uppercase tracking-wider text-olive px-3 mb-2">
            Navigation
          </div>
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded transition-colors text-left ${
                  isActive
                    ? 'bg-coral text-white font-semibold'
                    : 'text-botanical hover:bg-surface'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <span className={isActive ? 'text-white' : 'text-olive'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-white text-coral font-bold'
                        : 'bg-stone text-botanical'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Storage & Status Footer */}
        <div className="p-3.5 border-t border-stone bg-ivory text-xs space-y-2">
          <div className="flex items-center justify-between text-olive">
            <span className="flex items-center space-x-1.5 text-[11px]">
              <HardDrive className="w-3.5 h-3.5" />
              <span>Storage Used</span>
            </span>
            <span className="font-mono text-[11px] text-botanical">
              {formatStorage(storageUsage.usedBytes)}
            </span>
          </div>
          <div className="w-full bg-stone h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-forest h-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(4, storageUsage.percentage))}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-olive font-mono pt-0.5">
            <span>In-Browser Engine</span>
            <span className="text-forest font-semibold">Ready</span>
          </div>
        </div>
      </aside>

      {/* MOBILE & TABLET BOTTOM BAR NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-card border-t border-stone z-40 flex items-center justify-around py-1.5 px-2 safe-area-pb shadow-hover">
        {navItems.slice(0, 5).map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded text-[10px] font-medium transition-colors relative ${
                isActive ? 'text-coral font-bold' : 'text-olive hover:text-botanical'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 bg-coral text-white text-[8px] font-mono px-1 rounded-full">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="mt-0.5">{item.shortLabel}</span>
            </button>
          );
        })}
        {/* More button (Queue & Settings) */}
        <button
          onClick={() => onTabChange(currentTab === 'queue' ? 'settings' : 'queue')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded text-[10px] font-medium transition-colors ${
            currentTab === 'queue' || currentTab === 'settings' ? 'text-coral font-bold' : 'text-olive'
          }`}
        >
          <Download className="w-4 h-4" />
          <span className="mt-0.5">Queue</span>
        </button>
      </nav>
    </>
  );
};
