import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none fade-in bg-slate-50">
      <div className="flex flex-col items-center gap-4 max-w-sm">
        {/* Minimal 404 Badge */}
        <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full tracking-wider uppercase">
          404 Error
        </span>

        {/* Headline & Description */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Page not found
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            The page you are looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            onClick={() => navigate(-1)}
          >
            Go back
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Home}
            onClick={() => navigate('/data-hub')}
          >
            Return to Data Hub
          </Button>
        </div>
      </div>
    </div>
  );
};
