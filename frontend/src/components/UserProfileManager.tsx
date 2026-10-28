import React from 'react';
import type { UserProfile } from '../types';
import { Battery, Check, Clock, IndianRupee, ShieldCheck, Sliders, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface UserProfileManagerProps {
  profiles: Record<string, UserProfile>;
  selectedProfileId: string;
  onSelectProfile: (profileId: string) => void;
  customWeights: Record<string, number>;
  onWeightChange: (weights: Record<string, number>) => void;
}

type ObjectiveKey = keyof UserProfile['weights'];

const PRESET_METADATA: Record<string, { icon: string; text: string }[]> = {
  balanced: [
    { icon: '🔋', text: '40–50 kWh' },
    { icon: '⚡', text: 'Max 60 kW DC' },
    { icon: '🎯', text: 'Balanced' },
  ],
  fast_transit: [
    { icon: '🔋', text: '60–72 kWh' },
    { icon: '⚡', text: '120+ kW DC' },
    { icon: '🎯', text: 'Speed First' },
  ],
  budget_saver: [
    { icon: '₹', text: 'Lowest Tariff First' },
  ],
  battery_care: [
    { icon: '🌡️', text: '<38°C Safe C-Rate' },
  ],
};

const OBJECTIVES: { key: ObjectiveKey; label: string; helper: string; Icon: LucideIcon; iconClass: string }[] = [
  { key: 'travel_time', label: 'Minimize Travel Distance / Time', helper: 'Prioritizes stations closest to your current GPS location', Icon: Clock, iconClass: 'text-blue-400' },
  { key: 'wait_time', label: 'Minimize LSTM Queue Wait Time', helper: 'Prioritizes hubs with open slots and 0 predicted queue in the next 40 mins', Icon: Zap, iconClass: 'text-emerald-400' },
  { key: 'cost', label: 'Charging & Parking Price Sensitivity', helper: 'Prioritizes lower charging tariffs and parking costs', Icon: IndianRupee, iconClass: 'text-amber-400' },
  { key: 'reliability', label: 'Charger Reliability Score Weight', helper: 'Favors hubs with stronger uptime and reliability scores', Icon: ShieldCheck, iconClass: 'text-indigo-400' },
  { key: 'battery_preservation', label: 'Battery Longevity / Wear Protection', helper: 'Favors charging choices that reduce battery wear in warm conditions', Icon: Battery, iconClass: 'text-teal-400' },
];

export const UserProfileManager: React.FC<UserProfileManagerProps> = ({
  profiles,
  selectedProfileId,
  onSelectProfile,
  customWeights,
  onWeightChange
}) => {
  const currentProfile = profiles[selectedProfileId] || profiles.balanced;

  if (!currentProfile) return null;

  const rawWeights = OBJECTIVES.reduce((weights, { key }) => {
    weights[key] = customWeights[key] ?? currentProfile.weights[key];
    return weights;
  }, {} as UserProfile['weights']);
  const rawTotal = Object.values(rawWeights).reduce((total, weight) => total + weight, 0);
  const normalizedWeights = OBJECTIVES.reduce((weights, { key }) => {
    const ratio = rawTotal > 0 ? rawWeights[key] / rawTotal : 0;
    weights[key] = Math.round(ratio * 1000) / 1000;
    return weights;
  }, {} as UserProfile['weights']);
  const normalizedTotal = Object.values(normalizedWeights).reduce((total, weight) => total + weight, 0);
  const totalPercent = Math.round(normalizedTotal * 100);

  const handleSliderChange = (key: ObjectiveKey, value: number) => {
    onWeightChange({ ...rawWeights, [key]: value });
  };

  return (
    <div className="glass-panel profile-manager-panel rounded-xl p-4 sm:p-6 border border-slate-800 space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">Smart EV User Profiling & Preferences Engine</h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Select or customize multi-objective decision weights tailored to your EV charging habits and vehicle constraints.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.values(profiles).map((profile) => {
          const isSelected = profile.id === selectedProfileId;
          return (
            <button
              key={profile.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelectProfile(profile.id)}
              className={`profile-preset-card ${isSelected ? 'is-selected' : ''}`}
            >
              <span className="profile-selection-indicator" aria-hidden="true">
                {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
              </span>
              <span className="profile-preset-title">{profile.name}</span>
              <span className="profile-preset-description">{profile.description}</span>
              <span className="profile-preset-metadata" aria-label="Vehicle and priority details">
                {(PRESET_METADATA[profile.id] || []).map((item) => (
                  <span className="profile-preset-meta-pill" key={item.text}>
                    <span aria-hidden="true">{item.icon}</span> {item.text}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <section className="weight-tuning-panel p-4 sm:p-5 rounded-xl border border-slate-800 space-y-4" aria-labelledby="weight-section-title">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h3 id="weight-section-title" className="text-sm font-bold text-slate-200 flex items-center gap-2 min-w-0">
            <Sliders className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Fine-Tune Objective Weights</span>
          </h3>
          <span className="weight-total-badge">
            Total: <span className="weight-total-value telemetry-number">{totalPercent}%</span> (Auto-Normalized)
          </span>
        </div>

        <p className="text-xs text-slate-400 truncate" title={currentProfile.name}>{currentProfile.name}</p>

        <div className="space-y-4">
          {OBJECTIVES.map(({ key, label, helper, Icon, iconClass }) => {
            const value = rawWeights[key];
            const percentage = Math.round(normalizedWeights[key] * 100);
            const progress = ((value - 0.05) / (0.6 - 0.05)) * 100;

            return (
              <div key={key} className="objective-weight-row space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <label htmlFor={`weight-${key}`} className="flex min-w-0 items-center gap-1.5 text-slate-300 cursor-pointer">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${iconClass}`} />
                    <span>{label}</span>
                  </label>
                  <output htmlFor={`weight-${key}`} className="weight-value telemetry-number shrink-0">
                    {percentage}%
                  </output>
                </div>
                <p className="objective-weight-helper">{helper}</p>
                <input
                  id={`weight-${key}`}
                  type="range"
                  min="0.05"
                  max="0.6"
                  step="0.05"
                  value={value}
                  aria-label={label}
                  aria-valuetext={`${percentage}% of total objective weight`}
                  onChange={(event) => handleSliderChange(key, Number(event.target.value))}
                  className="objective-slider w-full"
                  style={{ '--range-progress': `${Math.max(0, Math.min(100, progress))}%` } as React.CSSProperties}
                />
              </div>
            );
          })}
        </div>
      </section>

      <div className="ai-score-formula" aria-live="polite" aria-label="Live AI match score weighting formula">
        <span className="ai-score-formula-label">AI Match Score =</span>
        <span><strong>{Math.round(normalizedWeights.travel_time * 100)}%</strong> Distance</span>
        <span className="ai-score-plus">+</span>
        <span><strong>{Math.round(normalizedWeights.wait_time * 100)}%</strong> Queue</span>
        <span className="ai-score-plus">+</span>
        <span><strong>{Math.round(normalizedWeights.cost * 100)}%</strong> Price</span>
        <span className="ai-score-plus">+</span>
        <span><strong>{Math.round(normalizedWeights.reliability * 100)}%</strong> Uptime</span>
        <span className="ai-score-plus">+</span>
        <span><strong>{Math.round(normalizedWeights.battery_preservation * 100)}%</strong> Battery Care</span>
      </div>
    </div>
  );
};