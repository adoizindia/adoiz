
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { Listing, ListingStatus, User } from '../types';

interface ModerationPanelProps {
  user: User;
  onBack: () => void;
}

export const ModerationPanel: React.FC<ModerationPanelProps> = ({ user, onBack }) => {
  const [queue, setQueue] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Rejection Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [activeListingId, setActiveListingId] = useState<string | null>(null);

  useEffect(() => {
    loadQueue(true);
  }, [user]);

  const loadQueue = async (initial: boolean = false) => {
    if (initial) setLoading(true);
    setRefreshing(true);
    
    const cityId = user.managedCityIds && user.managedCityIds.length > 0 
      ? user.managedCityIds[0] 
      : undefined;
      
    const data = await dbService.getModerationQueue(cityId);
    setQueue(data);
    
    setTimeout(() => {
      setLoading(false);
      setRefreshing(false);
    }, 500);
  };

  const handleAction = async (id: string, status: ListingStatus) => {
    if (status === ListingStatus.REJECTED) {
      setActiveListingId(id);
      setRejectionNote('');
      setShowRejectModal(true);
      return;
    }
    
    await dbService.updateListingStatus(id, status);
    loadQueue(false);
  };

  const confirmRejection = async () => {
    if (!activeListingId) return;
    
    // Note is optional, defaults to 'Policy violation' if empty
    const finalReason = rejectionNote.trim() || 'Policy violation';
    await dbService.updateListingStatus(activeListingId, ListingStatus.REJECTED, finalReason);
    
    setShowRejectModal(false);
    setActiveListingId(null);
    loadQueue(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-32">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button onClick={onBack} className="text-gray-400 hover:text-blue-600 font-bold text-xs uppercase tracking-widest mb-4 flex items-center transition-colors">
            <i className="fas fa-arrow-left mr-2"></i> Back to Dashboard
          </button>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Moderation Queue</h1>
          <p className="text-gray-500 font-medium mt-1">
            Reviewing listings for: <span className="text-blue-600 font-bold">{user.managedCityIds && user.managedCityIds.length > 0 ? user.managedCityIds.join(', ') : 'All Cities'}</span>
          </p>
        </div>
        <button 
          onClick={() => loadQueue(false)}
          disabled={refreshing}
          className={`bg-white border border-gray-200 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all self-start md:self-center flex items-center ${refreshing ? 'text-blue-600 opacity-50' : 'text-gray-900 hover:bg-gray-50 shadow-sm hover:shadow'}`}
        >
          <i className={`fas fa-sync-alt mr-2 ${refreshing ? 'fa-spin' : ''}`}></i>
          {refreshing ? 'Updating...' : 'Refresh List'}
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-white border border-gray-100 rounded-[2rem] p-6 flex gap-6 animate-pulse">
              <div className="w-40 h-full bg-gray-50 rounded-xl"></div>
              <div className="flex-1 space-y-4 py-2">
                <div className="h-4 bg-gray-50 rounded w-3/4"></div>
                <div className="h-10 bg-gray-50 rounded w-full"></div>
                <div className="flex gap-2 pt-4">
                  <div className="h-8 bg-gray-50 rounded flex-1"></div>
                  <div className="h-8 bg-gray-50 rounded flex-1"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : queue.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] p-24 text-center border border-dashed border-gray-200">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <i className="fas fa-check-circle text-3xl text-emerald-500"></i>
          </div>
          <h3 className="text-2xl font-black text-gray-900">Queue Cleared!</h3>
          <p className="text-gray-500 mt-2 max-w-sm mx-auto">There are currently no listings pending moderation in your assigned areas.</p>
          <button 
            onClick={() => loadQueue(false)} 
            className="mt-8 text-blue-600 font-black uppercase text-[10px] tracking-widest hover:underline"
          >
            Check again
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map(l => (
            <div key={l.id} className="group bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col md:flex-row gap-6 relative overflow-hidden">
              <div className="relative flex-shrink-0">
                <img src={l.images[0]} className="w-full md:w-48 h-48 object-cover rounded-2xl shadow-sm border border-gray-50" alt="" />
                {l.isPremium && (
                  <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[8px] font-black uppercase px-2 py-1 rounded shadow-lg">
                    Premium Post
                  </div>
                )}
              </div>
              
              <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-black text-gray-900 truncate">{l.title}</h3>
                    <div className="flex items-center space-x-3 mt-1">
                      <p className="text-blue-600 font-black text-lg leading-none">₹{l.price.toLocaleString('en-IN')}</p>
                      <span className="text-[10px] font-black uppercase bg-gray-50 border border-gray-100 px-2 py-0.5 rounded text-gray-400">{l.category}</span>
                      <span className="text-[10px] font-black text-gray-400 uppercase">• {l.cityId}</span>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{new Date(l.createdAt).toLocaleDateString()}</span>
                    <p className="text-[9px] font-bold text-blue-400 mt-1 uppercase">ID: {l.id}</p>
                  </div>
                </div>
                
                <p className="text-gray-500 text-sm mt-3 line-clamp-3 leading-relaxed flex-1 italic bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                  "{l.description}"
                </p>
                
                <div className="flex gap-2 mt-6">
                  <button 
                    onClick={() => handleAction(l.id, ListingStatus.APPROVED)}
                    className="flex-1 bg-emerald-600 text-white px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95 flex items-center justify-center"
                  >
                    <i className="fas fa-check mr-2"></i> Approve Ad
                  </button>
                  <button 
                    onClick={() => handleAction(l.id, ListingStatus.REJECTED)}
                    className="flex-1 bg-white border border-rose-100 text-rose-600 px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all active:scale-95 flex items-center justify-center"
                  >
                    <i className="fas fa-times mr-2"></i> Reject Ad
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="bg-rose-600 p-8 text-white text-center">
                 <h3 className="text-2xl font-black">Reject Listing</h3>
                 <p className="text-rose-100 text-[10px] font-black uppercase tracking-widest mt-2">Identify Policy Violation</p>
              </div>
              <div className="p-10 space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Rejection Note (Optional)</label>
                    <textarea 
                      autoFocus
                      rows={4}
                      className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl text-sm font-bold focus:border-rose-500 outline-none transition-all placeholder:text-gray-300" 
                      value={rejectionNote} 
                      onChange={e => setRejectionNote(e.target.value)} 
                      placeholder="Explain why this listing is being rejected..." 
                    />
                 </div>
                 <div className="flex flex-col gap-3 pt-4">
                    <button 
                      onClick={confirmRejection} 
                      className="w-full bg-rose-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all active:scale-95"
                    >
                      Confirm Rejection
                    </button>
                    <button 
                      onClick={() => { setShowRejectModal(false); setActiveListingId(null); }} 
                      className="w-full py-4 text-gray-400 font-black uppercase text-[10px] tracking-widest hover:text-gray-600 transition-colors"
                    >
                      Go Back
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
