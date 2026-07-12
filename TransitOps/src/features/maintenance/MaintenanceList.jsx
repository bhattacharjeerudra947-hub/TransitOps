import React, { useState, useEffect } from 'react';
import { maintenanceApi, vehiclesApi } from '../../api/api';
import { Plus, CheckCircle, Wrench, X, Info, Calendar, AlertCircle } from 'lucide-react';
import { SYSTEM_DATE } from '../../utils/rules';

export default function MaintenanceList() {
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    vehicleId: '',
    type: '',
    description: '',
    cost: ''
  });

  const [closeData, setCloseData] = useState({
    cost: '',
    description: ''
  });

  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const [m, v] = await Promise.all([
        maintenanceApi.getAll(),
        vehiclesApi.getAll()
      ]);
      setLogs(m);
      setVehicles(v);
    } catch (err) {
      console.error('Failed to load maintenance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setFormData({
      vehicleId: '',
      type: 'Oil Change',
      description: '',
      cost: ''
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    try {
      await maintenanceApi.create(formData);
      await loadData();
      setIsCreateModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to open maintenance log.');
    } finally {
      setSaving(false);
    }
  };

  const openCloseModal = (log) => {
    setSelectedLog(log);
    setCloseData({
      cost: log.cost.toString(),
      description: log.description
    });
    setFormError('');
    setIsCloseModalOpen(true);
  };

  const handleCloseSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    try {
      await maintenanceApi.close(selectedLog.id, closeData);
      await loadData();
      setIsCloseModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to close maintenance log.');
    } finally {
      setSaving(false);
    }
  };

  const getVehicleLabel = (vehId) => {
    const v = vehicles.find(veh => veh.id === vehId);
    return v ? `${v.regNumber} - ${v.name}` : 'Unknown Vehicle';
  };

  const getVehicleStatus = (vehId) => {
    const v = vehicles.find(veh => veh.id === vehId);
    return v ? v.status : '';
  };

  // Filter out retired vehicles for new logs
  const eligibleVehicles = vehicles.filter(v => v.status !== 'Retired' && v.status !== 'On Trip');

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Maintenance Workflows</h2>
          <p className="text-slate-400 text-sm">Schedule repairs, track mechanical logs, and manage workshop schedules</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus className="h-4.5 w-4.5" />
          <span>Open Shop Log</span>
        </button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-cyan-400">
          <div className="pulse-dot mr-2"></div>
          <span>Loading logs...</span>
        </div>
      ) : logs.length > 0 ? (
        <div className="table-wrapper card p-0 overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Type / Job</th>
                <th>Description</th>
                <th>Estimate Cost</th>
                <th>Opened Date</th>
                <th>Closed Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const isOpened = log.status === 'Active';
                const vStatus = getVehicleStatus(log.vehicleId);

                return (
                  <tr key={log.id}>
                    <td className="font-bold text-cyan-400">
                      {getVehicleLabel(log.vehicleId)}
                      {isOpened && vStatus !== 'In Shop' && (
                        <div className="text-[10px] text-amber-400 font-normal mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Vehicle status sync conflict
                        </div>
                      )}
                    </td>
                    <td className="font-semibold text-slate-200">{log.type}</td>
                    <td className="max-w-xs truncate" title={log.description}>{log.description || 'No notes added'}</td>
                    <td>${Number(log.cost).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{log.openedAt?.substring(0, 10) || SYSTEM_DATE}</span>
                      </div>
                    </td>
                    <td>
                      {log.closedAt ? (
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{log.closedAt.substring(0, 10)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-xs">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${isOpened ? 'badge-inshop' : 'badge-completed'}`}>
                        {isOpened ? 'Active Repair' : 'Closed'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {isOpened && (
                        <button 
                          className="btn btn-primary py-1 px-3 text-xs flex items-center gap-1"
                          onClick={() => openCloseModal(log)}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Close Log</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card text-center py-12 text-slate-400 italic">
          No maintenance logs recorded yet.
        </div>
      )}

      {/* Open Log Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Open Maintenance Shop Record</h3>
              <button className="modal-close-btn" onClick={() => setIsCreateModalOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="flex items-center gap-2 mb-4 p-3 rounded bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
                    <Info className="h-4 w-4 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="vehicleId">Select Vehicle (Active/Available only)*</label>
                  <select
                    id="vehicleId"
                    className="select-field"
                    value={formData.vehicleId}
                    onChange={e => setFormData(prev => ({ ...prev, vehicleId: e.target.value }))}
                    required
                  >
                    <option value="">Choose a vehicle to send to workshop...</option>
                    {eligibleVehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.regNumber} - {v.name} (Status: {v.status})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-amber-400 mt-1">
                    Warning: Sending a vehicle to the shop changes its status to 'In Shop' and disables it from trip dispatches.
                  </span>
                  {eligibleVehicles.length === 0 && (
                    <span className="text-[10px] text-red-400 mt-1 block font-semibold">
                      No vehicles are eligible. Vehicles must not be On Trip or Retired.
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label htmlFor="type">Service/Repair Type*</label>
                    <select
                      id="type"
                      className="select-field"
                      value={formData.type}
                      onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
                      required
                    >
                      <option value="Oil Change">Oil Change</option>
                      <option value="Tire Replacement">Tire Replacement</option>
                      <option value="Brake Service">Brake Service</option>
                      <option value="Engine Overhaul">Engine Overhaul</option>
                      <option value="Body Repair">Body Repair</option>
                      <option value="Other Diagnostics">Other Diagnostics</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="cost">Estimated Cost ($)*</label>
                    <input
                      type="number"
                      id="cost"
                      className="input-field"
                      placeholder="e.g. 500"
                      min="1"
                      value={formData.cost}
                      onChange={e => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="description">Job Description / Mechanical Notes</label>
                  <textarea
                    id="description"
                    className="input-field min-h-[80px]"
                    placeholder="Enter mechanical details, identified faults, or replacement descriptions..."
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving || !formData.vehicleId}>
                  {saving ? 'Opening...' : 'Send to Shop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Log Modal */}
      {isCloseModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Close Workshop Record</h3>
              <button className="modal-close-btn" onClick={() => setIsCloseModalOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCloseSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="flex items-center gap-2 mb-4 p-3 rounded bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
                    <Info className="h-4 w-4 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg mb-4 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vehicle:</span>
                    <span className="font-semibold text-slate-200">{getVehicleLabel(selectedLog?.vehicleId)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Job Type:</span>
                    <span className="font-semibold text-slate-200">{selectedLog?.type}</span>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="finalCost">Final Service Cost ($)*</label>
                  <input
                    type="number"
                    id="finalCost"
                    className="input-field"
                    placeholder="e.g. 520"
                    min="1"
                    value={closeData.cost}
                    onChange={e => setCloseData(prev => ({ ...prev, cost: e.target.value }))}
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-1">
                    Confirm final financial charges to log in operational ledger.
                  </span>
                </div>

                <div className="form-group">
                  <label htmlFor="finalDesc">Final Mechanic Comments*</label>
                  <textarea
                    id="finalDesc"
                    className="input-field min-h-[80px]"
                    placeholder="Describe resolution notes, tested metrics, etc."
                    value={closeData.description}
                    onChange={e => setCloseData(prev => ({ ...prev, description: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCloseModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Closing Record...' : 'Complete Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
