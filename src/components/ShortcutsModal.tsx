import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Play / Pause Video' },
    { key: '[', desc: 'Set Start Time (IN Point) to current playhead' },
    { key: ']', desc: 'Set End Time (OUT Point) to current playhead' },
    { key: '← / →', desc: 'Seek Backward / Forward 5 seconds' },
    { key: ', / .', desc: 'Frame Stepping (Back 1 Frame / Forward 1 Frame)' },
    { key: 'P', desc: 'Preview Selected Timeframe Range' },
    { key: 'L', desc: 'Toggle Timeframe Loop Playback' },
    { key: 'A', desc: 'Add Current Timeframe Range to Collection' },
    { key: 'E', desc: 'Quick Export Current Clip' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-botanical/60 backdrop-blur-none">
      <div className="bg-surface-card border border-stone rounded-md shadow-hover w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-stone flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2">
            <Keyboard className="w-4 h-4 text-coral" />
            <h3 className="font-heading font-bold text-sm text-botanical">
              Studio Keyboard Shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-olive hover:text-botanical hover:bg-surface rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-2.5 font-mono text-xs">
          {shortcuts.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-1 border-b border-stone/50">
              <span className="font-sans text-olive">{item.desc}</span>
              <kbd className="px-2 py-0.5 bg-ivory border border-stone rounded font-bold text-botanical text-[11px] shadow-minimal">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-stone bg-ivory text-center text-[11px] text-olive">
          Press any shortcut key while editing or hovering the workspace.
        </div>
      </div>
    </div>
  );
};
