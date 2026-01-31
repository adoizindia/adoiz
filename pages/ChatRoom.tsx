
import React, { useState, useEffect, useRef } from 'react';
import { User, Chat, Message } from '../types';
import { dbService } from '../services/dbService';

interface ChatRoomProps {
  user: User;
  chat: Chat;
  onBack: () => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ user, chat, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, [chat.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async () => {
    setLoading(true);
    const data = await dbService.getMessages(chat.id);
    setMessages(data);
    setLoading(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText;
    setInputText('');

    const newMsg = await dbService.sendMessage(chat.id, user.id, text);
    setMessages(prev => [...prev, newMsg]);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 max-w-2xl mx-auto border-x border-gray-100 relative overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 p-4 flex items-center space-x-4 sticky top-0 z-10 shadow-sm">
        <button onClick={onBack} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
          <i className="fas fa-arrow-left text-xl"></i>
        </button>
        <div className="flex-1 flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex-shrink-0 flex items-center justify-center text-blue-600 font-black">
            {chat.otherPartyName.charAt(0)}
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-gray-900 truncate">{chat.otherPartyName}</h3>
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tighter truncate">
              {chat.listingTitle}
            </p>
          </div>
        </div>
        <button className="p-2 text-gray-300 hover:text-red-500">
          <i className="fas fa-flag"></i>
        </button>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {loading ? (
          <div className="flex justify-center py-10">
            <i className="fas fa-circle-notch fa-spin text-blue-500 text-2xl"></i>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <i className="fas fa-comments text-blue-200 text-2xl"></i>
            </div>
            <p className="text-gray-400 font-bold text-sm">Start a conversation with {chat.otherPartyName}</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.senderId === user.id;
            return (
              <div 
                key={m.id} 
                className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
                  isMe 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-white text-gray-700 rounded-tl-none border border-gray-100'
                }`}>
                  <p className="text-sm font-medium leading-relaxed">{m.text}</p>
                  <p className={`text-[8px] mt-2 font-black uppercase tracking-widest ${
                    isMe ? 'text-blue-100 text-right' : 'text-gray-300'
                  }`}>
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input - Sticky at bottom of parent which is h-full */}
      <div className="p-4 bg-white border-t border-gray-100 sticky bottom-0 z-10">
        <form onSubmit={handleSend} className="flex items-center space-x-2">
          <input 
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
          />
          <button 
            type="submit"
            disabled={!inputText.trim()}
            className="bg-blue-600 text-white w-14 h-14 rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center disabled:opacity-50"
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      </div>
    </div>
  );
};
