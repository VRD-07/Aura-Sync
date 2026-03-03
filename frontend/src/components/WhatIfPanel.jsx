import React, { useState } from 'react';
import { Play, Loader2 } from 'lucide-react';

const WhatIfPanel = ({ onRun, disabled }) => {
    const [multiplier, setMultiplier] = useState(1.0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async () => {
        if (!onRun) return;
        setIsLoading(true);
        setError(null);
        try {
            await onRun(multiplier);
        } catch (err) {
            setError(err?.message ?? 'Scenario run failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {error && (
                <div className="text-xs text-risk-high bg-risk-high/10 border border-risk-high/20 px-3 py-2 rounded-lg">
                    {error}
                </div>
            )}
            <div className="space-y-2">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Duration multiplier
                </label>
                <div className="flex items-center gap-3">
                    <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={multiplier}
                        onChange={(e) => setMultiplier(parseFloat(e.target.value))}
                        disabled={disabled || isLoading}
                        className="flex-1"
                    />
                    <input
                        type="number"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={multiplier}
                        onChange={(e) => setMultiplier(parseFloat(e.target.value || '1'))}
                        disabled={disabled || isLoading}
                        className="w-20 bg-[#1F2937] border border-[#374151] rounded-lg px-2 py-1 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                    />
                </div>
                <p className="text-xs text-text-muted">
                    Example: 1.2 makes tasks 20% longer (re-runs the AI schedule).
                </p>
            </div>

            <button
                onClick={handleSubmit}
                disabled={disabled || isLoading || !onRun}
                className="w-full py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center justify-center gap-2 text-sm font-medium text-white transition-all transform active:scale-[0.98]"
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <>
                        <Play className="w-4 h-4 fill-current" />
                        Run Analysis
                    </>
                )}
            </button>
        </div>
    );
};

export default WhatIfPanel;
