
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { Listing, ListingStatus, User } from '../types';

interface ModerationPanelProps {
  user: User;
  onBack: () => void;
}

const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
  window.dispatchEvent(new CustomEvent('adoiz-notify', { detail: { message, type } }));
};

export const ModerationPanel: React.FC<ModerationPanelProps> = ({ user, onBack }) => {
  const [queue, setQueue] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState<string | null>(null);

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
    const cityId = user.managedCityIds && user.managedCityIds.length > 0 ? user.managedCityIds[0] : undefined;
    const data = await dbService.getModerationQueue(cityId);
    setQueue(data);
    setTimeout(() => { setLoading(false); setRefreshing(false); }, 500);
  };

  const handleAction = async (id: string, status: ListingStatus) => {
    if (status === ListingStatus.REJECTED) {
      setActiveListingId(id);
      setRejectionNote('');
      setShowRejectModal(true);
      return;
    }
    
    setIsProcessingAction(id);
    try {
      await dbService.updateListingStatus(id, status);
      notify(`Listing ${status === ListingStatus.APPROVED ? 'approved' : 'updated'}.`, "success");
      loadQueue(false);
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessingAction(null);
    }
  };

  const confirmRejection = async () => {
    if (!activeListingId) return;
    setIsProcessingAction(activeListingId);
    const finalReason = rejectionNote.trim() || 'Policy violation';
    try {
      await dbService.updateListingStatus(activeListingId, ListingStatus.REJECTED, finalReason);
      notify("Listing rejected successfully.", "error");
      setShowRejectModal(false);
      setActiveListingId(null);
      loadQueue(false);
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessingAction(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-32">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button onClick={onBack} className="text-gray-400 hover:text-blue-600 font-bold text-xs uppercase tracking-widest mb-4 flex items-center transition-colors">
            <i className="fas fa-arrow-left mr-2"></i> Back to Core
          </button>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Moderation Queue</h1>
        </div>
        <button onClick={() => loadQueue(false)} disabled={refreshing} className="bg-white border border-gray-200 px-6 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center">
          <i className={`fas fa-sync-alt mr-2 ${refreshing ? 'fa-spin' : ''}`}></i>
          {refreshing ? 'Refreshing...' : 'Refresh List'}
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-40 bg-white rounded-[2rem] animate-pulse"></div>)}</div>
      ) : queue.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] p-24 text-center border-2 border-dashed border-gray-100">
          <i className="fas fa-check-circle text-3xl text-emerald-500 mb-6"></i>
          <h3 className="text-2xl font-black">All Clear!</h3>
          <p className="text-gray-500 mt-2">No pending listings found in your queue.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map(l => (
            <div key={l.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6">
              <img src={l.images[0]} className="w-full md:w-48 h-48 object-cover rounded-2xl shadow-sm" alt="" />
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-black text-gray-900">{l.title}</h3>
                  <p className="text-blue-600 font-black text-lg">₹{l.price.toLocaleString()}</p>
                </div>
                <div className="flex gap-2 mt-6">
                  <button onClick={() => handleAction(l.id, ListingStatus.APPROVED)} disabled={isProcessingAction === l.id} className="flex-1 bg-emerald-600 text-white px-6 py-3.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2">
                    {isProcessingAction === l.id ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-check"></i>} Approve
                  </button>
                  <button onClick={() => handleAction(l.id, ListingStatus.REJECTED)} disabled={isProcessingAction === l.id} className="flex-1 bg-white border border-rose-100 text-rose-600 px-6 py-3.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2">
                    {isProcessingAction === l.id ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-times"></i>} Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="bg-rose-600 p-8 text-white text-center"><h3 className="text-2xl font-black">Reject Ad</h3></div>
              <div className="p-10 space-y-6">
                 <textarea rows={4} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl text-sm font-bold outline-none" value={rejectionNote} onChange={e => setRejectionNote(e.target.value)} placeholder="Reason for rejection..." />
                 <button onClick={confirmRejection} disabled={isProcessingAction === activeListingId} className="w-full bg-rose-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] shadow-xl flex items-center justify-center gap-2">
                    {isProcessingAction === activeListingId ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-times"></i>} Confirm Rejection
                 </button>
                 <button onClick={() => setShowRejectModal(false)} className="w-full py-4 text-gray-400 font-black uppercase text-[10px]">Cancel</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
