import React, { useState, useEffect } from 'react';
import { vehiclesApi, driversApi, tripsApi, maintenanceApi, fuelExpensesApi } from '../../api/api';
import { 
  Truck, 
  CheckCircle2, 
  Wrench, 
  Navigation, 
  Users, 
  Percent,
  Calendar,
  Filter,
  DollarSign
} from 'lucide-react';
import { SYSTEM_DATE } from '../../utils/rules';

export default function Dashboard() {
  // DB States
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [typeFilter, setTypeFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Load database collections
  const loadData = async () => {
    try {
      const [v, d, t, m, f, e] = await Promise.all([
        vehiclesApi.getAll(),
        driversApi.getAll(),
        tripsApi.getAll(),
        maintenanceApi.getAll(),
        fuelExpensesApi.getFuelLogs(),
        fuelExpensesApi.getExpenses()
      ]);
      setVehicles(v);
      setDrivers(d);
      setTrips(t);
      setMaintenanceLogs(m);
      setFuelLogs(f);
      setExpenses(e);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-cyan-400">
        <div className="text-center">
          <div className="pulse-dot mr-2"></div>
          <span className="font-semibold text-lg tracking-wider">Syncing Fleet Data...</span>
        </div>
      </div>
    );
  }

  // Helper arrays for unique filter values
  const vehicleTypes = ['All', ...new Set(vehicles.map(v => v.type))];
  const vehicleRegions = ['All', ...new Set(vehicles.map(v => v.region).filter(Boolean))];
  const vehicleStatuses = ['All', 'Available', 'On Trip', 'In Shop', 'Retired'];

  // Apply filters to Vehicles
  const filteredVehicles = vehicles.filter(v => {
    const matchType = typeFilter === 'All' || v.type === typeFilter;
    const matchRegion = regionFilter === 'All' || v.region === regionFilter;
    const matchStatus = statusFilter === 'All' || v.status === statusFilter;
    return matchType && matchRegion && matchStatus;
  });

  // Get filtered vehicle IDs to cascade filters to Trips, Maintenance, and Fuel/Expenses
  const filteredVehicleIds = new Set(filteredVehicles.map(v => v.id));

  // Cascaded collections
  const filteredTrips = trips.filter(t => filteredVehicleIds.has(t.vehicleId));
  const filteredMaint = maintenanceLogs.filter(m => filteredVehicleIds.has(m.vehicleId));
  const filteredFuel = fuelLogs.filter(f => filteredVehicleIds.has(f.vehicleId));
  const filteredExpenses = expenses.filter(e => filteredVehicleIds.has(e.vehicleId));

  // Calculate KPIs based on filtered datasets
  const totalVehiclesCount = filteredVehicles.length;
  const activeVehicles = filteredVehicles.filter(v => v.status === 'On Trip').length;
  const availableVehicles = filteredVehicles.filter(v => v.status === 'Available').length;
  const inShopVehicles = filteredVehicles.filter(v => v.status === 'In Shop').length;

  const activeTripsCount = filteredTrips.filter(t => t.status === 'Dispatched').length;
  const pendingTripsCount = filteredTrips.filter(t => t.status === 'Draft').length;

  // Active drivers count (drivers whose status is 'On Trip' or 'Available')
  const driversOnDuty = drivers.filter(d => d.status === 'On Trip' || d.status === 'Available').length;

  // Fleet Utilization formula: (Vehicles On Trip / Total Non-Retired Vehicles) * 100
  const nonRetiredVehicles = filteredVehicles.filter(v => v.status !== 'Retired');
  const utilizationPercent = nonRetiredVehicles.length > 0 
    ? Math.round((filteredVehicles.filter(v => v.status === 'On Trip').length / nonRetiredVehicles.length) * 100)
    : 0;

  // Calculate Cost rolls for charts
  const fuelCostSum = filteredFuel.reduce((sum, log) => sum + (Number(log.cost) || 0), 0);
  const maintCostSum = filteredMaint.reduce((sum, log) => sum + (Number(log.cost) || 0), 0);
  const expenseCostSum = filteredExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const totalOperationalCost = fuelCostSum + maintCostSum + expenseCostSum;

  // Calculate Vehicle ROI list (Revenue - (Maint + Fuel + Expense)) / AcquisitionCost
  const vehicleRoiRankings = filteredVehicles
    .filter(v => v.status !== 'Retired' && v.acquisitionCost > 0)
    .map(v => {
      // Find trips for this vehicle
      const vTrips = trips.filter(t => t.vehicleId === v.id && t.status === 'Completed');
      const vRevenue = vTrips.reduce((sum, t) => sum + (t.revenue || 0), 0);

      // Find costs
      const vFuel = fuelLogs.filter(f => f.vehicleId === v.id).reduce((sum, f) => sum + f.cost, 0);
      const vMaint = maintenanceLogs.filter(m => m.vehicleId === v.id).reduce((sum, m) => sum + m.cost, 0);
      const vExp = expenses.filter(e => e.vehicleId === v.id).reduce((sum, e) => sum + e.amount, 0);

      const netProfit = vRevenue - (vFuel + vMaint + vExp);
      const roi = Math.round((netProfit / v.acquisitionCost) * 100);

      return {
        regNumber: v.regNumber,
        name: v.name,
        roi: roi,
        netProfit: netProfit
      };
    })
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 5); // top 5

  // Cost breakdown donut calculations
  const totalChartCosts = totalOperationalCost || 1; // avoid divide by zero
  const fuelPct = Math.round((fuelCostSum / totalChartCosts) * 100);
  const maintPct = Math.round((maintCostSum / totalChartCosts) * 100);
  const expPct = Math.round((expenseCostSum / totalChartCosts) * 100);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p className="text-slate-400 text-sm">Real-time status updates as of {SYSTEM_DATE}</p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-400">
          <Calendar className="h-4.5 w-4.5 text-cyan-400" />
          <span>System Date: {SYSTEM_DATE}</span>
        </div>
      </div>

      {/* Reactive Filter Toolbar */}
      <div className="card mb-6 flex flex-wrap gap-4 items-center justify-between py-4 px-6">
        <div className="flex items-center gap-2 text-cyan-400">
          <Filter className="h-5 w-5" />
          <span className="font-semibold text-sm">Filter Fleet:</span>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Type</span>
            <select 
              value={typeFilter} 
              onChange={e => setTypeFilter(e.target.value)} 
              className="select-field py-1.5 px-3 text-sm bg-slate-900 border-slate-800"
            >
              {vehicleTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Region</span>
            <select 
              value={regionFilter} 
              onChange={e => setRegionFilter(e.target.value)} 
              className="select-field py-1.5 px-3 text-sm bg-slate-900 border-slate-800"
            >
              {vehicleRegions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Status</span>
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)} 
              className="select-field py-1.5 px-3 text-sm bg-slate-900 border-slate-800"
            >
              {vehicleStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <button 
            onClick={() => { setTypeFilter('All'); setRegionFilter('All'); setStatusFilter('All'); }} 
            className="btn btn-secondary py-1.5 px-3 text-xs"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card card cyan">
          <div className="kpi-info">
            <h4>Active Vehicles</h4>
            <div className="value">{activeVehicles}</div>
            <div className="text-[10px] text-slate-400 mt-1">Status: On Trip</div>
          </div>
          <div className="kpi-icon-wrapper">
            <Truck className="h-6 w-6" />
          </div>
        </div>

        <div className="kpi-card card green">
          <div className="kpi-info">
            <h4>Available Vehicles</h4>
            <div className="value">{availableVehicles}</div>
            <div className="text-[10px] text-slate-400 mt-1">Ready for Dispatch</div>
          </div>
          <div className="kpi-icon-wrapper">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        <div className="kpi-card card amber">
          <div className="kpi-info">
            <h4>In Shop</h4>
            <div className="value">{inShopVehicles}</div>
            <div className="text-[10px] text-slate-400 mt-1">Under Maintenance</div>
          </div>
          <div className="kpi-icon-wrapper">
            <Wrench className="h-6 w-6" />
          </div>
        </div>

        <div className="kpi-card card purple">
          <div className="kpi-info">
            <h4>Active Trips</h4>
            <div className="value">{activeTripsCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">Pending Drafts: {pendingTripsCount}</div>
          </div>
          <div className="kpi-icon-wrapper">
            <Navigation className="h-6 w-6" />
          </div>
        </div>

        <div className="kpi-card card red">
          <div className="kpi-info">
            <h4>Fleet Utilization</h4>
            <div className="value">{utilizationPercent}%</div>
            <div className="text-[10px] text-slate-400 mt-1">Excludes Retired</div>
          </div>
          <div className="kpi-icon-wrapper">
            <Percent className="h-6 w-6" />
          </div>
        </div>

        <div className="kpi-card card">
          <div className="kpi-info">
            <h4>Drivers On Duty</h4>
            <div className="value">{driversOnDuty}</div>
            <div className="text-[10px] text-slate-400 mt-1">Available + On Trip</div>
          </div>
          <div className="kpi-icon-wrapper text-cyan-400 bg-cyan-950/20">
            <Users className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Interactive Charts Panel */}
      <div className="dashboard-grid">
        {/* Cost Breakdown Donut Chart */}
        <div className="col-4 card flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-200">Operational Cost Breakdown</h3>
            <p className="text-xs text-slate-400 mt-1">Rollup: Fuel, Maintenance, and Tolls</p>
          </div>

          {totalOperationalCost > 0 ? (
            <div className="flex flex-col items-center justify-center my-6">
              {/* Doughnut SVG */}
              <svg width="180" height="180" viewBox="0 0 36 36" className="transform -rotate-90">
                {/* Background circle */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
                
                {/* Fuel section (Cyan) */}
                <circle 
                  cx="18" cy="18" r="15.915" fill="none" 
                  stroke="var(--color-primary)" 
                  strokeWidth="3.2" 
                  strokeDasharray={`${fuelPct} ${100 - fuelPct}`} 
                  strokeDashoffset="0" 
                />
                {/* Maintenance section (Amber) */}
                <circle 
                  cx="18" cy="18" r="15.915" fill="none" 
                  stroke="var(--color-warning)" 
                  strokeWidth="3.2" 
                  strokeDasharray={`${maintPct} ${100 - maintPct}`} 
                  strokeDashoffset={-fuelPct} 
                />
                {/* Expenses section (Purple) */}
                <circle 
                  cx="18" cy="18" r="15.915" fill="none" 
                  stroke="var(--color-secondary)" 
                  strokeWidth="3.2" 
                  strokeDasharray={`${expPct} ${100 - expPct}`} 
                  strokeDashoffset={-(fuelPct + maintPct)} 
                />
              </svg>
              
              <div className="text-center mt-3">
                <span className="text-xs text-slate-400">Total Cost</span>
                <div className="text-xl font-bold text-slate-200">${totalOperationalCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
              </div>
            </div>
          ) : (
            <div className="flex h-36 items-center justify-center text-xs text-slate-500 italic">
              No financial logs recorded.
            </div>
          )}

          <div className="space-y-2 text-xs border-t border-slate-800 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-cyan-400"></span>
                <span className="text-slate-300">Fuel Cost ({fuelPct}%)</span>
              </div>
              <span className="font-semibold text-slate-200">${fuelCostSum.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-500"></span>
                <span className="text-slate-300">Maintenance ({maintPct}%)</span>
              </div>
              <span className="font-semibold text-slate-200">${maintCostSum.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-violet-500"></span>
                <span className="text-slate-300">Tolls & Other ({expPct}%)</span>
              </div>
              <span className="font-semibold text-slate-200">${expenseCostSum.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* ROI Rankings Leaderboard */}
        <div className="col-8 card">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-200">Top Performing Vehicles (ROI %)</h3>
            <p className="text-xs text-slate-400 mt-1">ROI = (Trip Revenue - Operational Cost) / Acquisition Cost</p>
          </div>

          <div className="space-y-6 my-6">
            {vehicleRoiRankings.length > 0 ? (
              vehicleRoiRankings.map((vehicle, index) => (
                <div key={vehicle.regNumber} className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px]">
                        {index + 1}
                      </span>
                      <span className="font-bold text-slate-200">{vehicle.regNumber}</span>
                      <span className="text-slate-400">({vehicle.name})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-semibold ${vehicle.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ROI: {vehicle.roi}%
                      </span>
                      <span className="text-slate-400">Net: ${vehicle.netProfit.toLocaleString()}</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        vehicle.roi >= 50 
                          ? 'bg-emerald-500' 
                          : vehicle.roi >= 10 
                          ? 'bg-cyan-500' 
                          : vehicle.roi >= 0 
                          ? 'bg-amber-500' 
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(Math.max(vehicle.roi, 0), 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-36 items-center justify-center text-xs text-slate-500 italic">
                No ROI data available (requires completed trips & purchase cost records).
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
