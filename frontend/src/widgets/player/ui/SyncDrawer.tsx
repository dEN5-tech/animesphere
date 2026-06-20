import { useState, useEffect, useRef } from 'preact/hooks';
import { useAtomValue } from 'jotai';
import { X, Copy, Check, Send, LogOut, Users } from 'lucide-preact';
import * as syncStore from '../../../features/sync';
import { shikimoriProfile } from '../../../entities/user';

interface SyncDrawerProps {
  showDrawer: boolean;
  setShowDrawer: (show: boolean) => void;
}

export function SyncDrawer({ showDrawer, setShowDrawer }: SyncDrawerProps) {
  const [roomInput, setRoomInput] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const roomCode = useAtomValue(syncStore.roomCode);
  const isConnected = useAtomValue(syncStore.isConnected);
  const chatMessages = useAtomValue(syncStore.chatMessages);

  const profileVal = useAtomValue(shikimoriProfile);
  const nickname = profileVal?.nickname || "Пользователь";

  // Auto-scroll to bottom of chat feed when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleCreateRoom = () => {
    // Generate a random 6-character room code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    syncStore.joinRoom(code, nickname, true);
  };

  const handleJoinRoom = () => {
    if (roomInput.trim()) {
      syncStore.joinRoom(roomInput.trim().toUpperCase(), nickname, false);
    }
  };

  const handleSendMessage = (e: any) => {
    e.preventDefault();
    if (chatInput.trim()) {
      syncStore.sendChatMessage(chatInput);
      setChatInput("");
    }
  };

  const handleCopyLink = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`fixed top-0 right-0 z-40 w-80 h-full bg-[#0D0E15]/95 border-l border-[#00F0FF]/25 backdrop-blur-xl shadow-2xl flex flex-col pointer-events-auto transform transition-transform duration-300 shadow-black/80 ${showDrawer ? 'translate-x-0' : 'translate-x-full'}`}>
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#00F0FF] to-[#FF007F] flex items-center gap-1.5">
          <Users className="h-4 w-4 text-[#00F0FF]" />
          Совместный просмотр
        </h3>
        <button onClick={() => setShowDrawer(false)} className="text-[#8E8E9F] hover:text-white transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main Panel Content */}
      <div className="flex-grow flex flex-col overflow-hidden">
        {!isConnected ? (
          /* SECTION 1: JOIN/CREATE ROOM FORM */
          <div className="flex-grow p-5 space-y-6 overflow-y-auto">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#8E8E9F] uppercase tracking-wider">
                Создать новую сессию
              </label>
              <p className="text-[10px] text-[#8E8E9F]">
                Запустите сессию и пригласите друга по коду. Ваше воспроизведение станет главным.
              </p>
              <button
                onClick={handleCreateRoom}
                className="w-full bg-gradient-to-r from-[#00F0FF] to-[#00A3FF] hover:scale-[1.02] text-black font-extrabold rounded-xl py-2.5 text-xs transition-all shadow-lg shadow-[#00F0FF]/15 active:scale-98"
              >
                Создать комнату
              </button>
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-4 text-[10px] font-bold text-[#8E8E9F] uppercase">или</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-[#8E8E9F] uppercase tracking-wider">
                Подключиться по коду
              </label>
              <input
                type="text"
                className="w-full bg-[#161622]/60 border border-white/10 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00F0FF]/50 focus:border-[#00F0FF]/50 text-white placeholder-white/20 transition-all text-center font-mono tracking-widest uppercase"
                placeholder="КОД КОМНАТЫ"
                value={roomInput}
                onInput={(e: any) => setRoomInput(e.target.value)}
              />
              <button
                onClick={handleJoinRoom}
                disabled={!roomInput.trim()}
                className="w-full bg-transparent border border-[#00F0FF]/30 hover:border-[#00F0FF] hover:bg-[#00F0FF]/10 text-white font-bold rounded-xl py-2.5 text-xs transition-all active:scale-98 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Присоединиться
              </button>
            </div>
          </div>
        ) : (
          /* SECTION 2: LIVE CHAT & DISCONNECT */
          <div className="flex-grow flex flex-col overflow-hidden h-full">
            {/* Room Info Bar */}
            <div className="p-3 bg-[#161622]/40 border-b border-white/5 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#8E8E9F] uppercase tracking-wider font-semibold">Комната</span>
                <span className="text-xs font-mono font-bold text-[#00F0FF]">{roomCode}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopyLink}
                  className="p-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-[#161622]/40 text-[#8E8E9F] hover:text-white transition-all active:scale-90"
                  title="Копировать код комнаты"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={syncStore.leaveRoom}
                  className="p-1.5 rounded-lg border border-rose-500/30 hover:border-rose-500/60 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-all active:scale-90"
                  title="Покинуть комнату"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Chat Feed */}
            <div className="flex-grow overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <Users className="h-8 w-8 text-white/10 mb-2" />
                  <p className="text-[10px] text-[#8E8E9F]">
                    Вы вошли в комнату.<br />Управление воспроизведением синхронизировано.
                  </p>
                </div>
              ) : (
                chatMessages.map((msg, idx) => {
                  if (msg.isSystem) {
                    return (
                      <div key={idx} className="text-center py-1">
                        <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/5 text-[9px] text-[#8E8E9F] italic">
                          {msg.text}
                        </span>
                      </div>
                    );
                  }

                  const isMe = msg.sender === nickname;
                  return (
                    <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-baseline gap-1.5 mb-0.5">
                        <span className="text-[9px] font-bold text-[#8E8E9F]">{msg.sender}</span>
                        <span className="text-[8px] text-white/30 font-mono">{msg.timestamp}</span>
                      </div>
                      <div className={`px-3 py-1.5 rounded-2xl max-w-[85%] text-xs break-words border font-medium ${isMe ? 'bg-[#FF007F]/10 border-[#FF007F]/30 text-white rounded-tr-none' : 'bg-[#161622]/60 border-white/5 text-white rounded-tl-none'}`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Send Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-[#0D0E15] flex gap-2">
              <input
                type="text"
                className="flex-grow bg-[#161622]/60 border border-white/10 rounded-xl px-3.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#00F0FF]/50 focus:border-[#00F0FF]/50 text-white placeholder-white/20 transition-all"
                placeholder="Сообщение..."
                value={chatInput}
                onInput={(e: any) => setChatInput(e.target.value)}
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="bg-[#00F0FF] hover:bg-[#00D0E0] text-black w-8 h-8 rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#00F0FF]/15 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              >
                <Send className="h-3.5 w-3.5 fill-current" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
