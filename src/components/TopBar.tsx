import { Download, Loader2 } from 'lucide-react';

interface TopBarProps {
  activeSection: 'jukebox' | 'mapping' | 'accessibility' | 'guide';
  onSelectSection: (section: 'jukebox' | 'mapping' | 'accessibility' | 'guide') => void;
  onExportWav: () => void;
  isExporting: boolean;
}

export function TopBar({
  activeSection,
  onSelectSection,
  onExportWav,
  isExporting,
}: TopBarProps) {
  const navItems: Array<{ id: 'jukebox' | 'mapping' | 'accessibility' | 'guide'; label: string }> = [
    { id: 'jukebox', label: 'Jukebox' },
    { id: 'mapping', label: 'Mapping Logic' },
    { id: 'accessibility', label: 'Accessibility' },
    { id: 'guide', label: 'Study Guide' },
  ];

  return (
    <header className="w-full border-b border-slate-800 bg-[#07090E]/95 hc-panel">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-8 px-6 py-3.5">
        <a
          href="#jukebox-stage"
          onClick={(e) => {
            e.preventDefault();
            onSelectSection('jukebox');
          }}
          className="text-lg font-semibold tracking-tight text-slate-50 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400 rounded-sm"
        >
          Earth Information Jukebox
        </a>

        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={`text-sm font-medium transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400 ${
                  isActive
                    ? 'text-cyan-400 border-cyan-400'
                    : 'text-slate-300 border-transparent hover:text-slate-50 hover:border-slate-600'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onExportWav}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:opacity-60 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{isExporting ? 'Rendering WAV...' : 'Export WAV'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
