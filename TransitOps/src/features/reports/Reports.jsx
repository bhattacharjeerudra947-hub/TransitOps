import React, { useState, useEffect } from 'react';
import { vehiclesApi, tripsApi, maintenanceApi, fuelExpensesApi } from '../../api/api';
import { SYSTEM_DATE } from '../../utils/rules';
import { BarChart3, Download, Fuel, Landmark, ArrowUpRight, TrendingUp, HelpCircle } from 'lucide-react';

export default function Reports() {
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [maintLogs, setMaintLogs] = useState([]);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Report Tab: 'roi' | 'fuel' | 'cost'
  const [activeReportTab, setActiveReportTab] = useState('roi');

  const loadData = async () => {
    try {
      const [v, t, m, f, e] = await Promise.all([
        vehiclesApi.getAll(),
        tripsApi.getAll(),
        maintenanceApi.getAll(),
        fuelExpensesApi.getFuelLogs(),
        fuelExpensesApi.getExpenses()
      ]);
      setVehicles(v);
      setTrips(t);
      setMaintLogs(m);
      setFuelLogs(f);
      setExpenses(e);
    } catch (err) {
      console.error('Failed to load reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Simple Native CSV Exporter
  const handleExportCsv = (filename, headers, rows) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => {
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') ? `"${str}"` : str;
      }).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compile datasets
  const activeVehicles = vehicles.filter(v => v.status !== 'Retired');

  // ROI dataset
  const roiReportData = activeVehicles.map(v => {
    const vTrips = trips.filter(t => t.vehicleId === v.id && t.status === 'Completed');
    const revenue = vTrips.reduce((sum, t) => sum + (t.revenue || 0), 0);
    const fuel = fuelLogs.filter(f => f.vehicleId === v.id).reduce((sum, f) => sum + f.cost, 0);
    const maint = maintLogs.filter(m => m.vehicleId === v.id).reduce((sum, m) => sum + m.cost, 0);
    const exp = expenses.filter(e => e.vehicleId === v.id).reduce((sum, e) => sum + e.amount, 0);
    
    const netCost = fuel + maint + exp;
    const netProfit = revenue - netCost;
    const roiVal = v.acquisitionCost > 0 ? ((netProfit / v.acquisitionCost) * 100) : 0;

    return {
      regNumber: v.regNumber,
      name: v.name,
      acquisitionCost: v.acquisitionCost,
      revenue,
      netCost,
      netProfit,
      roi: Math.round(roiVal)
    };
  });

  // Fuel Efficiency dataset
  const fuelReportData = activeVehicles.map(v => {
    const vTrips = trips.filter(t => t.vehicleId === v.id && t.status === 'Completed');
    const totalDistance = vTrips.reduce((sum, t) => sum + (t.actualDistanceKm || 0), 0);
    const totalFuel = vTrips.reduce((sum, t) => sum + (t.fuelConsumed || 0), 0);
    
    // km per liter
    const ratio = totalFuel > 0 ? (totalDistance / totalFuel) : 0;
    const fuelCost = fuelLogs.filter(f => f.vehicleId === v.id).reduce((sum, f) => sum + f.cost, 0);

    return {
      regNumber: v.regNumber,
      name: v.name,
      tripCount: vTrips.length,
      distanceKm: totalDistance,
      fuelConsumedL: totalFuel,
      efficiencyKmL: Number(ratio.toFixed(2)),
      fuelCost
    };
  });

  // Cost analysis dataset
  const costReportData = activeVehicles.map(v => {
    const vTrips = trips.filter(t => t.vehicleId === v.id && t.status === 'Completed');
    const totalDistance = vTrips.reduce((sum, t) => sum + (t.actualDistanceKm || 0), 0);
    const fuel = fuelLogs.filter(f => f.vehicleId === v.id).reduce((sum, f) => sum + f.cost, 0);
    const maint = maintLogs.filter(m => m.vehicleId === v.id).reduce((sum, m) => sum + m.cost, 0);
    const exp = expenses.filter(e => e.vehicleId === v.id).reduce((sum, e) => sum + e.amount, 0);
    const totalCost = fuel + maint + exp;
    
    const costPerKm = totalDistance > 0 ? (totalCost / totalDistance) : 0;

    return {
      regNumber: v.regNumber,
      name: v.name,
      fuelCost: fuel,
      maintCost: maint,
      expenseCost: exp,
      totalCost,
      distanceKm: totalDistance,
      costPerKm: Number(costPerKm.toFixed(2))
    };
  });

  const exportRoiCsv = () => {
    const headers = ['Vehicle Registration', 'Vehicle Name', 'Purchase Price ($)', 'Trip Revenue ($)', 'Net Operating Costs ($)', 'Net Profit ($)', 'ROI (%)'];
    const rows = roiReportData.map(r => [
      r.regNumber, r.name, r.acquisitionCost, r.revenue, r.netCost, r.netProfit, `${r.roi}%`
    ]);
    handleExportCsv('transitops_roi_report.csv', headers, rows);
  };

  const exportFuelCsv = () => {
    const headers = ['Vehicle Registration', 'Vehicle Name', 'Completed Trips', 'Distance Travelled (km)', 'Fuel Consumed (L)', 'Efficiency (km/L)', 'Fuel Purchased ($)'];
    const rows = fuelReportData.map(r => [
      r.regNumber, r.name, r.tripCount, r.distanceKm, r.fuelConsumedL, r.efficiencyKmL, r.fuelCost
    ]);
    handleExportCsv('transitops_fuel_efficiency_report.csv', headers, rows);
  };

  const exportCostCsv = () => {
    const headers = ['Vehicle Registration', 'Vehicle Name', 'Fuel Costs ($)', 'Maintenance Costs ($)', 'Tolls & Other ($)', 'Cumulative Cost ($)', 'Distance (km)', 'Cost per km ($)'];
    const rows = costReportData.map(r => [
      r.regNumber, r.name, r.fuelCost, r.maintCost, r.expenseCost, r.totalCost, r.distanceKm, `$${r.costPerKm}/km`
    ]);
    handleExportCsv('transitops_operational_costs_report.csv', headers, rows);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Operational Analytics & Reports</h2>
          <p className="text-slate-400 text-sm">Analyze ROI leaderboards, fuel economies, and download spreadsheet logs</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/20 mb-6 rounded-lg p-1 max-w-2xl">
        <button
          className={`flex-1 py-2.5 px-4 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 ${activeReportTab === 'roi' ? 'bg-[#0f162a] border border-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
          onClick={() => setActiveReportTab('roi')}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Vehicle ROI Matrix</span>
        </button>
        <button
          className={`flex-1 py-2.5 px-4 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 ${activeReportTab === 'fuel' ? 'bg-[#0f162a] border border-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
          onClick={() => setActiveReportTab('fuel')}
        >
          <Fuel className="h-4 w-4" />
          <span>Fuel Efficiency Logs</span>
        </button>
        <button
          className={`flex-1 py-2.5 px-4 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 ${activeReportTab === 'cost' ? 'bg-[#0f162a] border border-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
          onClick={() => setActiveReportTab('cost')}
        >
          <Landmark className="h-4 w-4" />
          <span>Operational Cost Rollups</span>
        </button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-cyan-400">
          <div className="pulse-dot mr-2"></div>
          <span>Generating reports database...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: ROI */}
          {activeReportTab === 'roi' && (
            <div className="card space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-200">Return on Investment (ROI) leaderboard</h3>
                  <p className="text-xs text-slate-400 mt-1">Reflects earnings relative to initial purchasing costs</p>
                </div>
                <button className="btn btn-secondary py-2 px-3.5 text-xs" onClick={exportRoiCsv}>
                  <Download className="h-4 w-4 text-cyan-400" />
                  <span>Export CSV</span>
                </button>
              </div>

              <div className="table-wrapper">
                <table className="data-table text-xs">
                  <thead>
                    <tr>
                      <th>Vehicle</th>
                      <th>Acquisition Cost</th>
                      <th>Total Trip Revenue</th>
                      <th>Operational Cost</th>
                      <th>Net Profit / Loss</th>
                      <th className="text-right">ROI (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roiReportData.map(row => (
                      <tr key={row.regNumber}>
                        <td>
                          <div className="font-bold text-slate-200">{row.regNumber}</div>
                          <div className="text-[10px] text-slate-500">{row.name}</div>
                        </td>
                        <td>${row.acquisitionCost.toLocaleString()}</td>
                        <td className="text-emerald-400 font-semibold">${row.revenue.toLocaleString()}</td>
                        <td className="text-red-400">${row.netCost.toLocaleString()}</td>
                        <td className={`font-semibold ${row.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          ${row.netProfit.toLocaleString()}
                        </td>
                        <td className={`text-right text-sm font-bold ${row.roi >= 50 ? 'text-emerald-400' : row.roi >= 10 ? 'text-cyan-400' : row.roi >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                          {row.roi}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Fuel Efficiency */}
          {activeReportTab === 'fuel' && (
            <div className="card space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-200">Fuel Economy & Consumption Analysis</h3>
                  <p className="text-xs text-slate-400 mt-1">Derived from actual distance and liters consumed on completed trips</p>
                </div>
                <button className="btn btn-secondary py-2 px-3.5 text-xs" onClick={exportFuelCsv}>
                  <Download className="h-4 w-4 text-cyan-400" />
                  <span>Export CSV</span>
                </button>
              </div>

              <div className="table-wrapper">
                <table className="data-table text-xs">
                  <thead>
                    <tr>
                      <th>Vehicle</th>
                      <th>Trips completed</th>
                      <th>Total Distance</th>
                      <th>Fuel Consumed</th>
                      <th>Fuel Efficiency</th>
                      <th>Total Fuel Purchased</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fuelReportData.map(row => (
                      <tr key={row.regNumber}>
                        <td>
                          <div className="font-bold text-slate-200">{row.regNumber}</div>
                          <div className="text-[10px] text-slate-500">{row.name}</div>
                        </td>
                        <td>{row.tripCount} trips</td>
                        <td>{row.distanceKm.toLocaleString()} km</td>
                        <td>{row.fuelConsumedL.toLocaleString()} Liters</td>
                        <td className="font-bold text-cyan-400">
                          {row.efficiencyKmL > 0 ? `${row.efficiencyKmL} km/L` : '—'}
                        </td>
                        <td className="font-semibold text-slate-200">${row.fuelCost.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Operational Cost */}
          {activeReportTab === 'cost' && (
            <div className="card space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-200">Cumulative Cost Ledger & Cost per Kilometre</h3>
                  <p className="text-xs text-slate-400 mt-1">Compares expenses with distance to compute average cost efficiency</p>
                </div>
                <button className="btn btn-secondary py-2 px-3.5 text-xs" onClick={exportCostCsv}>
                  <Download className="h-4 w-4 text-cyan-400" />
                  <span>Export CSV</span>
                </button>
              </div>

              <div className="table-wrapper">
                <table className="data-table text-xs">
                  <thead>
                    <tr>
                      <th>Vehicle</th>
                      <th>Fuel Purchases</th>
                      <th>Maintenance costs</th>
                      <th>Tolls & Parking</th>
                      <th>Cumulative Cost</th>
                      <th>Distance Travelled</th>
                      <th className="text-right">Operational Cost per km</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costReportData.map(row => (
                      <tr key={row.regNumber}>
                        <td>
                          <div className="font-bold text-slate-200">{row.regNumber}</div>
                          <div className="text-[10px] text-slate-500">{row.name}</div>
                        </td>
                        <td>${row.fuelCost.toLocaleString()}</td>
                        <td>${row.maintCost.toLocaleString()}</td>
                        <td>${row.expenseCost.toLocaleString()}</td>
                        <td className="font-bold text-slate-200">${row.totalCost.toLocaleString()}</td>
                        <td>{row.distanceKm.toLocaleString()} km</td>
                        <td className="text-right font-bold text-cyan-400">
                          {row.costPerKm > 0 ? `$${row.costPerKm}/km` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
