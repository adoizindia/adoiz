
import React, { useState, useEffect } from 'react';
import { Listing, User, BannerAd, AdReport, Rating } from '../types';
import { dbService } from '../services/dbService';
import { CITIES } from '../constants';

interface ProductDetailProps {
  user: User | null;
  listing: Listing;
  seller: User;
  onBack: () => void;
  onContactSeller: (listing: Listing, seller: User) => void;
  onListingClick: (listing: Listing) => void;
}

const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
  window.dispatchEvent(new CustomEvent('adoiz-notify', { detail: { message, type } }));
};

export const ProductDetail: React.FC<ProductDetailProps> = ({ 
  user,
  listing, 
  seller, 
  onBack, 
  onContactSeller,
  onListingClick
}) => {
  const [isNumberRevealed, setIsNumberRevealed] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [relatedListings, setRelatedListings] = useState<Listing[]>([]);
  const [banners, setBanners] = useState<BannerAd[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [sellerRatings, setSellerRatings] = useState<Rating[]>([]);

  // Reporting State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState<{ reason: AdReport['reason']; details: string }>({
    reason: 'OTHER',
    details: ''
  });
  const [isReporting, setIsReporting] = useState(false);

  // Rating State
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  useEffect(() => {
    dbService.getListingsByCity(listing.cityId).then(all => {
      const filtered = all.filter(l => l.id !== listing.id).slice(0, 4);
      setRelatedListings(filtered);
    });
    dbService.getActiveBanners(listing.cityId).then(setBanners);
    dbService.getRatingsForUser(seller.id).then(setSellerRatings);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveImageIndex(0);
    setCurrentBannerIndex(0);
  }, [listing.id, listing.cityId, seller.id]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 3000); // 3 seconds rotation
    return () => clearInterval(timer);
  }, [banners.length]);

  const nextBanner = () => setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
  const prevBanner = () => setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length);

  const handleReveal = () => setIsNumberRevealed(true);

  const handleContact = async () => {
    setIsConnecting(true);
    await onContactSeller(listing, seller);
    setIsConnecting(false);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsReporting(true);
    try {
      await dbService.createAdReport({
        listingId: listing.id,
        listingTitle: listing.title,
        reporterId: user.id,
        reporterName: user.name,
        cityId: listing.cityId,
        reason: reportForm.reason,
        details: reportForm.details
      });
      notify("Ad reported successfully. Our team will review it.", "success");
      setShowReportModal(false);
      setReportForm({ reason: 'OTHER', details: '' });
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsReporting(false);
    }
  };

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmittingRating(true);
    try {
      await dbService.submitRating(user, seller.id, ratingScore, ratingComment);
      notify("Thank you for your feedback!", "success");
      setShowRatingModal(false);
      setRatingComment('');
      // Refresh seller ratings
      const updatedRatings = await dbService.getRatingsForUser(seller.id);
      setSellerRatings(updatedRatings);
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const getFormattedCity = (cityId: string) => {
    const city = CITIES.find(c => c.id === cityId);
    return city ? `${city.name} - ${cityId}` : cityId;
  };

  const nextImage = () => setActiveImageIndex((prev) => (prev + 1) % listing.images.length);
  const prevImage = () => setActiveImageIndex((prev) => (prev - 1 + listing.images.length) % listing.images.length);

  const renderStars = (score: number) => {
    return [...Array(5)].map((_, i) => (
      <i key={i} className={`fas fa-star ${i < Math.floor(score) ? 'text-yellow-400' : 'text-gray-200'}`}></i>
    ));
  };

  return (
    <div className="max-w-7xl mx-auto p-0">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl shadow-blue-50 border border-gray-100 relative group aspect-[16/10]">
              <img src={listing.images[activeImageIndex]} className="w-full h-full object-cover transition-all duration-500" alt="" />
              {listing.isPremium && (
                <div className="absolute top-6 left-6 bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase px-3 py-1.5 rounded-xl shadow-2xl border border-yellow-500/20 z-10">
                  <i className="fas fa-crown mr-1.5"></i> Premium Ad
                </div>
              )}
              {listing.images.length > 1 && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"><i className="fas fa-chevron-left"></i></button>
                  <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"><i className="fas fa-chevron-right"></i></button>
                  <div className="absolute bottom-6 right-6 bg-black/50 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-xl border border-white/10">{activeImageIndex + 1} / {listing.images.length}</div>
                </>
              )}
            </div>
            {listing.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                {listing.images.map((img, idx) => (
                  <button key={idx} onClick={() => setActiveImageIndex(idx)} className={`relative w-24 h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${activeImageIndex === idx ? 'border-blue-600 ring-2 ring-blue-100' : 'border-transparent opacity-70 hover:opacity-100'}`}><img src={img} className="w-full h-full object-cover" /></button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
              <div>
                <span className="bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg mb-3 inline-block">{listing.category}</span>
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight">{listing.title}</h1>
              </div>
              <div className="text-left md:text-right">
                <p className="text-4xl font-black text-blue-600">₹{listing.price.toLocaleString()}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Negotiable</p>
              </div>
            </div>
            <div className="h-px bg-gray-50 my-8"></div>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-align-left text-blue-600 text-xs"></i>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Description</h3>
                </div>
                {user && user.id !== listing.sellerId && (
                  <button onClick={() => setShowReportModal(true)} className="text-rose-500 hover:text-rose-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors">
                    <i className="fas fa-flag"></i> Report Ad
                  </button>
                )}
              </div>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap font-medium">{listing.description}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
               <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Posted On</p><p className="text-xs font-bold text-gray-900">{new Date(listing.createdAt).toLocaleDateString()}</p></div>
               <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Views</p><p className="text-xs font-bold text-gray-900">{listing.views} Impressions</p></div>
               <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Ad ID</p><p className="text-xs font-bold text-gray-900">#{listing.id.slice(-6).toUpperCase()}</p></div>
               <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Location</p><p className="text-xs font-bold text-gray-900">{getFormattedCity(listing.cityId)}</p></div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 sticky top-8">
            <div className="flex items-center space-x-4 mb-8">
              <div className="relative">
                <img src={seller.photo} className="w-20 h-20 rounded-2xl object-cover ring-4 ring-blue-50" alt="" />
                {seller.isVerified && <div className="absolute -bottom-1 -right-1 bg-white text-blue-600 w-6 h-6 rounded-full flex items-center justify-center shadow-lg border border-blue-50"><i className="fas fa-check-circle text-xs"></i></div>}
              </div>
              <div>
                <h4 className="font-black text-xl text-gray-900 leading-none">{seller.name}</h4>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-2">{seller.isVerified ? 'Verified Professional' : 'Verified Seller'}</p>
                <div className="flex items-center mt-2 space-x-1">
                  <div className="flex text-yellow-400 text-[10px]">
                    {renderStars(seller.averageRating || 0)}
                  </div>
                  <span className="ml-2 text-gray-400 font-bold uppercase tracking-tighter text-[9px]">
                    {seller.averageRating || 0} ({seller.ratingCount || 0})
                  </span>
                </div>
                {user && user.id !== seller.id && (
                  <button 
                    onClick={() => setShowRatingModal(true)}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-[9px] font-black uppercase tracking-widest underline decoration-2 underline-offset-4"
                  >
                    Rate Seller
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {isNumberRevealed ? (
                <a href={`tel:${seller.mobile}`} className="flex flex-col items-center justify-center bg-blue-600 text-white py-4 rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all animate-in zoom-in-95 duration-300"><i className="fas fa-phone-alt text-lg mb-1"></i><span className="text-[8px] font-black uppercase tracking-widest">Call</span></a>
              ) : (
                <button onClick={handleReveal} className="flex flex-col items-center justify-center bg-blue-600 text-white py-4 rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all group"><i className="fas fa-phone text-lg mb-1 group-hover:rotate-12 transition-transform"></i><span className="text-[8px] font-black uppercase tracking-widest">Call</span></button>
              )}
              <a href={`https://wa.me/${seller.whatsapp?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center bg-emerald-500 text-white py-4 rounded-2xl shadow-xl shadow-emerald-100 hover:bg-emerald-600 transition-all"><i className="fab fa-whatsapp text-xl mb-1"></i><span className="text-[8px] font-black uppercase tracking-widest">WhatsApp</span></a>
              <button onClick={handleContact} disabled={isConnecting} className="flex flex-col items-center justify-center bg-gray-900 text-white py-4 rounded-2xl shadow-xl shadow-gray-100 hover:bg-black transition-all disabled:opacity-50">{isConnecting ? <i className="fas fa-circle-notch fa-spin text-lg"></i> : <><i className="fas fa-comment-dots text-lg mb-1"></i><span className="text-[8px] font-black uppercase tracking-widest">Chat</span></>}</button>
            </div>
            <div className="mt-8 bg-orange-50 p-4 rounded-2xl border border-orange-100">
               <div className="flex space-x-3"><i className="fas fa-shield-halved text-orange-500 mt-1"></i><div><p className="text-[10px] font-black text-orange-900 uppercase tracking-widest">Safety First</p><p className="text-[10px] text-orange-700 mt-1 leading-relaxed">Meet in person and check the item before making any payment. Avoid wire transfers.</p></div></div>
            </div>
          </div>
        </div>
      </div>

      {/* Seller Ratings Section */}
      {sellerRatings.length > 0 && (
        <div className="mb-12 bg-white p-10 rounded-[3rem] border border-gray-100">
          <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-8">Seller Feedback</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sellerRatings.slice(0, 4).map(rating => (
              <div key={rating.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs font-black text-gray-900 uppercase">{rating.fromUserName}</p>
                    <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">{new Date(rating.timestamp).toLocaleDateString()}</p>
                  </div>
                  <div className="flex text-yellow-400 text-[10px]">
                    {renderStars(rating.score)}
                  </div>
                </div>
                <p className="text-sm text-gray-600 italic">"{rating.comment}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rating Submission Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="bg-blue-600 p-8 text-white text-center">
                <h3 className="text-2xl font-black">Rate Seller</h3>
                <p className="text-blue-100 text-xs mt-1">Help others by sharing your experience</p>
              </div>
              <form onSubmit={handleRatingSubmit} className="p-10 space-y-6">
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center block">Star Rating</label>
                    <div className="flex justify-center gap-2 text-2xl">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button 
                          key={star} 
                          type="button" 
                          onClick={() => setRatingScore(star)}
                          className={`transition-transform hover:scale-110 active:scale-95 ${star <= ratingScore ? 'text-yellow-400' : 'text-gray-200'}`}
                        >
                          <i className="fas fa-star"></i>
                        </button>
                      ))}
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Share Your Thoughts</label>
                    <textarea 
                      required 
                      rows={4} 
                      className="w-full bg-gray-50 border border-gray-100 p-6 rounded-2xl text-sm font-bold outline-none focus:bg-white transition-all" 
                      value={ratingComment} 
                      onChange={e => setRatingComment(e.target.value)} 
                      placeholder="Excellent seller, highly recommended..." 
                    />
                 </div>
                 <button type="submit" disabled={isSubmittingRating} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95">
                    {isSubmittingRating ? <i className="fas fa-circle-notch fa-spin"></i> : 'Submit Feedback'}
                 </button>
                 <button type="button" onClick={() => setShowRatingModal(false)} className="w-full py-4 text-gray-400 font-black uppercase text-[10px] tracking-widest">Cancel</button>
              </form>
           </div>
        </div>
      )}

      {/* Existing Banner and Related Listings code below remains exactly the same */}
      {banners.length > 0 && (
        <div className="mb-6 relative group">
           <div className="relative w-full rounded-2xl md:rounded-[2rem] overflow-hidden shadow-sm border border-gray-100 bg-white p-2">
              <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: '4 / 1' }}>
                {banners.map((banner, index) => (
                  <a key={banner.id} href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentBannerIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    <img src={banner.imageUrl} className="w-full h-full object-cover" alt="" />
                    <div className="absolute top-2 right-2 bg-white/10 backdrop-blur-md text-white/60 text-[7px] font-black uppercase px-2 py-0.5 rounded border border-white/5 tracking-widest">Sponsored</div>
                  </a>
                ))}
                {banners.length > 1 && (
                  <>
                    <button onClick={prevBanner} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><i className="fas fa-chevron-left text-xs"></i></button>
                    <button onClick={nextBanner} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><i className="fas fa-chevron-right text-xs"></i></button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex space-x-1.5">{banners.map((_, i) => (<button key={i} onClick={() => setCurrentBannerIndex(i)} className={`w-1 h-1 rounded-full transition-all ${i === currentBannerIndex ? 'bg-white w-3' : 'bg-white/40'}`} />))}</div>
                  </>
                )}
              </div>
           </div>
        </div>
      )}

      {relatedListings.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex justify-between items-end mb-4"><div><h2 className="text-3xl font-black text-gray-900 tracking-tight">Relevant in {getFormattedCity(listing.cityId)}</h2></div></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-4 md:px-0">
            {relatedListings.map(l => (
              <div key={l.id} onClick={() => onListingClick(l)} className="bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl border border-gray-100 transition-all duration-500 cursor-pointer group">
                <div className="relative aspect-[4/3] overflow-hidden"><img src={l.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />{l.isPremium && (<div className="absolute top-4 left-4 bg-yellow-400 text-yellow-900 text-[8px] font-black uppercase px-2 py-1 rounded shadow-lg">Premium</div>)}</div>
                <div className="p-5"><h3 className="font-black text-gray-900 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors leading-tight mb-2">{l.title}</h3><div className="flex items-center justify-between"><p className="text-lg font-black text-gray-900">₹{l.price.toLocaleString()}</p><span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{l.category}</span></div></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="bg-rose-600 p-8 text-white text-center">
                <h3 className="text-2xl font-black">Report Ad</h3>
                <p className="text-rose-100 text-xs mt-1">Help us keep adoiz safe</p>
              </div>
              <form onSubmit={handleReportSubmit} className="p-10 space-y-6">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reason for Reporting</label>
                    <select required className="w-full bg-gray-50 border border-gray-100 p-4 rounded-xl font-bold text-sm outline-none focus:bg-white transition-all" value={reportForm.reason} onChange={e => setReportForm({...reportForm, reason: e.target.value as AdReport['reason']})}>
                       <option value="FRAUD">Fraudulent Content</option>
                       <option value="SPAM">Spam / Duplicate</option>
                       <option value="MISLEADING">Misleading Price / Details</option>
                       <option value="INAPPROPRIATE">Inappropriate Content</option>
                       <option value="OTHER">Other</option>
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Additional Details</label>
                    <textarea rows={4} className="w-full bg-gray-50 border border-gray-100 p-6 rounded-2xl text-sm font-bold outline-none focus:bg-white transition-all" value={reportForm.details} onChange={e => setReportForm({...reportForm, details: e.target.value})} placeholder="Describe why you are reporting this ad..." />
                 </div>
                 <button type="submit" disabled={isReporting} className="w-full bg-rose-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all flex items-center justify-center gap-2 active:scale-95">
                    {isReporting ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-shield-halved mr-1"></i>} Submit Report
                 </button>
                 <button type="button" onClick={() => setShowReportModal(false)} className="w-full py-4 text-gray-400 font-black uppercase text-[10px] tracking-widest">Cancel</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};
