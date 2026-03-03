import React from 'react';
import { LayoutDashboard, Upload, FileText, ChevronRight } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'upload', label: 'Upload', icon: Upload },
        { id: 'reports', label: 'Reports', icon: FileText },
    ];

    return (
        <aside className="fixed left-0 top-0 h-screen w-[240px] bg-background-card border-r border-border flex flex-col z-50">
            <div className="h-16 flex items-center px-6 border-b border-border">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">
                        A
                    </div>
                    <span className="text-xl font-bold tracking-tight text-text-primary">Aura-Sync</span>
                </div>
            </div>

            <nav className="flex-1 py-6">
                <ul className="space-y-1">
                    {menuItems.map((item) => (
                        <li key={item.id}>
                            <button
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-3 px-6 py-3 transition-all duration-200 group relative ${activeTab === item.id
                                        ? 'text-primary bg-primary/5'
                                        : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                                    }`}
                            >
                                {activeTab === item.id && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                                )}
                                <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-primary' : 'text-text-muted group-hover:text-text-secondary'}`} />
                                <span className="font-medium">{item.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="p-6 border-t border-border">
                <div className="bg-background-main/50 rounded-xl p-4 border border-border">
                    <p className="text-xs text-text-muted mb-2 uppercase tracking-wider font-semibold">User Account</p>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center text-text-secondary text-xs">
                            JD
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-text-primary truncate">John Doe</p>
                            <p className="text-xs text-text-muted truncate">Admin Access</p>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
