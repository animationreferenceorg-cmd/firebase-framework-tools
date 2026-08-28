'use client';

import React, { useState } from 'react';
import { 
  MessageSquare, 
  Send, 
  Hash, 
  Paperclip, 
  User, 
  Sparkles,
  Paintbrush,
  Film,
  Smile,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChatMessage {
  id: string;
  author: string;
  avatar: string;
  text: string;
  time: string;
  channel: string;
}

export function StudioChat() {
  const [activeChannel, setActiveChannel] = useState<string>('general');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      channel: 'general',
      author: 'Alex Rivera',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      text: 'Hey team! Act 1 concept art turnaround is up on the Pipeline Board.',
      time: '10:14 AM',
    },
    {
      id: 'm2',
      channel: 'general',
      author: 'Sarah Chen',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
      text: 'Awesome! Checking it out now. Will export the 2D keyframes to UE5 once approved.',
      time: '10:18 AM',
    },
    {
      id: 'm3',
      channel: 'concept-art',
      author: 'Elena Rostova',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      text: 'Just finished the lighting pass on the ancient temple background.',
      time: '11:02 AM',
    },
  ]);

  const [inputMsg, setInputMsg] = useState('');

  const channels = [
    { id: 'general', name: 'general', count: 2 },
    { id: 'script', name: 'script-writers', count: 1 },
    { id: 'concept-art', name: 'concept-art', count: 4 },
    { id: 'animation', name: 'animation-2d-3d', count: 3 },
    { id: 'game-dev', name: 'game-engine-ue5-unity', count: 2 },
  ];

  const handleSend = () => {
    if (!inputMsg.trim()) return;
    const msg: ChatMessage = {
      id: `m-${Date.now()}`,
      channel: activeChannel,
      author: 'You',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      text: inputMsg,
      time: 'Just now',
    };
    setMessages([...messages, msg]);
    setInputMsg('');
  };

  const channelMsgs = messages.filter((m) => m.channel === activeChannel);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#050508] p-6 text-zinc-300">
      
      {/* Main Chat Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-0 overflow-hidden bg-[#0a0a0f] border border-white/5 rounded-2xl shadow-md">
        
        {/* Left Column: Channels Sidebar */}
        <div className="flex flex-col gap-4 border-r border-white/5 bg-[#050508]/50 p-4">
          <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest pl-2">PROJECT CHANNELS</label>
          <div className="space-y-0.5">
            {channels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={cn(
                  "w-full px-3 py-2 rounded-lg text-xs font-mono font-bold flex items-center justify-between transition-all cursor-pointer",
                  activeChannel === ch.id
                    ? "bg-[#161622] text-zinc-200 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                )}
              >
                <span className="flex items-center gap-2">
                  <Hash className={cn("h-3.5 w-3.5", activeChannel === ch.id ? "text-purple-400" : "opacity-60")} />
                  <span>{ch.name}</span>
                </span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded",
                  activeChannel === ch.id ? "bg-purple-500/20 text-purple-300" : "bg-black/40 text-zinc-500"
                )}>{ch.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right 3 Columns: Active Channel Messages */}
        <div className="md:col-span-3 flex flex-col gap-0 overflow-hidden bg-[#0a0a0f]">
          
          {/* Channel Header */}
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between text-[13px] font-bold text-zinc-200 bg-[#0a0a0f] z-10 shadow-sm">
            <span className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-zinc-500" />
              <span>{activeChannel}</span>
            </span>
            <span className="text-zinc-500 font-normal text-xs">Team Discussion Channel</span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {channelMsgs.map((m) => (
              <div key={m.id} className="flex gap-4 items-start group">
                <img src={m.avatar} alt={m.author} className="w-10 h-10 rounded-full object-cover shrink-0 border border-white/5" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-bold text-zinc-200">{m.author}</span>
                    <span className="text-[10px] font-mono text-zinc-500 group-hover:text-zinc-400 transition-colors">{m.time}</span>
                  </div>
                  <p className="text-[13px] text-zinc-300 leading-relaxed font-sans">{m.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Send Input Bar */}
          <div className="p-4 bg-[#0a0a0f]">
            <div className="flex items-center gap-3 bg-[#12121a] border border-white/5 focus-within:border-purple-500/50 rounded-xl p-2 transition-colors shadow-sm">
              <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/10 cursor-pointer transition-colors">
                <Plus className="h-5 w-5" />
              </div>
              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={`Message #${activeChannel}`}
                className="flex-1 bg-transparent px-2 text-[13px] text-zinc-200 focus:outline-none placeholder:text-zinc-600"
              />
              <button
                onClick={handleSend}
                className="h-9 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[13px] flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
