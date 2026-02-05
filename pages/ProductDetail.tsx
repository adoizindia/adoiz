import React, { useState, useEffect } from 'react';
import { Listing, User, BannerAd } from '../types';
import { dbService } from '../services/dbService';
import { CITIES } from '../constants';

interface ProductDetailProps {
  listing: Listing;
  seller: User;
  onBack: () => void;
  onContactSeller: (listing: Listing, seller: User) => void;
  onListingClick: (listing: Listing) => void;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({ 
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

  useEffect(() => {
    // Fetch other listings in the same city
    dbService.getListingsByCity(listing.cityId).then(all => {
      // Filter out current listing and limit to 4 items
      const filtered = all.filter(l => l.id !== listing.id).slice(0, 4);
      setRelatedListings(filtered);
    });

    // Fetch active banners for the city
    dbService.getActiveBanners(listing.cityId).then(setBanners);

    // Scroll to top when listing changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveImageIndex(0);
    setCurrentBannerIndex(0);
  }, [listing.id, listing.cityId]);

  // Banner Auto-slider Logic
  useEffect(() => {
    if (banners.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 5000); // Switch every 5 seconds

    return () => clearInterval(timer);
  }, [banners.length]);

  const nextBanner = () => setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
  const prevBanner = () => setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length);

  const handleReveal = () => {
    setIsNumberRevealed(true);
  };

  const handleContact = async () => {
    setIsConnecting(true);
    await onContactSeller(listing, seller);
    setIsConnecting(false);
  };

  const getFormattedCity = (cityId: string) => {
    const city = CITIES.find(c => c.id === cityId);
    return city ? `${city.name} - ${cityId}` : cityId;
  };

  const nextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % listing.images.length);
  };

  const prevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + listing.images.length) % listing.images.length);
  };

  return (
    <div className="max-w-7xl mx-auto p-0">
      {/* Product Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Image Gallery Section */}
          <div className="space-y-4">
            <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl shadow-blue-50 border border-gray-100 relative group aspect-[16/10]">
              <img 
                src={listing.images[activeImageIndex]} 
                className="w-full h-full object-cover transition-all duration-500" 
                alt={`${listing.title} - View ${activeImageIndex + 1}`} 
              />
              
              {/* Premium Badge */}
              {listing.isPremium && (
                <div className="absolute top-6 left-6 bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase px-3 py-1.5 rounded-xl shadow-2xl border border-yellow-500/20 z-10">
                  <i className="fas fa-crown mr-1.5"></i> Premium Ad
                </div>
              )}

              {/* Navigation Arrows */}
              {listing.images.length > 1 && (
                <>
                  <button 
                    onClick={(e) => { e.stopPropagation(); prevImage(); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); nextImage(); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                  
                  {/* Image Counter */}
                  <div className="absolute bottom-6 right-6 bg-black/50 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-xl border border-white/10">
                    {activeImageIndex + 1} / {listing.images.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail Row */}
            {listing.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                {listing.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-24 h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                      activeImageIndex === idx ? 'border-blue-600 ring-2 ring-blue-100' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} className="w-full h-full object-cover" alt={`Thumbnail ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
              <div>
                <span className="bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg mb-3 inline-block">
                  {listing.category}
                </span>
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight">{listing.title}</h1>
              </div>
              <div className="text-left md:text-right">
                <p className="text-4xl font-black text-blue-600">₹{listing.price.toLocaleString()}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Negotiable</p>
              </div>
            </div>
            
            <div className="h-px bg-gray-50 my-8"></div>
            
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <i className="fas fa-align-left text-blue-600 text-xs"></i>
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Description</h3>
              </div>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap font-medium">{listing.description}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
               <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                 <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Posted On</p>
                 <p className="text-xs font-bold text-gray-900">{new Date(listing.createdAt).toLocaleDateString()}</p>
               </div>
               <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                 <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Views</p>
                 <p className="text-xs font-bold text-gray-900">{listing.views} Impressions</p>
               </div>
               <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                 <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Ad ID</p>
                 <p className="text-xs font-bold text-gray-900">#{listing.id.slice(-6).toUpperCase()}</p>
               </div>
               <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                 <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Location</p>
                 <p className="text-xs font-bold text-gray-900">{getFormattedCity(listing.cityId)}</p>
               </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 sticky top-8">
            <div className="flex items-center space-x-4 mb-8">
              <div className="relative">
                <img src={seller.photo} className="w-20 h-20 rounded-2xl object-cover ring-4 ring-blue-50" alt={seller.name} />
                {seller.isVerified && (
                  <div className="absolute -bottom-1 -right-1 bg-white text-blue-600 w-6 h-6 rounded-full flex items-center justify-center shadow-lg border border-blue-50">
                    <i className="fas fa-check-circle text-xs"></i>
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-black text-xl text-gray-900 leading-none">{seller.name}</h4>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-2">
                  {seller.isVerified ? 'Verified Professional' : 'Verified Seller'}
                </p>
                <div className="flex items-center text-yellow-400 text-[10px] mt-2 space-x-1">
                  <i className="fas fa-star"></i>
                  <i className="fas fa-star"></i>
                  <i className="fas fa-star"></i>
                  <i className="fas fa-star"></i>
                  <i className="fas fa-star text-gray-200"></i>
                  <span className="ml-2 text-gray-400 font-bold uppercase tracking-tighter">4.0 (12)</span>
                </div>
              </div>
            </div>

            {/* Horizontal Contact Options */}
            <div className="grid grid-cols-3 gap-2">
              {isNumberRevealed ? (
                <a 
                  href={`tel:${seller.mobile}`}
                  className="flex flex-col items-center justify-center bg-blue-600 text-white py-4 rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all animate-in zoom-in-95 duration-300"
                  title="Call Now"
                >
                  <i className="fas fa-phone-alt text-lg mb-1"></i>
                  <span className="text-[8px] font-black uppercase tracking-widest">Call</span>
                </a>
              ) : (
                <button 
                  onClick={handleReveal}
                  className="flex flex-col items-center justify-center bg-blue-600 text-white py-4 rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all group"
                  title="Show Contact"
                >
                  <i className="fas fa-phone text-lg mb-1 group-hover:rotate-12 transition-transform"></i>
                  <span className="text-[8px] font-black uppercase tracking-widest">Call</span>
                </button>
              )}
              
              <a 
                href={`https://wa.me/${seller.whatsapp?.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center bg-emerald-500 text-white py-4 rounded-2xl shadow-xl shadow-emerald-100 hover:bg-emerald-600 transition-all"
                title="WhatsApp"
              >
                <i className="fab fa-whatsapp text-xl mb-1"></i>
                <span className="text-[8px] font-black uppercase tracking-widest">WhatsApp</span>
              </a>
              
              <button 
                onClick={handleContact}
                disabled={isConnecting}
                className="flex flex-col items-center justify-center bg-gray-900 text-white py-4 rounded-2xl shadow-xl shadow-gray-100 hover:bg-black transition-all disabled:opacity-50"
                title="Secure Chat"
              >
                {isConnecting ? (
                  <i className="fas fa-circle-notch fa-spin text-lg"></i>
                ) : (
                  <>
                    <i className="fas fa-comment-dots text-lg mb-1"></i>
                    <span className="text-[8px] font-black uppercase tracking-widest">Chat</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-8 bg-orange-50 p-4 rounded-2xl border border-orange-100">
               <div className="flex space-x-3">
                 <i className="fas fa-shield-halved text-orange-500 mt-1"></i>
                 <div>
                   <p className="text-[10px] font-black text-orange-900 uppercase tracking-widest">Safety First</p>
                   <p className="text-[10px] text-orange-700 mt-1 leading-relaxed">Meet in person and check the item before making any payment. Avoid wire transfers.</p>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sliding Banner Carousel - Identical to Home page */}
      {banners.length > 0 && (
        <div className="mb-6 relative group">
           <div 
            className="relative w-full rounded-2xl md:rounded-[2rem] overflow-hidden shadow-sm border border-gray-100 bg-white p-2"
           >
              <div 
                className="relative w-full overflow-hidden rounded-xl"
                style={{ aspectRatio: '4 / 1' }}
              >
                {banners.map((banner, index) => (
                  <a 
                    key={banner.id}
                    href={banner.linkUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentBannerIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                  >
                    <img src={banner.imageUrl} className="w-full h-full object-cover" alt="Sponsor" />
                    <div className="absolute top-2 right-2 bg-white/10 backdrop-blur-md text-white/60 text-[7px] font-black uppercase px-2 py-0.5 rounded border border-white/5 tracking-widest">
                      Sponsored
                    </div>
                  </a>
                ))}

                {/* Slider Controls */}
                {banners.length > 1 && (
                  <>
                    <button onClick={prevBanner} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <i className="fas fa-chevron-left text-xs"></i>
                    </button>
                    <button onClick={nextBanner} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <i className="fas fa-chevron-right text-xs"></i>
                    </button>
                    
                    {/* Indicators */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex space-x-1.5">
                      {banners.map((_, i) => (
                        <button 
                          key={i} 
                          onClick={() => setCurrentBannerIndex(i)}
                          className={`w-1 h-1 rounded-full transition-all ${i === currentBannerIndex ? 'bg-white w-3' : 'bg-white/40'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
           </div>
        </div>
      )}

      {/* Related Listings Section */}
      {relatedListings.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Relevant in {getFormattedCity(listing.cityId)}</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-4 md:px-0">
            {relatedListings.map(l => (
              <div 
                key={l.id} 
                onClick={() => onListingClick(l)}
                className="bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl border border-gray-100 transition-all duration-500 cursor-pointer group"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img src={l.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={l.title} />
                  {l.isPremium && (
                    <div className="absolute top-4 left-4 bg-yellow-400 text-yellow-900 text-[8px] font-black uppercase px-2 py-1 rounded shadow-lg">
                      Premium
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-black text-gray-900 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors leading-tight mb-2">{l.title}</h3>
                  <div className="flex items-center justify-between">
                      <p className="text-lg font-black text-gray-900">₹{l.price.toLocaleString()}</p>
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{l.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};