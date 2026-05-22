import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Zap } from 'lucide-react';

const BlockingOverlay: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden">
            {/* Blurry Backdrop */}
            <div className="absolute inset-0 bg-white/60 backdrop-blur-md" />
            
            {/* Content Card */}
            <div className="relative bg-white rounded-3xl shadow-2xl border border-gray-100 p-10 max-w-lg w-full mx-4 text-center transform transition-all animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
                    <Lock className="w-10 h-10 text-white" />
                </div>
                
                <h2 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">
                    Subscription Expired
                </h2>
                
                <p className="text-gray-600 mb-10 text-lg leading-relaxed">
                    Your laboratory's subscription has expired. Please renew your plan to continue accessing clinical data and management tools.
                </p>
                
                <button
                    onClick={() => navigate('/subscription')}
                    className="group relative w-full inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold text-lg rounded-2xl hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                    <Zap className="w-6 h-6 group-hover:animate-pulse" />
                    Renew Subscription Now
                </button>
                
                <p className="mt-6 text-sm text-gray-400 font-medium italic">
                    All your clinical data is safe and will be accessible immediately after renewal.
                </p>
            </div>
        </div>
    );
};

export default BlockingOverlay;
