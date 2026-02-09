import React, { useState, useEffect, useRef } from 'react';
import { City } from '../../types';
import { dbService } from '../../services/dbService';

interface SearchBarProps {
  city: City | null;
  onSearch: (query: string) => void;
  searchQuery: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ city, onSearch, searchQuery }) => {
  const [localQuery, setLocalQuery] = useState(searchQuery || '');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local query with prop
  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced Suggestion Fetching
  useEffect(() => {
    if (!localQuery.trim() || !city) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await dbService.getSearchSuggestions(city.id, localQuery);
      setSuggestions(results);
    }, 300);

    return () => clearTimeout(timer);
  }, [localQuery, city]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    onSearch(localQuery);
  };

  const handleSuggestionClick = (val: string) => {
    setLocalQuery(val);
    setShowSuggestions(false);
    onSearch(val);
  };

  return (
    /* Fix: Reduced vertical padding from py-3 lg:py-4 to py-0 to align background height exactly with the search bar input height */
    <div className="bg-white border-b border-gray-100 py-0 z-40">
      <div className="max-w-7xl mx-auto px-4" ref={suggestionRef}>
        <div className="relative max-w-2xl mx-auto">
          <form onSubmit={handleSearchSubmit} className="relative group">
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <i className="fas fa-search text-gray-400 text-sm"></i>
            </div>
            <input
              ref={inputRef}
              type="text"
              autoComplete="off"
              className="block w-full bg-gray-50 border border-gray-100 rounded-2xl pl-5 pr-12 py-3 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white transition-all shadow-sm"
              placeholder={`Search for products or services in ${city?.name || 'your city'}...`}
              value={localQuery}
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => {
                setLocalQuery(e.target.value);
                setShowSuggestions(true);
              }}
            />
          </form>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[100]">
              <div className="py-2">
                <p className="px-5 py-2 text-[9px] font-black uppercase text-gray-400 tracking-[0.2em] border-b border-gray-50">Popular Searches</p>
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(s)}
                    className="w-full text-left px-6 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 group"
                  >
                    <i className="fas fa-magnifying-glass text-gray-300 text-[10px] group-hover:text-blue-500"></i>
                    <span className="text-sm font-bold text-gray-700 truncate">{s}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};