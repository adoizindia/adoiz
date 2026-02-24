
import React, { useState, useRef, useEffect } from 'react';
import { City, User, Listing, UserRole, Category, ListingStatus } from '../types';
import { dbService } from '../services/dbService';

interface PostAdProps {
  user: User;
  city: City;
  editListing?: Listing;
  onSuccess: () => void;
  onCancel: () => void;
  onUpdateUser?: (user: User) => void;
}

export const PostAd: React.FC<PostAdProps> = ({ user, city, editListing, onSuccess, onCancel, onUpdateUser }) => {
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userAdCount, setUserAdCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const config = dbService.getSystemConfig();

  const [formData, setFormData] = useState({
    title: '',
    price: '',
    category: '',
    productType: 'N/A' as 'New' | 'Used' | 'N/A',
    description: '',
    isPremium: false,
    images: [] as string[]
  });

  useEffect(() => {
    dbService.getCategories().then(cats => {
      setCategories(cats);
      if (cats.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: cats[0].name }));
      }
    });

    dbService.getListingsBySeller(user.id).then(all => setUserAdCount(all.length));

    if (editListing) {
      setFormData({
        title: editListing.title,
        price: editListing.price.toString(),
        category: editListing.category,
        productType: editListing.productType || 'N/A',
        description: editListing.description,
        isPremium: editListing.isPremium,
        images: editListing.images
      });
    }
  }, [editListing, user.id]);

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Could not access camera. Please check permissions.");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setFormData(prev => ({ ...prev, images: [...prev.images, canvas.toDataURL('image/jpeg')] }));
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => setFormData(prev => ({ ...prev, images: [...prev.images, reader.result as string] }));
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (index: number) => {
    if (draggedIndex === null) return;
    const newImages = [...formData.images];
    const [movedItem] = newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, movedItem);
    setFormData({ ...formData, images: newImages });
    setDraggedIndex(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (formData.images.length === 0) {
      alert("Please upload at least one image.");
      return;
    }

    setLoading(true);
    try {
      if (editListing) {
        await dbService.updateListing(editListing.id, {
          title: formData.title, 
          description: formData.description,
          price: Number(formData.price), 
          category: formData.category,
          productType: formData.productType,
          isPremium: formData.isPremium, 
          images: formData.images,
          status: ListingStatus.EDIT_PENDING,
          createdAt: new Date().toISOString() // Key Update: Refresh date to current on edit
        });
      } else {
        await dbService.createListing({
          sellerId: user.id, cityId: city.id,
          title: formData.title, description: formData.description,
          price: Number(formData.price), category: formData.category,
          productType: formData.productType,
          isPremium: formData.isPremium, images: formData.images
        });
      }
      
      const updatedUser = await dbService.getUserById(user.id);
      if (updatedUser && onUpdateUser) onUpdateUser(updatedUser);
      onSuccess();
    } catch (err: any) {
      alert(err.message || "Failed to post ad.");
    } finally {
      setLoading(false);
    }
  };

  const isPaidStandard = !editListing && userAdCount >= config.freeAdLimit;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 pb-32">
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden">
        <div className="bg-blue-600 p-8 text-white text-center">
          <h2 className="text-3xl font-black">{editListing ? 'Edit Your Ad' : 'Post Your Ad'}</h2>
          <p className="text-blue-100 text-sm mt-2">Listing in <b>{city.name}</b></p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-8">
          <div className="space-y-4">
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Photo Gallery</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {formData.images.map((img, idx) => (
                <div key={idx} draggable onDragStart={() => handleDragStart(idx)} onDragOver={handleDragOver} onDrop={() => handleDrop(idx)} className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 border-2 cursor-move group">
                  <img src={img} className="w-full h-full object-cover" alt="" />
                  <button type="button" onClick={() => removeImage(idx)} className="absolute top-2 right-2 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"><i className="fas fa-trash-alt"></i></button>
                </div>
              ))}
              {formData.images.length < 8 && (
                <div className="flex flex-col gap-2">
                  <button type="button" onClick={startCamera} className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 bg-gray-50"><i className="fas fa-camera text-xl mb-2"></i></button>
                  <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 bg-gray-50 cursor-pointer"><input type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" /><i className="fas fa-upload text-xl mb-2"></i></label>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2"><label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Product Title</label><input required type="text" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 outline-none font-medium" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
            <div><label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Price (₹)</label><input required type="number" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 outline-none font-medium" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} /></div>
            <div><label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Category</label><select className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 outline-none font-medium" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>{categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}</select></div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Product Condition</label>
              <select 
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 outline-none font-medium" 
                value={formData.productType} 
                onChange={e => setFormData({...formData, productType: e.target.value as 'New' | 'Used' | 'N/A'})}
              >
                <option value="New">New</option>
                <option value="Used">Used</option>
                <option value="N/A">N/A</option>
              </select>
            </div>
          </div>

          <div><label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Description</label><textarea required rows={5} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 outline-none font-medium" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>

          <div className="space-y-4">
            {isPaidStandard && (
              <div className="p-6 rounded-2xl border-2 bg-blue-50 border-blue-200 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                   <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center"><i className="fas fa-tag"></i></div>
                   <div><p className="font-black text-gray-900">Standard Ad Charge</p><p className="text-xs text-gray-500">Free limit of {config.freeAdLimit} reached</p></div>
                </div>
                <p className="font-black text-gray-900">₹{config.standardAdPrice}</p>
              </div>
            )}

            <div onClick={() => setFormData({...formData, isPremium: !formData.isPremium})} className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${formData.isPremium ? 'bg-yellow-50 border-yellow-400' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.isPremium ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-200 text-gray-400'}`}><i className="fas fa-crown"></i></div>
                  <div><p className="font-black text-gray-900">Make it Premium</p><p className="text-xs text-gray-500">Stay at the top for {config.premiumDurationDays} days</p></div>
                </div>
                <p className="font-black text-gray-900">₹{config.premiumPrice}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-sm shadow-xl disabled:opacity-50">{loading ? 'Processing...' : (editListing ? 'Save Changes' : 'Post Ad Now')}</button>
            <button type="button" onClick={onCancel} className="px-8 py-5 border border-gray-200 text-gray-500 rounded-2xl font-black uppercase text-sm">Cancel</button>
          </div>
        </form>
      </div>
      
      {showCamera && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="p-4 flex justify-between items-center text-white"><button onClick={stopCamera} className="p-2"><i className="fas fa-times text-2xl"></i></button></div>
          <div className="flex-1 flex items-center justify-center bg-black overflow-hidden relative"><video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" /></div>
          <div className="p-10 flex justify-center bg-black/50 backdrop-blur-xl"><button onClick={takePhoto} className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl"><div className="w-14 h-14 rounded-full border-2 border-gray-400"></div></button></div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
};
