
import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/dbService';
import { Category } from '../../types';

export const Footer: React.FC = () => {
  const config = dbService.getSystemConfig();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedPage, setSelectedPage] = useState<{ label: string; content: string } | null>(null);

  useEffect(() => {
    dbService.getCategories().then(setCategories);
  }, []);

  const handleResourceClick = (e: React.MouseEvent, link: { label: string; url: string; content?: string }) => {
    if (link.content) {
      e.preventDefault();
      setSelectedPage({ label: link.label, content: link.content });
    }
  };

  return (
    <footer className="hidden md:block bg-gray-100 border-t border-gray-200 pt-16 pb-8">
      <div className="max-w-[1400px] mx-auto px-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-16">
          {/* Section 1: Brand & Identity */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-blue-100/50">A</div>
              <span className="text-2xl font-black text-gray-900 tracking-tighter uppercase">{config.siteName}</span>
            </div>
            <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-sm">
              {config.branding.siteTagline}
              <br />
              Premium city-locked local marketplace platform. Experience secure peer-to-peer trading in your immediate vicinity.
            </p>
            <div className="flex items-center gap-3 pt-2">
              {config.branding.social.facebook && <a href={config.branding.social.facebook} target="_blank" className="w-10 h-10 bg-white text-gray-400 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-gray-200"><i className="fab fa-facebook-f text-sm"></i></a>}
              {config.branding.social.instagram && <a href={config.branding.social.instagram} target="_blank" className="w-10 h-10 bg-white text-gray-400 rounded-xl flex items-center justify-center hover:bg-pink-600 hover:text-white transition-all shadow-sm border border-gray-200"><i className="fab fa-instagram text-sm"></i></a>}
              {config.branding.social.twitter && <a href={config.branding.social.twitter} target="_blank" className="w-10 h-10 bg-white text-gray-400 rounded-xl flex items-center justify-center hover:bg-sky-500 hover:text-white transition-all shadow-sm border border-gray-200"><i className="fab fa-twitter text-sm"></i></a>}
              {config.branding.social.linkedin && <a href={config.branding.social.linkedin} target="_blank" className="w-10 h-10 bg-white text-gray-400 rounded-xl flex items-center justify-center hover:bg-blue-700 hover:text-white transition-all shadow-sm border border-gray-200"><i className="fab fa-linkedin-in text-sm"></i></a>}
            </div>
          </div>

          {/* Section 2: Quick Access (Resources Only) */}
          <div className="space-y-6">
            <h4 className="text-[11px] font-black uppercase text-gray-900 tracking-[0.2em]">Resources</h4>
            <ul className="space-y-3">
              {(config.branding.resourceLinks || []).map((link, idx) => (
                <li key={idx}>
                  <a 
                    href={link.url || '#'} 
                    onClick={(e) => handleResourceClick(e, link)}
                    className="text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li><a href="#" className="text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors">Help Center</a></li>
              <li><a href="#" className="text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors">Terms of Service</a></li>
            </ul>
          </div>

          {/* Section 3: Contact & Support */}
          <div className="space-y-6 bg-gray-200/50 p-8 rounded-[2.5rem] border border-gray-200/50">
            <h4 className="text-[11px] font-black uppercase text-gray-900 tracking-[0.2em]">Support Desk</h4>
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white text-blue-600 rounded-xl flex items-center justify-center text-sm shadow-sm border border-gray-200"><i className="fas fa-envelope"></i></div>
                <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Email Support</p>
                    <p className="text-sm font-black text-gray-700">{config.branding.supportEmail}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white text-emerald-600 rounded-xl flex items-center justify-center text-sm shadow-sm border border-gray-200"><i className="fas fa-phone-alt"></i></div>
                <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Contact Number</p>
                    <p className="text-sm font-black text-gray-700">{config.branding.supportPhone}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-200/50">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Corporate HQ</p>
                <p className="text-xs text-gray-600 leading-relaxed font-bold">
                  {config.branding.address}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
            {config.branding.footerText || `© ${new Date().getFullYear()} ${config.siteName}. All Rights Reserved.` || "© 2025 ADOIZ."}
          </p>
        </div>
      </div>

      {/* Resource Page Content Modal */}
      {selectedPage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center p-8 border-b border-gray-50 bg-gray-50/30">
              <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{selectedPage.label}</h3>
              <button 
                onClick={() => setSelectedPage(null)}
                className="w-12 h-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-rose-500 transition-all shadow-sm"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="prose prose-blue max-w-none">
                 <p className="text-gray-600 font-medium leading-relaxed whitespace-pre-wrap">
                   {selectedPage.content}
                 </p>
              </div>
            </div>
            <div className="p-8 border-t border-gray-50 text-center">
               <button 
                onClick={() => setSelectedPage(null)}
                className="bg-blue-600 text-white px-10 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
               >
                 Close Window
               </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
