import React from 'react';

export default function ChartFrame({ label, hasData = true, emptyMessage = 'No data available.', height = 360, children }) {
  return (
    <div className="chart-frame" role="group" aria-label={label} style={{ height }}>
      {hasData ? children : <p className="chart-empty" role="status">{emptyMessage}</p>}
    </div>
  );
}
