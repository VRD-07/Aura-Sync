import React from 'react';
import Plot from 'react-plotly.js';

const GanttChart = ({ tasks }) => {
    if (!tasks || tasks.length === 0) {
        return <div className="text-xs text-text-muted">Upload a CSV to render the schedule.</div>;
    }

    const getRiskColor = (label) => {
        switch (label) {
            case 'High': return '#DC2626';
            case 'Medium': return '#F59E0B';
            case 'Low': return '#16A34A';
            default: return '#2563EB';
        }
    };

    const data = tasks.map((task) => ({
        x: [task.start_date, task.end_date],
        y: [task.task_name, task.task_name],
        type: 'scatter',
        mode: 'lines',
        line: {
            color: getRiskColor(task.risk_label),
            width: 28,
        },
        hoverinfo: 'text',
        text: `
      <b>${task.task_name}</b><br>
      Risk: ${task.risk_label}<br>
      On-time Probability: ${task.on_time_probability}%
    `,
        showlegend: false,
    }));

    const layout = {
        height: 320,
        margin: { t: 10, b: 40, l: 230, r: 20 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        xaxis: {
            type: 'date',
            gridcolor: '#1F2937',
            zeroline: false,
            tickfont: { color: '#9CA3AF', size: 10 },
            range: ['2026-03-08', '2026-04-02']
        },
        yaxis: {
            gridcolor: '#1F2937',
            zeroline: false,
            tickfont: { color: '#F9FAFB', size: 12, weight: 'medium' },
            autorange: 'reversed',
        },
        hoverlabel: {
            bgcolor: '#111827',
            bordercolor: '#1F2937',
            font: { color: '#F9FAFB', size: 13, family: 'Inter' },
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

export default GanttChart;
