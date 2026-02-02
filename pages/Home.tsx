import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../services/dbService';
import { Listing, City, Category, BannerAd } from '../types';

interface HomeProps {
  city: City;
  onSearch: (query: string) => void;
  onCategorySelect: (category: string) => void;
  onListingClick: (listing: Listing) => void;
  onSelectCity: () => void;
}

export const Home: React.FC<HomeProps> = ({ city, onSearch, onCategorySelect, onListingClick, onSelectCity }) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<BannerAd[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const config = dbService.getSystemConfig();

  useEffect(() => {
    dbService.getListingsByCity(city.id).then(setListings);
    dbService.getCategories().then(setCategories);
    dbService.getActiveBanners(city.id).then(setBanners);
  }, [city.id]);

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

  return (
    <div className="flex flex-col items-center px-4 pt-6 md:pt-12 pb-20 overflow-x-hidden">
      {/* Category Quick Filters - Relocated to the top since hero is removed */}
      <div className="w-full max-w-7xl px-4 flex flex-wrap justify-center gap-2 mb-8">
        {categories.map(cat => (
          <button 
            key={cat.id} 
            onClick={() => onCategorySelect(cat.name)} 
            className="px-5 py-2.5 bg-white border border-gray-100 hover:border-blue-200 hover:text-blue-600 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm flex items-center gap-2"
          >
            <i className={`fas ${cat.icon}`}></i>{cat.name}
          </button>
        ))}
      </div>

      {/* City-Locked Banner Carousel */}
      {banners.length > 0 && (
        <div className="w-full max-w-7xl px-4 relative group mb-12">
           <div className="relative w-full aspect-[2.5/1] md:aspect-[6/1] rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-100 bg-gray-100">
              {banners.map((banner, index) => (
                <a 
                  key={banner.id}
                  href={banner.linkUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentBannerIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                >
                  <img src={banner.imageUrl} className="w-full h-full object-cover" alt="Sponsor" />
                  <div className="absolute top-4 right-4 bg-black/30 backdrop-blur-md text-white text-[8px] font-black uppercase px-2 py-1 rounded border border-white/20">
                    Sponsored in {city.name}
                  </div>
                </a>
              ))}

              {/* Slider Controls */}
              {banners.length > 1 && (
                <>
                  <button onClick={prevBanner} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  <button onClick={nextBanner} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <i className="fas fa-chevron-right"></i>
                  </button>
                  
                  {/* Indicators */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
                    {banners.map((_, i) => (
                      <button 
                        key={i} 
                        onClick={() => setCurrentBannerIndex(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentBannerIndex ? 'bg-white w-4' : 'bg-white/40'}`}
                      />
                    ))}
                  </div>
                </>
              )}
           </div>
        </div>
      )}

      <div className="w-full max-w-7xl px-4">
        <div className="flex justify-between items-end mb-10">
          <div><p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Verified Ads</p><h2 className="text-4xl font-black text-gray-900 tracking-tight">Recent in {city.name}</h2></div>
          <button onClick={() => onSearch('')} className="flex items-center space-x-3 text-gray-400 hover:text-blue-600 group"><span className="text-[10px] font-black uppercase tracking-widest group-hover:mr-2 transition-all">Explore All</span><i className="fas fa-arrow-right text-xs"></i></button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {listings.slice(0, 8).map(l => (
            <div key={l.id} onClick={() => onListingClick(l)} className="bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl border border-gray-100 transition-all cursor-pointer group">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={l.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                {l.isPremium && <div className="absolute top-4 left-4 bg-yellow-400 text-yellow-900 text-[8px] font-black uppercase px-2 py-1 rounded shadow-lg border border-yellow-500/20"><i className="fas fa-crown"></i> Premium</div>}
              </div>
              <div className="p-6">
                <h3 className="font-black text-gray-900 text-sm md:text-base line-clamp-1 group-hover:text-blue-600 mb-2">{l.title}</h3>
                <div className="flex items-center justify-between"><p className="text-xl md:text-2xl font-black text-gray-900">₹{l.price.toLocaleString()}</p><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded">{l.category}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};