
import React from 'react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'home', icon: 'fa-home', label: 'Home' },
    { id: 'list', icon: 'fa-list', label: 'List' },
    { id: 'sell', icon: 'fa-plus-circle', label: 'Post Ad' },
    { id: 'message', icon: 'fa-comment-dots', label: 'Inbox' },
    { id: 'profile', icon: 'fa-user', label: 'Account' }
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex justify-around items-center z-50 pb-safe">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex flex-col items-center transition-colors ${
            activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'
          }`}
        >
          <i className={`fas ${tab.icon} text-xl mb-1`}></i>
          <span className="text-[10px] font-medium">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};
