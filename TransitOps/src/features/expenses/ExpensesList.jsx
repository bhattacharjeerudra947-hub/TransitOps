import React, { useState, useEffect } from 'react';
import { fuelExpensesApi, vehiclesApi, maintenanceApi } from '../../api/api';
import { SYSTEM_DATE } from '../../utils/rules';
import { Fuel, Landmark, Plus, Calendar, DollarSign, ListFilter, HelpCircle, FileText } from 'lucide-react';

export default function ExpensesList() {
  const [vehicles, setVehicles] = useState([]);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [maintLogs, setMaintLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: 'ledger' | 'fuel' | 'expenses'
  const [activeTab, setActiveTab] = useState('ledger');

  // Fuel Form state
  const [fuelForm, setFuelForm] = useState({
    vehicleId: '',
    liters: '',
    cost: '',
    date: SYSTEM_DATE
  });

  // Expense Form state
  const [expenseForm, setExpenseForm] = useState({
    vehicleId: '',
    type: 'Toll',
    amount: '',
    date: SYSTEM_DATE
  });

  const [fuelError, setFuelError] = useState('');
  const [expenseError, setExpenseError] = useState('');
  const [savingFuel, setSavingFuel] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);

  const loadData = async () => {
    try {
      const [v, f, e, m] = await Promise.all([
        vehiclesApi.getAll(),
        fuelExpensesApi.getFuelLogs(),
        fuelExpensesApi.getExpenses(),
        maintenanceApi.getAll()
      ]);
      setVehicles(v);
      setFuelLogs(f);
      setExpenses(e);
      setMaintLogs(m);
    } catch (err) {
      console.error('Failed to load ledger data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFuelSubmit = async (e) => {
    e.preventDefault();
    setSavingFuel(true);
    setFuelError('');
    try {
      await fuelExpensesApi.createFuelLog(fuelForm);
      setFuelForm({
        vehicleId: '',
        liters: '',
        cost: '',
        date: SYSTEM_DATE
      });
      await loadData();
    } catch (err) {
      setFuelError(err.message || 'Failed to save fuel log.');
    } finally {
      setSavingFuel(false);
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    setSavingExpense(true);
    setExpenseError('');
    try {
      await fuelExpensesApi.createExpense(expenseForm);
      setExpenseForm({
        vehicleId: '',
        type: 'Toll',
        amount: '',
        date: SYSTEM_DATE
      });
      await loadData();
    } catch (err) {
      setExpenseError(err.message || 'Failed to save expense log.');
    } finally {
      setSavingExpense(false);
    }
  };

  const getVehicleReg = (vehId) => {
    const v = vehicles.find(veh => veh.id === vehId);
    return v ? v.regNumber : 'Unknown';
  };

  // Compile operational ledger per vehicle
  const ledgerRollup = vehicles.map(vehicle => {
    const vehicleFuel = fuelLogs.filter(f => f.vehicleId === vehicle.id).reduce((sum, f) => sum + f.cost, 0);
    const vehicleMaint = maintLogs.filter(m => m.vehicleId === vehicle.id).reduce((sum, m) => sum + m.cost, 0);
    const vehicleExp = expenses.filter(e => e.vehicleId === vehicle.id).reduce((sum, e) => sum + e.amount, 0);
    const totalCost = vehicleFuel + vehicleMaint + vehicleExp;

    return {
      id: vehicle.id,
      regNumber: vehicle.regNumber,
      name: vehicle.name,
      status: vehicle.status,
      fuelCost: vehicleFuel,
      maintenanceCost: vehicleMaint,
      expenseCost: vehicleExp,
      totalCost: totalCost
    };
  });

  const activeVehicles = vehicles.filter(v => v.status !== 'Retired');

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Operational Ledgers & Expenses</h2>
          <p className="text-slate-400 text-sm">Log fleet costs and audit cumulative operational rollups</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Logging Panel */}
        <div className="col-4 space-y-6">
          {/* Fuel Logger */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4 text-cyan-400 border-b border-slate-800 pb-2">
              <Fuel className="h-5 w-5" />
              <h3 className="font-bold text-sm text-slate-200">Log Fuel Purchase</h3>
            </div>
            
            {fuelError && <div className="p-2 mb-3 rounded bg-red-500/10 text-red-300 text-xs border border-red-500/20">{fuelError}</div>}
            
            <form onSubmit={handleFuelSubmit} className="space-y-4">
              <div className="form-group mb-0">
                <label className="text-xs">Vehicle*</label>
                <select
                  className="select-field text-xs py-2 px-3 bg-slate-900 border-slate-800"
                  value={fuelForm.vehicleId}
                  onChange={e => setFuelForm(prev => ({ ...prev, vehicleId: e.target.value }))}
                  required
                >
                  <option value="">Select vehicle...</option>
                  {activeVehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.regNumber} - {v.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="form-group mb-0">
                  <label className="text-xs">Liters*</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    placeholder="e.g. 45"
                    className="input-field text-xs py-2 px-3 bg-slate-900 border-slate-800"
                    value={fuelForm.liters}
                    onChange={e => setFuelForm(prev => ({ ...prev, liters: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="text-xs">Total Cost ($)*</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    placeholder="e.g. 90.00"
                    className="input-field text-xs py-2 px-3 bg-slate-900 border-slate-800"
                    value={fuelForm.cost}
                    onChange={e => setFuelForm(prev => ({ ...prev, cost: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-group mb-0">
                <label className="text-xs">Purchase Date*</label>
                <input
                  type="date"
                  className="input-field text-xs py-2 px-3 bg-slate-900 border-slate-800"
                  value={fuelForm.date}
                  onChange={e => setFuelForm(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary w-full text-xs py-2" disabled={savingFuel || !fuelForm.vehicleId}>
                {savingFuel ? 'Saving...' : 'Add Fuel Log'}
              </button>
            </form>
          </div>

          {/* Expense Logger */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4 text-violet-400 border-b border-slate-800 pb-2">
              <Landmark className="h-5 w-5" />
              <h3 className="font-bold text-sm text-slate-200">Log Trip Expense</h3>
            </div>
            
            {expenseError && <div className="p-2 mb-3 rounded bg-red-500/10 text-red-300 text-xs border border-red-500/20">{expenseError}</div>}
            
            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div className="form-group mb-0">
                <label className="text-xs">Vehicle*</label>
                <select
                  className="select-field text-xs py-2 px-3 bg-slate-900 border-slate-800"
                  value={expenseForm.vehicleId}
                  onChange={e => setExpenseForm(prev => ({ ...prev, vehicleId: e.target.value }))}
                  required
                >
                  <option value="">Select vehicle...</option>
                  {activeVehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.regNumber} - {v.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="form-group mb-0">
                  <label className="text-xs">Expense Type*</label>
                  <select
                    className="select-field text-xs py-2 px-3 bg-slate-900 border-slate-800"
                    value={expenseForm.type}
                    onChange={e => setExpenseForm(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="Toll">Toll Road</option>
                    <option value="Other">Other (Parking/etc)</option>
                  </select>
                </div>
                <div className="form-group mb-0">
                  <label className="text-xs">Amount ($)*</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    placeholder="e.g. 15.00"
                    className="input-field text-xs py-2 px-3 bg-slate-900 border-slate-800"
                    value={expenseForm.amount}
                    onChange={e => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-group mb-0">
                <label className="text-xs">Date*</label>
                <input
                  type="date"
                  className="input-field text-xs py-2 px-3 bg-slate-900 border-slate-800"
                  value={expenseForm.date}
                  onChange={e => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary w-full text-xs py-2" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff' }} disabled={savingExpense || !expenseForm.vehicleId}>
                {savingExpense ? 'Saving...' : 'Add Expense Log'}
              </button>
            </form>
          </div>
        </div>

        {/* Ledger & Log Views */}
        <div className="col-8 card flex flex-col p-0 overflow-hidden">
          {/* Tab Navigation header */}
          <div className="ledger-tabs-header">
            <button 
              className={`ledger-tab-btn ${activeTab === 'ledger' ? 'active' : ''}`}
              onClick={() => setActiveTab('ledger')}
            >
              <FileText className="h-4 w-4" />
              <span>Cumulative Ledger Rollup</span>
            </button>
            <button 
              className={`ledger-tab-btn ${activeTab === 'fuel' ? 'active' : ''}`}
              onClick={() => setActiveTab('fuel')}
            >
              <Fuel className="h-4 w-4" />
              <span>Recent Fuel Logs ({fuelLogs.length})</span>
            </button>
            <button 
              className={`ledger-tab-btn ${activeTab === 'expenses' ? 'active' : ''}`}
              onClick={() => setActiveTab('expenses')}
            >
              <Landmark className="h-4 w-4" />
              <span>Recent Expenses ({expenses.length})</span>
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[68vh] flex-1">
            {loading ? (
              <div className="flex h-48 items-center justify-center text-cyan-400">
                <div className="pulse-dot mr-2"></div>
                <span>Syncing financial ledger...</span>
              </div>
            ) : (
              <>
                {/* Ledger View */}
                {activeTab === 'ledger' && (
                  <div className="space-y-4">
                    <div className="ledger-info-banner">
                      <HelpCircle className="h-4.5 w-4.5 flex-shrink-0" />
                      <span>This ledger computes Total Operational Cost per vehicle from fuel, maintenance, and expense ledgers combined.</span>
                    </div>
                    
                    <div className="table-wrapper border-slate-850">
                      <table className="data-table text-xs">
                        <thead>
                          <tr>
                            <th>Vehicle</th>
                            <th>Fuel Costs</th>
                            <th>Maintenance</th>
                            <th>Tolls / Other</th>
                            <th className="text-right">Total Operational Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ledgerRollup.map(item => (
                            <tr key={item.id}>
                              <td>
                                <div className="font-bold text-slate-200">{item.regNumber}</div>
                                <div className="text-[10px] text-slate-500 font-normal">{item.name}</div>
                              </td>
                              <td className="text-cyan-400 font-semibold">${item.fuelCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                              <td className="text-amber-500 font-semibold">${item.maintenanceCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                              <td className="text-violet-400 font-semibold">${item.expenseCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                              <td className="text-right text-sm font-bold ledger-total-cost">${item.totalCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Fuel Logs View */}
                {activeTab === 'fuel' && (
                  <div className="table-wrapper border-slate-850">
                    {fuelLogs.length > 0 ? (
                      <table className="data-table text-xs">
                        <thead>
                          <tr>
                            <th>Log ID</th>
                            <th>Vehicle</th>
                            <th>Fuel Quantity</th>
                            <th>Refuel Cost</th>
                            <th>Log Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fuelLogs.map(log => (
                            <tr key={log.id}>
                              <td className="font-mono text-slate-400">#{log.id.substring(3)}</td>
                              <td className="font-bold text-cyan-400">{getVehicleReg(log.vehicleId)}</td>
                              <td>{log.liters} Liters</td>
                              <td className="font-semibold text-slate-200">${Number(log.cost).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                              <td>
                                <div className="flex items-center gap-1 text-slate-400">
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span>{log.date}</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center py-12 text-slate-500 italic">No fuel purchases logged.</div>
                    )}
                  </div>
                )}

                {/* Expenses View */}
                {activeTab === 'expenses' && (
                  <div className="table-wrapper border-slate-850">
                    {expenses.length > 0 ? (
                      <table className="data-table text-xs">
                        <thead>
                          <tr>
                            <th>Log ID</th>
                            <th>Vehicle</th>
                            <th>Expense Type</th>
                            <th>Amount</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expenses.map(exp => (
                            <tr key={exp.id}>
                              <td className="font-mono text-slate-400">#{exp.id.substring(4)}</td>
                              <td className="font-bold text-cyan-400">{getVehicleReg(exp.vehicleId)}</td>
                              <td>
                                <span className={`badge ${exp.type === 'Toll' ? 'badge-ontrip' : 'badge-draft'}`}>
                                  {exp.type === 'Toll' ? 'Toll Road' : 'Other'}
                                </span>
                              </td>
                              <td className="font-semibold text-slate-200">${Number(exp.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                              <td>
                                <div className="flex items-center gap-1 text-slate-400">
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span>{exp.date}</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center py-12 text-slate-500 italic">No trip expenses logged.</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
