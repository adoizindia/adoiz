
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { City, State, Country } from '../types';

interface CityPickerProps {
  onSelect: (city: City) => void;
}

export const CityPicker: React.FC<CityPickerProps> = ({ onSelect }) => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  
  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [selectedStateId, setSelectedStateId] = useState('');
  
  useEffect(() => {
    setCountries(dbService.getCountries());
  }, []);

  useEffect(() => {
    if (selectedCountryId) {
      setStates(dbService.getStates(selectedCountryId));
      setSelectedStateId('');
      setCities([]);
    }
  }, [selectedCountryId]);

  useEffect(() => {
    if (selectedStateId) {
      setCities(dbService.getCities(selectedStateId));
    }
  }, [selectedStateId]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-blue-600 mb-2">Welcome to ADOIZ</h2>
          <p className="text-gray-500">Please select your location to continue</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Select Country</label>
            <select 
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={selectedCountryId}
              onChange={(e) => setSelectedCountryId(e.target.value)}
            >
              <option value="">Choose Country</option>
              {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {selectedCountryId && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Select State</label>
              <select 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={selectedStateId}
                onChange={(e) => setSelectedStateId(e.target.value)}
              >
                <option value="">Choose State</option>
                {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {selectedStateId && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Select City</label>
              <div className="grid grid-cols-2 gap-3">
                {cities.map(city => (
                  <button
                    key={city.id}
                    onClick={() => onSelect(city)}
                    className="flex items-center justify-center p-4 border border-gray-100 bg-gray-50 rounded-xl hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 font-semibold transition-all"
                  >
                    {city.name}
                  </button>
                ))}
              </div>
              {cities.length === 0 && <p className="text-center py-4 text-gray-400 text-xs italic">No cities found for this state.</p>}
            </div>
          )}
        </div>

        <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col items-center">
          <p className="text-xs text-gray-400 text-center">
            City-locked marketplace. You will only see listings from your selected city.
          </p>
        </div>
      </div>
    </div>
  );
};
