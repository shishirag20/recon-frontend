import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { AlertTriangle, ArrowRight, Landmark } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl p-10 max-w-md w-full shadow-lg flex flex-col items-center gap-6">
        {/* Icon Badge */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-xs">
            <AlertTriangle className="w-10 h-10 text-indigo-600" />
          </div>
          <span className="absolute -top-2 -right-2 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-2 py-0.5 rounded-md shadow-xs">
            404
          </span>
        </div>

        {/* Text Details */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Page Not Found
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            The ledger or view you are looking for doesn't exist, has been moved, or is under reconciliation.
          </p>
        </div>

        {/* Diagnostic Code */}
        <div className="w-full bg-slate-100 rounded-lg p-3 text-left border border-slate-200">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Diagnostic Code
          </div>
          <div className="mono text-xs text-slate-700">
            ERR_ROUTE_NOT_FOUND :: 0x404_NULL_REFERENCE
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full pt-2">
          <Button
            variant="ghost"
            icon={ArrowRight}
            className="flex-1 justify-center rotate-180"
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
          <Button
            variant="primary"
            icon={Landmark}
            className="flex-1 justify-center"
            onClick={() => navigate('/data-hub')}
          >
            Data Hub
          </Button>
        </div>
      </div>
    </div>
  );
};
