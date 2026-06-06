'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  FileText, 
  Briefcase, 
  Brain, 
  Compass, 
  Bell, 
  BookOpen, 
  BarChart3, 
  Target,
  Layers,
  Swords,
  Clock,
  Star,
  TrendingUp,
  ArrowRight,
  Command,
} from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'post' | 'portfolio' | 'agent' | 'scenario' | 'notification' | 'journal' | 'review' | 'tool' | 'page';
  title: string;
  subtitle?: string;
  url: string;
  icon: React.ReactNode;
  category: string;
}

const QUICK_ACTIONS: SearchResult[] = [
  { id: 'market', type: 'page', title: '行情', subtitle: '查看市场行情', url: '/market', icon: <TrendingUp className="w-4 h-4" />, category: '快捷操作' },
  { id: 'agents', type: 'page', title: 'AI 分析', subtitle: '多角色 AI 分析', url: '/agents', icon: <Brain className="w-4 h-4" />, category: '快捷操作' },
  { id: 'scenario', type: 'page', title: '情景模拟', subtitle: '宏观情景分析', url: '/scenario', icon: <Compass className="w-4 h-4" />, category: '快捷操作' },
  { id: 'portfolio', type: 'page', title: '持仓管理', subtitle: '管理投资组合', url: '/portfolio', icon: <Briefcase className="w-4 h-4" />, category: '快捷操作' },
  { id: 'butterfly', type: 'page', title: '蝴蝶效应', subtitle: '事件因果传导', url: '/tools/butterfly', icon: <Target className="w-4 h-4" />, category: '快捷操作' },
  { id: 'battle-map', type: 'page', title: '作战地图', subtitle: '24h 事件热力图', url: '/battle-map', icon: <Layers className="w-4 h-4" />, category: '快捷操作' },
];

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Toggle command palette
  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
    setQuery('');
    setResults([]);
    setSelectedIndex(0);
  }, []);

  // Global keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, toggle]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Search function
  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(QUICK_ACTIONS);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.data)) {
          setResults(data.data);
        } else {
          setResults(QUICK_ACTIONS.filter(a => 
            a.title.toLowerCase().includes(q.toLowerCase()) ||
            a.subtitle?.toLowerCase().includes(q.toLowerCase())
          ));
        }
      }
    } catch {
      setResults(QUICK_ACTIONS.filter(a => 
        a.title.toLowerCase().includes(q.toLowerCase()) ||
        a.subtitle?.toLowerCase().includes(q.toLowerCase())
      ));
    }
    setLoading(false);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          router.push(results[selectedIndex].url);
          setIsOpen(false);
        }
        break;
    }
  }, [results, selectedIndex, router]);

  // Group results by category
  const groupedResults = results.reduce((acc, result) => {
    const category = result.category || '其他';
    if (!acc[category]) acc[category] = [];
    acc[category].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Command Palette */}
      <div className="relative w-full max-w-2xl mx-4 bg-surface-1 border border-border-default rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border-default">
          <Search className="w-5 h-5 text-text-tertiary" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索功能、文章、持仓..."
            className="flex-1 bg-transparent text-text-primary placeholder:text-text-tertiary outline-none text-base"
          />
          <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 bg-surface-2 border border-border-default rounded text-[10px] text-text-tertiary">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-text-tertiary text-sm">
              搜索中...
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-text-tertiary">
              <Search className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">未找到结果</p>
              <p className="text-xs mt-1">尝试其他关键词</p>
            </div>
          ) : (
            Object.entries(groupedResults).map(([category, items]) => (
              <div key={category} className="mb-2">
                <div className="px-3 py-2 text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
                  {category}
                </div>
                {items.map((item) => {
                  const globalIndex = results.indexOf(item);
                  return (
                    <button
                      key={item.id}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                        globalIndex === selectedIndex 
                          ? 'bg-brand/10 text-brand-light' 
                          : 'hover:bg-surface-2 text-text-primary'
                      }`}
                      onClick={() => {
                        router.push(item.url);
                        setIsOpen(false);
                      }}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                    >
                      <div className={`p-1.5 rounded-lg ${
                        globalIndex === selectedIndex ? 'bg-brand/20' : 'bg-surface-2'
                      }`}>
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.title}</div>
                        {item.subtitle && (
                          <div className="text-xs text-text-tertiary truncate">{item.subtitle}</div>
                        )}
                      </div>
                      {globalIndex === selectedIndex && (
                        <ArrowRight className="w-4 h-4 text-brand-light" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border-default bg-surface-2">
          <div className="flex items-center gap-4 text-[10px] text-text-tertiary">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-1 border border-border-default rounded">↑↓</kbd>
              导航
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-1 border border-border-default rounded">↵</kbd>
              选择
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-1 border border-border-default rounded">ESC</kbd>
              关闭
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-text-tertiary">
            <Command className="w-3 h-3" />
            <span>InsightNote</span>
          </div>
        </div>
      </div>
    </div>
  );
}
