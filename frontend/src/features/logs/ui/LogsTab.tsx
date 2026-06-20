import { useState, useEffect, useRef } from 'preact/hooks';
import { Terminal, Trash2, Copy, Play, Pause, Search, ArrowDown } from 'lucide-preact';
import { transport } from '../../../shared/ipc';

export function LogsTab() {
  const [logs, setLogs] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [isPolling, setIsPolling] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const consoleEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<any>(null);

  // Fetch logs from backend
  const fetchLogs = async () => {
    try {
      const data = await transport.call<string[]>("get_logs");
      if (Array.isArray(data)) {
        setLogs(data);
        setError(null);
      }
    } catch (e: any) {
      console.error("Failed to fetch logs:", e);
      setError("Не удалось загрузить логи от бэкенда.");
    }
  };

  // Start/stop polling based on isPolling state
  useEffect(() => {
    if (isPolling) {
      fetchLogs(); // Initial fetch
      pollIntervalRef.current = setInterval(fetchLogs, 1500);
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isPolling]);

  // Handle auto scroll
  useEffect(() => {
    if (autoScroll && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll, filter]);

  // Clear logs on backend
  const handleClear = async () => {
    try {
      await transport.call("clear_logs");
      setLogs([]);
    } catch (e) {
      console.error("Failed to clear logs:", e);
    }
  };

  // Copy logs to clipboard
  const handleCopy = () => {
    const textToCopy = filteredLogs.join('\n');
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy logs:", err);
      });
  };

  // Apply search filter
  const filteredLogs = logs.filter(log => 
    log.toLowerCase().includes(filter.toLowerCase())
  );

  // Helper to colorize log lines based on content
  const renderLogLine = (log: string, index: number) => {
    let textColor = 'text-[#e5bcc5]'; // Default soft rose/pink-gray
    let glowClass = '';

    if (log.includes('[ERROR]') || log.includes('[gRPC Server Error]')) {
      textColor = 'text-[#FF007F] font-bold'; // Neon pink
      glowClass = 'bg-[#FF007F]/10 border-l-2 border-[#FF007F] px-2 py-0.5 rounded';
    } else if (log.includes('[WARN]')) {
      textColor = 'text-[#FFD700]'; // Gold / Warm yellow
      glowClass = 'bg-[#FFD700]/5 border-l-2 border-[#FFD700] px-2 py-0.5 rounded';
    } else if (log.includes('[INFO]')) {
      textColor = 'text-[#00E5A3]'; // Cyber green
    } else if (log.includes('[MPV LOG]')) {
      textColor = 'text-[#BD00FF]'; // Cyber purple
    } else if (log.includes('[Rust IPC]')) {
      textColor = 'text-[#00D9F6]'; // Cyber cyan
    } else if (log.includes('[Registry]')) {
      textColor = 'text-[#FF7F00]'; // Orange registry
    } else if (log.includes('SYSTEM')) {
      textColor = 'text-[#00E5A3] font-bold tracking-wider';
    }

    return (
      <div key={index} className={`font-mono text-xs leading-relaxed transition-all duration-150 ${glowClass} hover:bg-white/5 py-0.5`}>
        <span className="text-white/20 select-none mr-3 inline-block w-8 text-right font-light">
          {index + 1}
        </span>
        <span className={textColor}>{log}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4 h-[calc(100vh-140px)] flex flex-col pb-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#161622]/40 backdrop-blur-xl border border-white/5 p-4 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#FF007F]/10 rounded-lg border border-[#FF007F]/20">
            <Terminal className="h-5 w-5 text-[#FF007F] animate-pulse" />
          </div>
          <div>
            <h3 className="text-md font-bold text-white flex items-center gap-2 leading-tight">
              Консоль отладки бэкенда
            </h3>
            <p className="text-[10px] text-[#8E8E9F]">
              Просмотр standardного вывода (stdout/stderr) приложения в реальном времени.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Action buttons */}
          <button 
            onClick={() => setIsPolling(!isPolling)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border active:scale-95 ${
              isPolling 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
            }`}
            title={isPolling ? "Приостановить обновление" : "Возобновить обновление"}
          >
            {isPolling ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isPolling ? 'Активно' : 'Пауза'}
          </button>

          <button 
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border active:scale-95 ${
              autoScroll 
                ? 'bg-[#FF007F]/10 border-[#FF007F]/20 text-[#FF007F] hover:bg-[#FF007F]/20' 
                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
            }`}
            title="Автопрокрутка вниз при поступлении новых логов"
          >
            <ArrowDown className={`h-3.5 w-3.5 ${autoScroll ? 'animate-bounce' : ''}`} />
            Автопрокрутка
          </button>

          <button 
            onClick={handleCopy}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border bg-white/5 border-white/10 text-white/80 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? 'Скопировано!' : 'Копировать'}
          </button>

          <button 
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border bg-destructive/10 border-destructive/20 text-red-400 hover:bg-destructive/20 active:scale-95"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Очистить
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-4 w-4 text-white/30" />
        </span>
        <input
          type="text"
          value={filter}
          onInput={(e: any) => setFilter(e.target.value)}
          placeholder="Фильтровать логи по ключевому слову (например: ERROR, MPV, Shikimori)..."
          className="w-full bg-[#161622]/40 backdrop-blur-xl border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#FF007F]/50 focus:border-[#FF007F]/50 text-white placeholder-white/30 transition-all font-mono"
        />
        {filter && (
          <button 
            onClick={() => setFilter('')} 
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/40 hover:text-white text-xs font-mono"
          >
            Сброс
          </button>
        )}
      </div>

      {/* Console log output window */}
      <div className="flex-grow bg-[#080810]/70 border border-white/5 rounded-2xl p-4 overflow-y-auto font-mono scrollbar-thin scrollbar-thumb-white/10 select-text relative shadow-inner">
        {/* Neon scanline accent for premium terminals */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-[#FF007F]/1 to-transparent bg-[length:100%_4px] opacity-30"></div>

        {error && (
          <div className="text-red-400 text-xs font-mono mb-4 p-3 bg-red-950/20 border border-red-500/20 rounded-xl">
            {error}
          </div>
        )}

        <div className="space-y-0.5 relative z-10">
          {filteredLogs.length > 0 ? (
            filteredLogs.map(renderLogLine)
          ) : (
            <div className="text-white/30 text-xs italic text-center py-12 select-none">
              {filter ? 'Нет логов, соответствующих фильтру.' : 'Ожидание поступления логов...'}
            </div>
          )}
          <div ref={consoleEndRef} />
        </div>
      </div>

      {/* Footer details */}
      <div className="flex justify-between items-center text-[10px] text-white/30 font-mono px-2">
        <span>Всего логов: {logs.length} / Отфильтровано: {filteredLogs.length}</span>
        <span>Статус: {isPolling ? 'Слежение активно' : 'Слежение приостановлено'}</span>
      </div>
    </div>
  );
}
