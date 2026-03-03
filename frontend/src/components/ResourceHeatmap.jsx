import React from 'react';
import Plot from 'react-plotly.js';

const ResourceHeatmap = ({ tasks }) => {
    if (!tasks || tasks.length === 0) {
        return <div className="text-xs text-text-muted">Upload a CSV to see resource allocation.</div>;
    }

    // Generate dates range for x-axis
    const dates = [];
    const start = new Date('2026-03-10');
    const end = new Date('2026-03-31');
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d).toISOString().split('T')[0]);
    }

    const taskNames = tasks.map(t => t.task_name);

    // Create mock intensity data
    const zData = tasks.map(task => {
        return dates.map(date => {
            if (date >= task.start_date && date <= task.end_date) {
                return Math.floor(Math.random() * 80) + 20; // Resource load between 20-100
            }
            return 0;
        });
    });

    const data = [{
        z: zData,
        x: dates,
        y: taskNames,
        type: 'heatmap',
        colorscale: 'YlOrRd',
        showscale: true,
        hoverongaps: false,
        zmin: 0,
        zmax: 100,
        colorbar: {
            tickfont: { color: '#9CA3AF', size: 10 },
            thickness: 12,
            len: 0.8
        }
    }];

    const layout = {
        height: 300,
        margin: { t: 10, b: 60, l: 150, r: 20 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        xaxis: {
            tickfont: { color: '#9CA3AF', size: 10 },
            gridcolor: '#1F2937',
            zeroline: false
        },
        yaxis: {
            tickfont: { color: '#F9FAFB', size: 11 },
            gridcolor: '#1F2937',
            zeroline: false
        }
    };

    return (
        <div className="w-full overflow-hidden">
            <Plot
                data={data}
                layout={layout}
                config={{ displayModeBar: false, responsive: true }}
                className="w-full"
            />
        </div>
    );
};

export default ResourceHeatmap;
