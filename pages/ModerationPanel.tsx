import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { Listing, ListingStatus, User, BannerAd, SupportTicket, AdReport } from '../types';
import { CITIES } from '../constants';

interface ModerationPanelProps {
  user: User;
  onBack: () => void;
}

type ModTab = 'ADS' | 'BANNERS' | 'TICKETS' | 'REPORTS';

const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
  window.dispatchEvent(new CustomEvent('adoiz-notify', { detail: { message, type } }));
};

export const ModerationPanel: React.FC<ModerationPanelProps> = ({ user, onBack }) => {
  const [activeTab, setActiveTab] = useState<ModTab>('ADS');
  const [adsQueue, setAdsQueue] = useState<Listing[]>([]);
  const [bannersQueue, setBannersQueue] = useState<BannerAd[]>([]);
  const [ticketsQueue, setTicketsQueue] = useState<SupportTicket[]>([]);
  const [reportsQueue, setReportsQueue] = useState<AdReport[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState<string | null>(null);

  // Rejection Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [rejectionType, setRejectionType] = useState<'AD' | 'BANNER' | 'REPORT_REJECT'>('AD');

  const managedCities = user.managedCityIds || [];

  useEffect(() => {
    loadAllQueues(true);
  }, [user]);

  const loadAllQueues = async (initial: boolean = false) => {
    if (initial) setLoading(true);
    setRefreshing(true);
    
    const [ads, banners, tickets, reports] = await Promise.all([
      dbService.getModerationQueue(managedCities),
      dbService.getModerationBanners(managedCities),
      dbService.getModerationTickets(managedCities),
      dbService.getModerationReports(managedCities)
    ]);

    setAdsQueue(ads);
    setBannersQueue(banners);
    setTicketsQueue(tickets);
    setReportsQueue(reports);
    
    setTimeout(() => { setLoading(false); setRefreshing(false); }, 500);
  };

  const handleAdAction = async (id: string, status: ListingStatus) => {
    if (status === ListingStatus.REJECTED) {
      setActiveItemId(id);
      setRejectionType('AD');
      setRejectionNote('');
      setShowRejectModal(true);
      return;
    }
    
    setIsProcessingAction(id);
    try {
      await dbService.updateListingStatus(id, status, undefined, user.id);
      notify(`Ad approved.`, "success");
      loadAllQueues(false);
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessingAction(null);
    }
  };

  const handleReportAction = async (reportId: string, listingId: string, action: 'DISMISS' | 'REMOVE_AD') => {
    setIsProcessingAction(reportId);
    try {
      if (action === 'DISMISS') {
        await dbService.resolveAdReport(reportId, 'DISMISSED');
        notify("Report closed.", "info");
      } else {
        await dbService.updateListingStatus(listingId, ListingStatus.REJECTED, "Reported by users", user.id);
        await dbService.resolveAdReport(reportId, 'RESOLVED');
        notify("Ad removed.", "error");
      }
      loadAllQueues(false);
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessingAction(null);
    }
  };

  const handleBannerAction = async (id: string, status: BannerAd['status']) => {
    if (status === 'REJECTED') {
      setActiveItemId(id);
      setRejectionType('BANNER');
      setRejectionNote('');
      setShowRejectModal(true);
      return;
    }

    setIsProcessingAction(id);
    try {
      await dbService.adminUpdateBannerStatus(id, status, undefined, user.id);
      notify(`Banner ad updated.`, "success");
      loadAllQueues(false);
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessingAction(null);
    }
  };

  const handleTicketAction = async (id: string) => {
    setIsProcessingAction(id);
    try {
      await dbService.resolveTicket(id);
      notify("Support query resolved.", "success");
      loadAllQueues(false);
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessingAction(null);
    }
  };

  const confirmRejection = async () => {
    if (!activeItemId) return;
    setIsProcessingAction(activeItemId);
    const finalReason = rejectionNote.trim() || 'Rules violation';
    try {
      if (rejectionType === 'AD') {
        await dbService.updateListingStatus(activeItemId, ListingStatus.REJECTED, finalReason, user.id);
      } else {
        await dbService.adminUpdateBannerStatus(activeItemId, 'REJECTED', finalReason, user.id);
      }
      notify("Item rejected.", "error");
      setShowRejectModal(false);
      setActiveItemId(null);
      loadAllQueues(false);
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessingAction(null);
    }
  };

  const getCityName = (id: string) => CITIES.find(c => c.id === id)?.name || id;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-32">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <button onClick={onBack} className="text-gray-400 hover:text-blue-600 font-bold text-[10px] uppercase tracking-widest mb-4 flex items-center transition-colors">
            <i className="fas fa-arrow-left mr-2"></i> Go Back
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Review List: {managedCities.length > 0 ? managedCities.map(getCityName).join(', ') : 'All Cities'}</h1>
            <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[9px] font-black uppercase border border-blue-100">REVIEW MODE</span>
          </div>
        </div>
        <button onClick={() => loadAllQueues(false)} disabled={refreshing} className="bg-white border border-gray-200 px-6 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center shadow-sm hover:shadow-md transition-all active:scale-95">
          <i className={`fas fa-sync-alt mr-2 ${refreshing ? 'fa-spin' : ''}`}></i>
          {refreshing ? 'Refreshing...' : 'Refresh List'}
        </button>
      </div>

      <div className="flex items-center space-x-2 mb-8 bg-white p-1.5 rounded-[2rem] border border-gray-100 shadow-sm w-fit overflow-x-auto">
        {[
          { id: 'ADS', label: 'Ads', count: adsQueue.length },
          { id: 'REPORTS', label: 'Reports', count: reportsQueue.length },
          { id: 'BANNERS', label: 'Banners', count: bannersQueue.length },
          { id: 'TICKETS', label: 'Queries', count: ticketsQueue.length }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as ModTab)} 
            className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            {tab.label}
            {tab.count > 0 && <span className={`px-2 py-0.5 rounded-lg text-[8px] ${activeTab === tab.id ? 'bg-white text-blue-600' : 'bg-gray-100 text-gray-400'}`}>{tab.count}</span>}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {loading ? (
          <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-48 bg-white rounded-[2.5rem] animate-pulse"></div>)}</div>
        ) : activeTab === 'ADS' && (
          <div className="space-y-4">
            {adsQueue.length === 0 ? (
              <div className="bg-white rounded-[3rem] p-24 text-center border border-gray-100">
                <i className="fas fa-check-circle text-4xl text-emerald-500 mb-6"></i>
                <h3 className="text-2xl font-black text-gray-900">All Clear</h3>
                <p className="text-gray-500 mt-2">No pending ads to review right now.</p>
              </div>
            ) : (
              adsQueue.map(l => (
                <div key={l.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-8 hover:shadow-md transition-all">
                  <div className="relative group overflow-hidden rounded-3xl w-full md:w-56 h-56 flex-shrink-0">
                    <img src={l.images[0]} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="" />
                    {l.isPremium && <div className="absolute top-4 left-4 bg-yellow-400 text-yellow-900 text-[8px] font-black uppercase px-2 py-1 rounded shadow-lg border border-yellow-500/20"><i className="fas fa-crown"></i> Premium</div>}
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-2">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="text-2xl font-black text-gray-900">{l.title}</h3>
                        <p className="text-2xl font-black text-blue-600">₹{l.price.toLocaleString()}</p>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-4">
                         <span className="text-[10px] font-black uppercase text-gray-400"><i className="fas fa-tag mr-1.5 text-blue-400"></i> {l.category}</span>
                         <span className="text-[10px] font-black uppercase text-gray-400"><i className="fas fa-location-dot mr-1.5 text-rose-400"></i> {getCityName(l.cityId)}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-4 line-clamp-2 leading-relaxed italic">"{l.description}"</p>
                    </div>
                    <div className="flex gap-3 mt-8">
                      <button onClick={() => handleAdAction(l.id, ListingStatus.APPROVED)} disabled={isProcessingAction === l.id} className="flex-1 bg-emerald-600 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">Approve Ad</button>
                      <button onClick={() => handleAdAction(l.id, ListingStatus.REJECTED)} disabled={isProcessingAction === l.id} className="flex-1 bg-white border border-rose-100 text-rose-600 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center justify-center gap-2">Reject Ad</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'REPORTS' && (
          <div className="space-y-4">
            {reportsQueue.length === 0 ? (
              <div className="bg-white rounded-[3rem] p-24 text-center border border-gray-100">
                <i className="fas fa-shield-check text-4xl text-emerald-500 mb-6"></i>
                <h3 className="text-2xl font-black text-gray-900">No Reports</h3>
                <p className="text-gray-500 mt-2">No reported ads found.</p>
              </div>
            ) : (
              reportsQueue.map(r => (
                <div key={r.id} className="bg-white p-8 rounded-[2.5rem] border-l-4 border-rose-500 shadow-sm flex flex-col gap-6">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded text-[8px] font-black uppercase">{r.reason}</span>
                        <h4 className="text-lg font-black text-gray-900">Re: {r.listingTitle}</h4>
                      </div>
                      <p className="text-sm text-gray-600 italic">"{r.details || 'No additional comments.'}"</p>
                      <div className="flex gap-4 mt-4">
                        <span className="text-[9px] font-black uppercase text-gray-400"><i className="fas fa-user-tag mr-1"></i> Reported by: {r.reporterName}</span>
                        <span className="text-[9px] font-black uppercase text-blue-500"><i className="fas fa-location-dot mr-1"></i> {getCityName(r.cityId)}</span>
                      </div>
                    </div>
                    <div className="flex md:flex-col gap-2 w-full md:w-auto">
                      <button onClick={() => handleReportAction(r.id, r.listingId, 'REMOVE_AD')} disabled={isProcessingAction === r.id} className="flex-1 bg-rose-600 text-white px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-rose-100">Remove Ad</button>
                      <button onClick={() => handleReportAction(r.id, r.listingId, 'DISMISS')} disabled={isProcessingAction === r.id} className="flex-1 bg-gray-50 text-gray-400 px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-100 border border-gray-100">Close</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'BANNERS' && (
          <div className="space-y-4">
            {bannersQueue.length === 0 ? (
              <div className="bg-white rounded-[3rem] p-24 text-center border border-gray-100">
                <i className="fas fa-rectangle-ad text-4xl text-blue-500 mb-6"></i>
                <h3 className="text-2xl font-black text-gray-900">No Banners Awaiting</h3>
              </div>
            ) : (
              bannersQueue.map(b => (
                <div key={b.id} className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-6">
                  <div className="flex justify-between items-start">
                     <div>
                        <h4 className="text-xl font-black text-gray-900 uppercase">{b.title || 'Untitled Banner'}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">City: <span className="text-blue-500">{getCityName(b.cityId)}</span></p>
                     </div>
                     <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-xl text-[9px] font-black">PENDING</span>
                  </div>
                  <div className="relative group rounded-[2rem] overflow-hidden border border-gray-100" style={{ aspectRatio: '4 / 1' }}>
                    <img src={b.imageUrl} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <a href={b.linkUrl} target="_blank" rel="noreferrer" className="bg-white text-gray-900 px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-xl">Visit Link <i className="fas fa-external-link-alt ml-1"></i></a>
                    </div>
                  </div>
                  <div className="mt-3 px-1">
                     <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Target Link:</p>
                     <a href={b.linkUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-xs font-bold hover:underline break-all flex items-center gap-2 bg-blue-50 p-3 rounded-xl border border-blue-100">
                        <i className="fas fa-link"></i> {b.linkUrl}
                     </a>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => handleBannerAction(b.id, 'LIVE')} disabled={isProcessingAction === b.id} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-emerald-100">Activate Ad</button>
                    <button onClick={() => handleBannerAction(b.id, 'REJECTED')} disabled={isProcessingAction === b.id} className="flex-1 bg-white border border-rose-100 text-rose-600 py-4 rounded-2xl text-[10px] font-black uppercase">Reject Ad</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'TICKETS' && (
          <div className="space-y-4">
            {ticketsQueue.length === 0 ? (
              <div className="bg-white rounded-[3rem] p-24 text-center border border-gray-100">
                <i className="fas fa-clipboard-check text-4xl text-emerald-500 mb-6"></i>
                <h3 className="text-2xl font-black text-gray-900">No Queries</h3>
              </div>
            ) : (
              ticketsQueue.map(t => (
                <div key={t.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-black text-gray-900 uppercase">{t.subject}</h4>
                      <span className="bg-rose-50 text-rose-500 px-2 py-0.5 rounded text-[8px] font-black uppercase">Open</span>
                    </div>
                    <p className="text-sm text-gray-600 font-medium mb-3 italic">"{t.message}"</p>
                    <div className="flex gap-4">
                       <span className="text-[9px] font-black uppercase text-gray-400"><i className="fas fa-user-circle mr-1"></i> From: {t.userName}</span>
                    </div>
                  </div>
                  <button onClick={() => handleTicketAction(t.id)} disabled={isProcessingAction === t.id} className="w-full md:w-auto bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">Mark Resolved</button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="bg-rose-600 p-8 text-white text-center">
                <h3 className="text-2xl font-black">Reject Request</h3>
              </div>
              <div className="p-10 space-y-6">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Please provide a reason</p>
                 <textarea rows={4} className="w-full bg-gray-50 border-2 border-gray-100 p-6 rounded-3xl text-sm font-bold outline-none focus:border-rose-300 focus:bg-white transition-all" value={rejectionNote} onChange={e => setRejectionNote(e.target.value)} placeholder="e.g. Inappropriate content..." />
                 <button onClick={confirmRejection} disabled={isProcessingAction === activeItemId} className="w-full bg-rose-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all flex items-center justify-center gap-2 active:scale-95">
                    Confirm Rejection
                 </button>
                 <button onClick={() => setShowRejectModal(false)} className="w-full py-4 text-gray-400 font-black uppercase text-[10px] tracking-widest">Cancel</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};