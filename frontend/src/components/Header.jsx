import React from 'react';
import { Bell, Search, Globe } from 'lucide-react';

const Header = ({ title }) => {
    return (
        <header className="h-16 fixed top-0 right-0 left-[240px] bg-background-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-8 z-40">
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-semibold tracking-tight text-text-primary">{title}</h1>
                <div className="flex items-center gap-2 px-2 py-1 bg-risk-low/10 rounded-full border border-risk-low/20">
                    <div className="w-2 h-2 rounded-full bg-risk-low animate-pulse" />
                    <span className="text-[10px] font-bold text-risk-low uppercase tracking-wider">Live</span>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="relative group">
                    <Search className="w-5 h-5 text-text-muted group-hover:text-text-secondary cursor-pointer transition-colors" />
                </div>
                <div className="relative group">
                    <Bell className="w-5 h-5 text-text-muted group-hover:text-text-secondary cursor-pointer transition-colors" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full border-2 border-background-card" />
                </div>
                <div className="h-6 w-px bg-border mx-2" />
                <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                    <Globe className="w-4 h-4 text-text-muted" />
                    <span className="text-sm font-medium text-text-secondary">Project North Star</span>
                </div>
            </div>
        </header>
    );
};

export default Header;
