import React from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';

const RecommendationsPanel = ({ tasks }) => {
    const getRiskColor = (label) => {
        switch (label) {
            case 'High': return 'bg-risk-high';
            case 'Medium': return 'bg-risk-medium';
            case 'Low': return 'bg-risk-low';
            default: return 'bg-primary';
        }
    };

    if (!tasks || tasks.length === 0) {
        return <div className="text-xs text-text-muted">Upload a CSV to generate risk recommendations.</div>;
    }

    return (
        <div className="space-y-4">
            {tasks.map((task) => (
                <div
                    key={task.task_id}
                    className="group flex items-start gap-4 p-4 rounded-xl border border-transparent hover:border-border hover:bg-white/5 transition-all duration-300"
                >
                    <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${getRiskColor(task.risk_label)}`} />

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-text-muted tracking-tight">{task.task_id}</span>
                            <h3 className="text-sm font-semibold text-text-primary truncate">{task.task_name}</h3>
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                            {task.recommendation}
                        </p>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 hover:bg-white/10 rounded-lg text-text-muted hover:text-text-primary">
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}

            <div className="mt-6 pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 text-text-muted hover:text-text-secondary cursor-pointer transition-colors group">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">View detailed risk report</span>
                    <ArrowRight className="w-3 h-3 translate-x-0 group-hover:translate-x-1 transition-transform" />
                </div>
            </div>
        </div>
    );
};

export default RecommendationsPanel;
