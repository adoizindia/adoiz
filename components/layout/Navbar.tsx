import React, { useState, useEffect } from 'react';
import { User, UserRole, City } from '../../types';
import { dbService } from '../../services/dbService';

interface NavbarProps {
  user: User | null;
  city: City | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onSelectCity: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  user, 
  city,
  activeTab,
  setActiveTab,
  onLogout,
  onSelectCity
}) => {
  const config = dbService.getSystemConfig();

  const menuItems = [
    { id: 'home', icon: 'fa-house', label: 'Home' },
    { id: 'list', icon: 'fa-list-ul', label: 'List' },
    { id: 'sell', icon: 'fa-circle-plus', label: 'Sell', roles: [UserRole.USER, UserRole.MODERATOR, UserRole.ADMIN] },
    { id: 'message', icon: 'fa-comment-dots', label: 'Inbox', protected: true },
    { id: 'profile', icon: 'fa-user-circle', label: 'Account', protected: true },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm transition-transform duration-300 ease-in-out translate-y-0">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-10">
        <div className="flex justify-between items-center h-16 lg:h-20 gap-4 relative">
          
          {/* Logo & City Selector Section */}
          <div className="flex-shrink-0 flex items-center space-x-2 md:space-x-4 transition-opacity duration-200">
            <div 
              onClick={() => setActiveTab('home')} 
              className="cursor-pointer hover:opacity-80 active:scale-95 transition-all flex items-center"
            >
              {config.logoUrl ? (
                <img src={config.logoUrl} className="h-8 md:h-10 lg:h-12 w-auto object-contain" alt={config.siteName} />
              ) : (
                <span className="text-2xl lg:text-3xl font-black text-[#1a73e8] tracking-tighter">
                  {config.siteName}
                </span>
              )}
            </div>

            {city && (
              <button 
                onClick={onSelectCity}
                className="flex items-center space-x-1.5 md:space-x-2 bg-gray-50 hover:bg-blue-50 px-2.5 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl border border-gray-100 hover:border-blue-200 transition-all active:scale-95 group"
              >
                <i className="fas fa-location-dot text-rose-500 text-[10px] md:text-xs"></i>
                <div className="flex flex-col items-start leading-none">
                  <span className="hidden md:block text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Location</span>
                  <span className="text-[10px] md:text-xs font-black text-gray-900 truncate max-w-[60px] md:max-w-[100px]">
                    {city.name}
                  </span>
                </div>
                <i className="fas fa-chevron-down text-[8px] text-gray-300 group-hover:text-blue-500 transition-colors"></i>
              </button>
            )}
          </div>

          {/* User & Menu Sections */}
          <div className="flex items-center space-x-2 transition-opacity duration-200">
            <div className="hidden lg:flex items-center space-x-1 mr-2">
              {menuItems.map((item) => {
                if (item.protected && !user) return null;
                if (item.roles && user && !item.roles.includes(user.role)) return null;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isActive ? 'bg-blue-50 text-[#1a73e8]' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    <i className={`fas ${item.icon} mr-2`}></i>{item.label}
                  </button>
                );
              })}
            </div>
            
            {user ? (
              <div className="flex items-center space-x-3">
                <button onClick={() => setActiveTab('profile')} className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                  <img src={user.photo} className="w-9 h-9 rounded-full object-cover shadow-sm" alt="" />
                  <span className="hidden xl:block text-[10px] font-black uppercase tracking-widest text-gray-700">{user.name.split(' ')[0]}</span>
                </button>
                <button onClick={onLogout} className="p-2.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all" title="Logout">
                  <i className="fas fa-power-off text-sm"></i>
                </button>
              </div>
            ) : (
              <button onClick={() => setActiveTab('auth')} className="bg-[#1a73e8] text-white px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-lg hover:bg-[#1557b0] active:scale-95 transition-all">Sign In</button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
