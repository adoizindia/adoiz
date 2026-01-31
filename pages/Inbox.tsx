
import React, { useState, useEffect } from 'react';
import { User, Chat } from '../types';
import { dbService } from '../services/dbService';

interface InboxProps {
  user: User;
  onSelectChat: (chat: Chat) => void;
}

export const Inbox: React.FC<InboxProps> = ({ user, onSelectChat }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChats();
  }, [user.id]);

  const loadChats = async () => {
    setLoading(true);
    const data = await dbService.getChatsForUser(user.id);
    setChats(data);
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Inbox</h1>
          <p className="text-gray-500 text-sm font-medium mt-1">Manage your inquiries and offers</p>
        </div>
        <div className="bg-blue-100 text-blue-600 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest">
          {chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0)} New
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-20 text-center">
            <i className="fas fa-circle-notch fa-spin text-blue-500 text-2xl"></i>
          </div>
        ) : chats.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-comment-slash text-gray-300 text-3xl"></i>
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">No messages yet</h3>
            <p className="text-gray-500">When you contact sellers or buyers, your chats will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {chats.map((chat) => (
              <div 
                key={chat.id} 
                className="p-6 hover:bg-blue-50/50 transition-colors cursor-pointer flex items-center space-x-4 group"
                onClick={() => onSelectChat(chat)}
              >
                <div className="relative">
                  <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 font-black text-xl">
                    {chat.otherPartyName.charAt(0)}
                  </div>
                  {(chat.unreadCount || 0) > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 border-2 border-white rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                      {chat.unreadCount}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-black text-gray-900 truncate">{chat.otherPartyName}</h4>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest whitespace-nowrap">
                      {chat.lastTimestamp ? new Date(chat.lastTimestamp).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-blue-600 mb-1 truncate uppercase tracking-tighter">
                    Re: {chat.listingTitle}
                  </p>
                  <p className={`text-sm truncate ${(chat.unreadCount || 0) > 0 ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
                    {chat.lastMessage || 'No messages yet'}
                  </p>
                </div>
                
                <div className="text-gray-300 group-hover:text-blue-600 transition-colors px-2">
                  <i className="fas fa-chevron-right"></i>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-8 bg-blue-50 rounded-3xl p-6 flex items-center space-x-4 border border-blue-100">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
          <i className="fas fa-shield-alt"></i>
        </div>
        <div>
          <p className="text-sm font-black text-blue-900">Safety Tip</p>
          <p className="text-xs text-blue-700/80">Never share your OTP or bank details in chat. ADOIZ never asks for your password.</p>
        </div>
      </div>
    </div>
  );
};
