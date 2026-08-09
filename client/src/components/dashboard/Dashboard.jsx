import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import DateRangeFilter, { presetRange } from './DateRangeFilter.jsx';
import DashboardKpis from './DashboardKpis.jsx';
import LeadsTimeseriesChart from './LeadsTimeseriesChart.jsx';
import FunnelChart from './FunnelChart.jsx';
import CampaignRankingTable from './CampaignRankingTable.jsx';

function defaultRange() {
  return { ...presetRange(6), preset: '7d' };
}

export default function Dashboard() {
  const [range, setRange] = useState(defaultRange);
  const [summary, setSummary] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [funnel, setFunnel] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = { from: range.from, to: range.to };
    setError(null);
    Promise.all([
      api.getDashboardSummary(params),
      api.getDashboardLeadsTimeseries(params),
      api.getDashboardFunnel(params),
      api.getDashboardCampaigns(params),
    ])
      .then(([s, t, f, c]) => {
        setSummary(s);
        setTimeseries(t);
        setFunnel(f);
        setCampaigns(c);
      })
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to]);

  return (
    <div className="space-y-4">
      <DateRangeFilter range={range} activePreset={range.preset} onChange={setRange} />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <DashboardKpis summary={summary} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <LeadsTimeseriesChart data={timeseries} />
        <FunnelChart data={funnel} />
      </div>
      <CampaignRankingTable rows={campaigns} />
    </div>
  );
}
