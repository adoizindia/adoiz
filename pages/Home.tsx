
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

  // Record impression for the current active banner
  useEffect(() => {
    if (banners.length > 0 && banners[currentBannerIndex]) {
      dbService.recordBannerView(banners[currentBannerIndex].id);
    }
  }, [currentBannerIndex, banners]);

  // Random Banner Logic
  useEffect(() => {
    if (banners.length > 0) {
      // Pick a random banner on mount or when banners change
      const randomIndex = Math.floor(Math.random() * banners.length);
      setCurrentBannerIndex(randomIndex);
    }
  }, [banners]);

  const handleBannerClick = (id: string) => {
    dbService.recordBannerClick(id);
  };

  const currentBanner = banners[currentBannerIndex];

  return (
    <div className="flex flex-col items-center px-4 pt-6 md:pt-12 pb-20 overflow-x-hidden">
      {/* Category Quick Filters */}
      <div className="w-full max-w-7xl px-4 flex flex-wrap justify-center gap-2 mb-0">
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

      {/* Single Random Banner */}
      {currentBanner && (
        <div className="w-full max-w-7xl px-4 relative group mb-0 mt-8">
           <div 
            className="relative w-full rounded-2xl md:rounded-[2rem] overflow-hidden shadow-2xl border border-gray-100 bg-gray-100"
            style={{ aspectRatio: '4 / 1' }}
           >
              <a 
                href={currentBanner.linkUrl} 
                onClick={() => handleBannerClick(currentBanner.id)}
                target="_blank" 
                rel="noopener noreferrer"
                className="absolute inset-0"
              >
                <img src={currentBanner.imageUrl} className="w-full h-full object-cover" alt="Sponsor" />
                <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md text-white/60 text-[8px] font-black uppercase px-2 py-1 rounded border border-white/5 tracking-widest">
                  Sponsored
                </div>
              </a>
           </div>
        </div>
      )}

      <div className="w-full max-w-7xl px-4 mt-12">
        <div className="flex justify-between items-end mb-10">
          <div><h2 className="text-4xl font-black text-gray-900 tracking-tight">Recent in {city.name}</h2></div>
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
