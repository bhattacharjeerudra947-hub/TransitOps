import React, { useState, useEffect } from 'react';
import { tripsApi, vehiclesApi, driversApi } from '../../api/api';
import { canAssignVehicle, canAssignDriver, isWithinLoadCapacity, SYSTEM_DATE } from '../../utils/rules';
import { Plus, Play, CheckSquare, Trash2, X, Info, MapPin, Truck, User, ArrowRight, DollarSign } from 'lucide-react';

export default function TripsList() {
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);

  // New Trip Form state
  const [newTripData, setNewTripData] = useState({
    source: '',
    destination: '',
    vehicleId: '',
    driverId: '',
    cargoWeightKg: '',
    plannedDistanceKm: '',
    revenue: '',
    status: 'Draft'
  });
  
  // Complete Trip Form state
  const [completionData, setCompletionData] = useState({
    actualDistanceKm: '',
    fuelConsumed: '',
    fuelCost: ''
  });

  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const [t, v, d] = await Promise.all([
        tripsApi.getAll(),
        vehiclesApi.getAll(),
        driversApi.getAll()
      ]);
      setTrips(t);
      setVehicles(v);
      setDrivers(d);
    } catch (err) {
      console.error('Failed to load trips data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setNewTripData({
      source: '',
      destination: '',
      vehicleId: '',
      driverId: '',
      cargoWeightKg: '',
      plannedDistanceKm: '',
      revenue: '',
      status: 'Draft'
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    const selectedVehicle = vehicles.find(v => v.id === newTripData.vehicleId);
    
    // Cargo load validation (Rule #5)
    if (selectedVehicle && !isWithinLoadCapacity(newTripData.cargoWeightKg, selectedVehicle)) {
      setFormError(`Cargo weight exceeds vehicle's max capacity (${selectedVehicle.maxLoadKg} kg).`);
      setSaving(false);
      return;
    }

    try {
      await tripsApi.create(newTripData);
      await loadData();
      setIsCreateModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to create trip.');
    } finally {
      setSaving(false);
    }
  };

  const handleDispatch = async (id) => {
    try {
      await tripsApi.dispatch(id);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to dispatch trip.');
    }
  };

  const openCompleteModal = (trip) => {
    setSelectedTrip(trip);
    setCompletionData({
      actualDistanceKm: trip.plannedDistanceKm.toString(),
      fuelConsumed: '',
      fuelCost: ''
    });
    setFormError('');
    setIsCompleteModalOpen(true);
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    try {
      await tripsApi.complete(selectedTrip.id, completionData);
      await loadData();
      setIsCompleteModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to complete trip.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm('Are you sure you want to cancel this trip? This restores the vehicle and driver back to Available.')) {
      try {
        await tripsApi.cancel(id);
        await loadData();
      } catch (err) {
        alert(err.message || 'Failed to cancel trip.');
      }
    }
  };

  // Filter vehicles dropdown (only display Available)
  // EXCEPT when editing, but here we only create.
  const eligibleVehicles = vehicles.filter(canAssignVehicle);

  // Filter drivers dropdown (only display Available and license not expired)
  const eligibleDrivers = drivers.filter(canAssignDriver);

  // Group trips by status
  const columns = {
    Draft: trips.filter(t => t.status === 'Draft'),
    Dispatched: trips.filter(t => t.status === 'Dispatched'),
    Completed: trips.filter(t => t.status === 'Completed'),
    Cancelled: trips.filter(t => t.status === 'Cancelled')
  };

  const getVehicleLabel = (vehId) => {
    const v = vehicles.find(veh => veh.id === vehId);
    return v ? `${v.regNumber} (${v.name})` : 'Unknown Vehicle';
  };

  const getDriverLabel = (drvId) => {
    const d = drivers.find(drv => drv.id === drvId);
    return d ? d.name : 'Unknown Driver';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Trip Dispatch Control Board</h2>
          <p className="text-slate-400 text-sm">Schedule and monitor active deliveries across the region</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus className="h-4.5 w-4.5" />
          <span>New Dispatch Wizard</span>
        </button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-cyan-400">
          <div className="pulse-dot mr-2"></div>
          <span>Loading Kanban board...</span>
        </div>
      ) : (
        <div className="kanban-board">
          {/* Draft Column */}
          <div className="kanban-column">
            <div className="kanban-column-header">
              <h4>Drafts</h4>
              <span className="kanban-count">{columns.Draft.length}</span>
            </div>
            <div className="kanban-cards">
              {columns.Draft.map(trip => (
                <div key={trip.id} className="kanban-card">
                  <div className="kanban-card-title">
                    <span className="flex items-center gap-1 text-slate-300">
                      <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                      {trip.source.split(' ')[0]} → {trip.destination.split(' ')[0]}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">#{trip.id.substring(4)}</span>
                  </div>
                  <div className="kanban-card-detail flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5" />
                    <span>{getVehicleLabel(trip.vehicleId)}</span>
                  </div>
                  <div className="kanban-card-detail flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    <span>{getDriverLabel(trip.driverId)}</span>
                  </div>
                  <div className="kanban-card-detail mt-2 pt-2 border-t border-slate-800 flex justify-between text-slate-400">
                    <span>Load: {trip.cargoWeightKg} kg</span>
                    <span>Dist: {trip.plannedDistanceKm} km</span>
                  </div>
                  
                  <div className="kanban-card-actions">
                    <button 
                      className="btn btn-secondary py-1 px-2.5 text-xs text-red-400 hover:bg-red-950/20"
                      onClick={() => handleCancel(trip.id)}
                    >
                      Delete
                    </button>
                    <button 
                      className="btn btn-primary py-1 px-2.5 text-xs flex items-center gap-1"
                      onClick={() => handleDispatch(trip.id)}
                    >
                      <Play className="h-3 w-3 fill-slate-900" />
                      <span>Dispatch</span>
                    </button>
                  </div>
                </div>
              ))}
              {columns.Draft.length === 0 && (
                <div className="text-center text-xs text-slate-500 italic py-6">No draft trips.</div>
              )}
            </div>
          </div>

          {/* Dispatched Column */}
          <div className="kanban-column" style={{ borderColor: 'rgba(59, 130, 246, 0.2)' }}>
            <div className="kanban-column-header text-blue-400">
              <h4>Dispatched</h4>
              <span className="kanban-count bg-blue-900/30 text-blue-400 border border-blue-800/40">{columns.Dispatched.length}</span>
            </div>
            <div className="kanban-cards">
              {columns.Dispatched.map(trip => (
                <div key={trip.id} className="kanban-card" style={{ borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                  <div className="kanban-card-title text-blue-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {trip.source.split(' ')[0]} → {trip.destination.split(' ')[0]}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">#{trip.id.substring(4)}</span>
                  </div>
                  <div className="kanban-card-detail flex items-center gap-1.5 text-slate-300">
                    <Truck className="h-3.5 w-3.5 text-blue-400" />
                    <span>{getVehicleLabel(trip.vehicleId)}</span>
                  </div>
                  <div className="kanban-card-detail flex items-center gap-1.5 text-slate-300">
                    <User className="h-3.5 w-3.5 text-blue-400" />
                    <span>{getDriverLabel(trip.driverId)}</span>
                  </div>
                  <div className="kanban-card-detail mt-2 pt-2 border-t border-slate-800 flex justify-between text-slate-400">
                    <span>Load: {trip.cargoWeightKg} kg</span>
                    <span>Dist: {trip.plannedDistanceKm} km</span>
                  </div>

                  <div className="kanban-card-actions">
                    <button 
                      className="btn btn-secondary py-1 px-2.5 text-xs text-red-400 hover:bg-red-950/20"
                      onClick={() => handleCancel(trip.id)}
                    >
                      Cancel
                    </button>
                    <button 
                      className="btn btn-primary py-1 px-2.5 text-xs flex items-center gap-1"
                      style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                      onClick={() => openCompleteModal(trip)}
                    >
                      <CheckSquare className="h-3 w-3" />
                      <span>Complete</span>
                    </button>
                  </div>
                </div>
              ))}
              {columns.Dispatched.length === 0 && (
                <div className="text-center text-xs text-slate-500 italic py-6">No dispatched vehicles.</div>
              )}
            </div>
          </div>

          {/* Completed Column */}
          <div className="kanban-column" style={{ borderColor: 'rgba(16, 185, 129, 0.2)' }}>
            <div className="kanban-column-header text-emerald-400">
              <h4>Completed</h4>
              <span className="kanban-count bg-emerald-900/30 text-emerald-400 border border-emerald-800/40">{columns.Completed.length}</span>
            </div>
            <div className="kanban-cards">
              {columns.Completed.map(trip => (
                <div key={trip.id} className="kanban-card opacity-80" style={{ borderColor: 'rgba(16, 185, 129, 0.15)' }}>
                  <div className="kanban-card-title text-emerald-400">
                    <span>{trip.source.split(' ')[0]} → {trip.destination.split(' ')[0]}</span>
                    <span className="text-[10px] font-mono text-slate-500">#{trip.id.substring(4)}</span>
                  </div>
                  <div className="kanban-card-detail text-xs">
                    <div className="mb-1">Vehicle: {getVehicleLabel(trip.vehicleId)}</div>
                    <div>Driver: {getDriverLabel(trip.driverId)}</div>
                  </div>
                  <div className="kanban-card-detail mt-2 pt-2 border-t border-slate-800 text-[10px] space-y-1 text-slate-400">
                    <div className="flex justify-between">
                      <span>Actual Dist: {trip.actualDistanceKm} km</span>
                      <span>Revenue: ${trip.revenue}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fuel Consumed: {trip.fuelConsumed} L</span>
                      <span>Date: {trip.completedAt?.substring(0, 10)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {columns.Completed.length === 0 && (
                <div className="text-center text-xs text-slate-500 italic py-6">No completed trips.</div>
              )}
            </div>
          </div>

          {/* Cancelled Column */}
          <div className="kanban-column" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
            <div className="kanban-column-header text-red-400">
              <h4>Cancelled</h4>
              <span className="kanban-count bg-red-900/30 text-red-400 border border-red-800/40">{columns.Cancelled.length}</span>
            </div>
            <div className="kanban-cards">
              {columns.Cancelled.map(trip => (
                <div key={trip.id} className="kanban-card opacity-50" style={{ borderColor: 'rgba(239, 68, 68, 0.1)' }}>
                  <div className="kanban-card-title text-red-400">
                    <span>{trip.source.split(' ')[0]} → {trip.destination.split(' ')[0]}</span>
                    <span className="text-[10px] font-mono text-slate-500">#{trip.id.substring(4)}</span>
                  </div>
                  <div className="kanban-card-detail text-xs">
                    <div className="mb-1">Vehicle: {getVehicleLabel(trip.vehicleId)}</div>
                    <div>Driver: {getDriverLabel(trip.driverId)}</div>
                  </div>
                  <div className="kanban-card-detail mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-500 text-center">
                    Trip Cancelled / Aborted
                  </div>
                </div>
              ))}
              {columns.Cancelled.length === 0 && (
                <div className="text-center text-xs text-slate-500 italic py-6">No cancelled trips.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Trip Wizard Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>New Dispatch Wizard</h3>
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label htmlFor="source">Source Address*</label>
                    <input
                      type="text"
                      id="source"
                      className="input-field"
                      placeholder="e.g. Warehouse A"
                      value={newTripData.source}
                      onChange={e => setNewTripData(prev => ({ ...prev, source: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="destination">Destination Address*</label>
                    <input
                      type="text"
                      id="destination"
                      className="input-field"
                      placeholder="e.g. Distribution Center 1"
                      value={newTripData.destination}
                      onChange={e => setNewTripData(prev => ({ ...prev, destination: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="vehicleId">Assign Vehicle (Available Only)*</label>
                  <select
                    id="vehicleId"
                    className="select-field"
                    value={newTripData.vehicleId}
                    onChange={e => setNewTripData(prev => ({ ...prev, vehicleId: e.target.value }))}
                    required
                  >
                    <option value="">Select a vehicle...</option>
                    {eligibleVehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.regNumber} - {v.name} (Max Load: {v.maxLoadKg}kg)
                      </option>
                    ))}
                  </select>
                  {eligibleVehicles.length === 0 && (
                    <span className="text-[10px] text-red-400 mt-1">
                      No vehicles are currently Available. Clear maintenance logs or finish active trips to restore vehicles.
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="driverId">Assign Driver (Available & Compliant Only)*</label>
                  <select
                    id="driverId"
                    className="select-field"
                    value={newTripData.driverId}
                    onChange={e => setNewTripData(prev => ({ ...prev, driverId: e.target.value }))}
                    required
                  >
                    <option value="">Select a driver...</option>
                    {eligibleDrivers.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} (Lic: {d.licenseCategory}, Score: {d.safetyScore})
                      </option>
                    ))}
                  </select>
                  {eligibleDrivers.length === 0 && (
                    <span className="text-[10px] text-red-400 mt-1">
                      No drivers are currently Available. Ensure licenses are valid and status is active.
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label htmlFor="cargoWeightKg">Cargo Weight (kg)*</label>
                    <input
                      type="number"
                      id="cargoWeightKg"
                      className="input-field"
                      placeholder="e.g. 500"
                      min="1"
                      value={newTripData.cargoWeightKg}
                      onChange={e => setNewTripData(prev => ({ ...prev, cargoWeightKg: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="plannedDistanceKm">Planned Distance (km)*</label>
                    <input
                      type="number"
                      id="plannedDistanceKm"
                      className="input-field"
                      placeholder="e.g. 150"
                      min="1"
                      value={newTripData.plannedDistanceKm}
                      onChange={e => setNewTripData(prev => ({ ...prev, plannedDistanceKm: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label htmlFor="revenue">Trip Revenue ($)</label>
                    <input
                      type="number"
                      id="revenue"
                      className="input-field"
                      placeholder="Auto-calculated if blank"
                      min="1"
                      value={newTripData.revenue}
                      onChange={e => setNewTripData(prev => ({ ...prev, revenue: e.target.value }))}
                    />
                    <span className="text-[10px] text-slate-500 mt-1">Leave empty to auto-price trip.</span>
                  </div>

                  <div className="form-group">
                    <label htmlFor="status">Initial Status*</label>
                    <select
                      id="status"
                      className="select-field"
                      value={newTripData.status}
                      onChange={e => setNewTripData(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="Draft">Draft (Plan Only)</option>
                      <option value="Dispatched">Dispatched (Deploy Fleet)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Trip Modal */}
      {isCompleteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Complete Delivery Dispatch</h3>
              <button className="modal-close-btn" onClick={() => setIsCompleteModalOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="flex items-center gap-2 mb-4 p-3 rounded bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
                    <Info className="h-4 w-4 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg mb-4 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Route:</span>
                    <span className="font-semibold text-slate-200">{selectedTrip?.source} → {selectedTrip?.destination}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vehicle:</span>
                    <span className="font-semibold text-slate-200">{getVehicleLabel(selectedTrip?.vehicleId)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Driver:</span>
                    <span className="font-semibold text-slate-200">{getDriverLabel(selectedTrip?.driverId)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Planned Distance:</span>
                    <span className="font-semibold text-slate-200">{selectedTrip?.plannedDistanceKm} km</span>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="actualDistanceKm">Actual Distance Travelled (km)*</label>
                  <input
                    type="number"
                    id="actualDistanceKm"
                    className="input-field"
                    placeholder="e.g. 155"
                    min="1"
                    value={completionData.actualDistanceKm}
                    onChange={e => setCompletionData(prev => ({ ...prev, actualDistanceKm: e.target.value }))}
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-1">Vehicle odometer will be updated by this amount.</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label htmlFor="fuelConsumed">Fuel Consumed (Liters)*</label>
                    <input
                      type="number"
                      id="fuelConsumed"
                      className="input-field"
                      placeholder="e.g. 18.5"
                      min="0.1"
                      step="0.01"
                      value={completionData.fuelConsumed}
                      onChange={e => setCompletionData(prev => ({ ...prev, fuelConsumed: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="fuelCost">Fuel Cost ($)</label>
                    <input
                      type="number"
                      id="fuelCost"
                      className="input-field"
                      placeholder="Auto-calculated if blank"
                      min="0.1"
                      step="0.01"
                      value={completionData.fuelCost}
                      onChange={e => setCompletionData(prev => ({ ...prev, fuelCost: e.target.value }))}
                    />
                    <span className="text-[10px] text-slate-500 mt-1">Used to log fuel expenses.</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCompleteModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Completing...' : 'Complete Delivery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
