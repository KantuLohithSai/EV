import React from 'react';
import type { UserProfile } from '../types';
import { UserProfileManager } from './UserProfileManager';
import { X, UserCheck, Sparkles } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: Record<string, UserProfile>;
  selectedProfileId: string;
  onSelectProfile: (profileId: string) => void;
  customWeights: Record<string, number>;
  onWeightChange: (weights: Record<string, number>) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  profiles,
  selectedProfileId,
  onSelectProfile,
  customWeights,
  onWeightChange
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl p-6 border border-slate-800 shadow-sm space-y-4 relative custom-scrollbar"
      >
        
        {/* Header & Close Button */}
        <div className="flex items-center justify-between border-b border-violet-500/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-600 text-emerald-950">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="profile-modal-title" className="text-xl font-bold text-slate-100 tracking-tight">
                  EV User Profile & Preferences
                </h2>
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-violet-500/20 text-violet-300 border border-violet-500/40 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 fill-current" /> DYNAMIC AI WEIGHTING
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Customize multi-objective priorities to match your EV vehicle specs & driving style
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="modal-close-button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Manager Body */}
        <UserProfileManager
          profiles={profiles}
          selectedProfileId={selectedProfileId}
          onSelectProfile={(id) => {
            onSelectProfile(id);
          }}
          customWeights={customWeights}
          onWeightChange={onWeightChange}
        />

        {/* Modal Footer */}
        <div className="profile-modal-footer flex flex-wrap justify-end gap-2 pt-3 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => {
              onSelectProfile('balanced');
              onWeightChange({});
            }}
            disabled={!profiles.balanced}
            className="reset-profile-button"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="primary-action px-6 py-2.5 rounded-lg font-semibold text-xs transition-all cursor-pointer"
            disabled={!profiles[selectedProfileId]}
          >
            Save & Apply Profile
          </button>
        </div>

      </div>
    </div>
  );
};
