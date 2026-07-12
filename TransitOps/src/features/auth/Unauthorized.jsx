import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0f1d] p-6 text-white">
      <div className="card max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 mb-6 border border-red-500/20">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Access Denied</h2>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          You do not have the necessary security credentials or roles required to view this panel. Please contact your administrator or switch to an authorized profile.
        </p>
        <button className="btn btn-secondary w-full" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </button>
      </div>
    </div>
  );
}
