import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';

function App() {
    const [activeTab, setActiveTab] = useState('dashboard');

    const getPageTitle = () => {
        switch (activeTab) {
            case 'dashboard': return 'Project Risk Overview';
            case 'upload': return 'Data Upload';
            case 'reports': return 'Project Reports';
            default: return 'Project Risk Overview';
        }
    };

    return (
        <div className="min-h-screen bg-background-main font-inter text-text-primary flex">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

            <div className="flex-1 ml-[240px] flex flex-col">
                <Header title={getPageTitle()} />

                <main className="mt-16 p-8 custom-scrollbar overflow-y-auto">
                    {activeTab === 'dashboard' && <Dashboard />}
                    {activeTab === 'upload' && (
                        <div className="max-w-4xl mx-auto py-12">
                            <div className="bg-background-card p-10 rounded-2xl border border-border text-center">
                                <h2 className="text-2xl font-semibold mb-2">Upload Section</h2>
                                <p className="text-text-secondary">This section will handle report uploads.</p>
                            </div>
                        </div>
                    )}
                    {activeTab === 'reports' && (
                        <div className="max-w-4xl mx-auto py-12">
                            <div className="bg-background-card p-10 rounded-2xl border border-border text-center">
                                <h2 className="text-2xl font-semibold mb-2">Reports Section</h2>
                                <p className="text-text-secondary">View and download project analysis reports.</p>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default App;
