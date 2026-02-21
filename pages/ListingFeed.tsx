
import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../services/dbService';
import { Listing, City, Category } from '../types';
import { CITIES } from '../constants';

interface ListingFeedProps {
  city: City;
  onListingClick: (listing: Listing) => void;
  onSelectCity: () => void;
  searchQuery: string;
  category: string;
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: string) => void;
}

type SortOption = 'newest' | 'oldest' | 'price_low' | 'price_high';

export const ListingFeed: React.FC<ListingFeedProps> = ({ 
  city, 
  onListingClick, 
  onSelectCity, 
  searchQuery, 
  category,
  onSearchChange,
  onCategoryChange
}) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  useEffect(() => {
    setLoading(true);
    dbService.getListingsByCity(city.id, searchQuery, category).then(data => {
      setListings(data);
      setLoading(false);
    });
    dbService.getCategories().then(setCategories);
  }, [city.id, searchQuery, category]);

  const sortedListings = useMemo(() => {
    return [...listings].sort((a, b) => {
      if (a.isPremium !== b.isPremium) return a.isPremium ? -1 : 1;
      switch (sortBy) {
        case 'newest': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'price_low': return a.price - b.price;
        case 'price_high': return b.price - a.price;
        default: return 0;
      }
    });
  }, [listings, sortBy]);

  const handleClearSearch = () => onSearchChange('');

  const getFormattedCity = (cityId: string) => {
    const city = CITIES.find(c => c.id === cityId);
    return city ? `${city.name} - ${cityId}` : cityId;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-24">
      <div className="flex flex-col gap-6 mb-8 bg-white p-5 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm animate-in slide-in-from-top-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><i className="fas fa-list-ul"></i></div>
             <div>
                <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight leading-none">{category === 'All' ? 'Latest Listings' : category}</h1>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-2">Browsing {city.name}</p>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
            <label className="hidden md:block text-[9px] font-black uppercase text-gray-400 tracking-widest">Sort By</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-100 transition-all">
               <option value="newest">Newest First</option>
               <option value="oldest">Oldest First</option>
               <option value="price_low">Price: Low to High</option>
               <option value="price_high">Price: High to Low</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 overflow-x-auto hide-scrollbar pb-1">
          <button onClick={() => onCategoryChange('All')} className={`flex-shrink-0 px-6 py-3 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all border ${category === 'All' ? 'bg-[#1a73e8] text-white border-[#1a73e8] shadow-lg shadow-blue-100' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'}`}>
            All Items
          </button>
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => onCategoryChange(cat.name)} className={`flex-shrink-0 px-6 py-3 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all border flex items-center gap-2 ${category === cat.name ? 'bg-[#1a73e8] text-white border-[#1a73e8] shadow-lg shadow-blue-100' : 'bg-white text-gray-500 border-gray-100'}`}>
              <i className={`fas ${cat.icon}`}></i> {cat.name}
            </button>
          ))}
        </div>

        {searchQuery && (
          <div className="flex items-center space-x-2 pt-2 border-t border-gray-50">
            <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Searching:</span>
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 flex items-center">
              "{searchQuery}"
              <button onClick={handleClearSearch} className="ml-2 text-rose-400 hover:text-rose-600"><i className="fas fa-times-circle"></i></button>
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="aspect-square bg-gray-100 rounded-[2rem] animate-pulse"></div>)}
        </div>
      ) : sortedListings.length === 0 ? (
        <div className="bg-white rounded-[3rem] p-24 text-center border border-dashed border-gray-200">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-search text-gray-200 text-4xl"></i>
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">No listings found in {city.name}</h3>
          <p className="text-gray-500 max-w-xs mx-auto text-sm font-medium">Try adjusting your filters or search keywords to find what you're looking for.</p>
          <button onClick={() => { handleClearSearch(); onCategoryChange('All'); }} className="mt-8 bg-blue-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-100">Reset All Filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
          {sortedListings.map(l => (
            <div 
              key={l.id} 
              onClick={() => onListingClick(l)}
              className={`group bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl border transition-all duration-500 cursor-pointer flex flex-col ${l.isPremium ? 'border-yellow-200 ring-1 ring-yellow-100/50' : 'border-gray-100'}`}
            >
              <div className="relative overflow-hidden aspect-square">
                <img src={l.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={l.title} />
                {l.isPremium && (
                  <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[9px] font-black uppercase px-3 py-1 rounded-full shadow-xl flex items-center border border-white/20">
                    <i className="fas fa-crown mr-1.5"></i> Premium
                  </div>
                )}
              </div>
              <div className="p-5 md:p-8 flex-1 flex flex-col justify-between overflow-hidden">
                <div className="space-y-2">
                  <h3 className="font-black text-gray-900 text-sm md:text-lg line-clamp-2 group-hover:text-[#1a73e8] transition-colors leading-tight">
                    {l.title}
                  </h3>
                  <p className="text-xl md:text-2xl font-black text-gray-900">₹{l.price.toLocaleString('en-IN')}</p>
                  <div className="flex gap-2">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest bg-gray-50 px-2.5 py-1 rounded-md inline-block">
                      {l.category}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                  <span><i className="far fa-clock mr-1.5"></i> {new Date(l.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-900 uppercase">
                    <i className="fas fa-location-dot text-rose-500 text-[8px]"></i>
                    {getFormattedCity(l.cityId)}
                  </div>
                  <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full"><i className="fas fa-eye mr-1 text-[8px]"></i> {l.views}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
