import React from 'react';
import GanttChart from '../components/GanttChart';
import ResourceHeatmap from '../components/ResourceHeatmap';
import UploadPanel from '../components/UploadPanel';
import WhatIfPanel from '../components/WhatIfPanel';
import RecommendationsPanel from '../components/RecommendationsPanel';
import { useTasks } from '../hooks/useTasks';

const Dashboard = () => {
    const { tasks, isLoading, error, upload, whatIf } = useTasks();

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
            {error && (
                <div className="bg-risk-high/10 border border-risk-high/20 text-risk-high px-4 py-3 rounded-xl text-sm">
                    {error}
                </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Gantt Chart and Recommendations */}
                <div className="flex flex-col gap-6">
                    <div className="bg-background-card rounded-xl border border-border shadow-lg shadow-black/20 overflow-hidden">
                        <div className="p-5 border-b border-border flex items-center justify-between">
                            <h2 className="text-lg font-medium text-text-primary">Gantt Timeline</h2>
                            <span className="text-xs text-text-muted px-2 py-1 bg-border rounded-md">Project Schedule</span>
                        </div>
                        <div className="p-5">
                            <GanttChart tasks={tasks} />
                            {isLoading && (
                                <div className="mt-3 text-xs text-text-muted">Loading project results…</div>
                            )}
                        </div>
                    </div>

                    <div className="bg-background-card rounded-xl border border-border shadow-lg shadow-black/20 overflow-hidden">
                        <div className="p-5 border-b border-border">
                            <h2 className="text-lg font-medium text-text-primary">Risk Recommendations</h2>
                        </div>
                        <div className="p-5">
                            <RecommendationsPanel tasks={tasks} />
                        </div>
                    </div>
                </div>

                {/* Right Column: Heatmap, Upload, and What-if */}
                <div className="flex flex-col gap-6">
                    <div className="bg-background-card rounded-xl border border-border shadow-lg shadow-black/20 overflow-hidden">
                        <div className="p-5 border-b border-border">
                            <h2 className="text-lg font-medium text-text-primary">Resource Allocation</h2>
                        </div>
                        <div className="p-5">
                            <ResourceHeatmap tasks={tasks} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-background-card rounded-xl border border-border shadow-lg shadow-black/20 overflow-hidden">
                            <div className="p-5 border-b border-border">
                                <h2 className="text-lg font-medium text-text-primary">Scenario Analysis</h2>
                            </div>
                            <div className="p-5">
                                <WhatIfPanel onRun={whatIf} disabled={isLoading || !tasks.length} />
                            </div>
                        </div>

                        <div className="bg-background-card rounded-xl border border-border shadow-lg shadow-black/20 overflow-hidden">
                            <div className="p-5 border-b border-border">
                                <h2 className="text-lg font-medium text-text-primary">Import Project Data</h2>
                            </div>
                            <div className="p-5">
                                <UploadPanel onUpload={upload} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
