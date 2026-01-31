import React, { useState, useEffect } from 'react';
import { Listing, User } from '../types';
import { dbService } from '../services/dbService';

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

  useEffect(() => {
    // Fetch other listings in the same city
    dbService.getListingsByCity(listing.cityId).then(all => {
      // Filter out current listing and limit to 4 items
      const filtered = all.filter(l => l.id !== listing.id).slice(0, 4);
      setRelatedListings(filtered);
    });
    // Scroll to top when listing changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [listing.id]);

  const handleReveal = () => {
    setIsNumberRevealed(true);
  };

  const handleContact = async () => {
    setIsConnecting(true);
    await onContactSeller(listing, seller);
    setIsConnecting(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-32">
      <button onClick={onBack} className="flex items-center text-gray-500 font-bold text-xs uppercase tracking-widest mb-6 hover:text-blue-600 transition-colors group">
        <i className="fas fa-arrow-left mr-2 group-hover:-translate-x-1 transition-transform"></i> Back to Search
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl shadow-blue-50 border border-gray-100 relative group">
            <img src={listing.images[0]} className="w-full aspect-[16/10] object-cover" alt={listing.title} />
            {listing.isPremium && (
              <div className="absolute top-6 left-6 bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase px-3 py-1.5 rounded-xl shadow-2xl border border-yellow-500/20">
                <i className="fas fa-crown mr-1.5"></i> Premium Ad
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
                 <p className="text-xs font-bold text-gray-900">{listing.cityId}</p>
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

      {/* Related Listings Section */}
      {relatedListings.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex justify-between items-end mb-8">
            <div>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2">More in this area</p>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Relevant in {listing.cityId}</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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