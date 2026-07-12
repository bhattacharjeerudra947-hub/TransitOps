import React, { useState, useEffect } from 'react';
import { vehiclesApi } from '../../api/api';
import { Search, Plus, Edit2, Archive, X, Info } from 'lucide-react';

const REGIONS = ['North', 'South', 'East', 'West'];
const TYPES = ['Van', 'Truck', 'Semi-Trailer', 'Box Truck'];
const STATUSES = ['Available', 'In Shop', 'Retired']; // Active trips are locked to 'On Trip'

export default function VehiclesList() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    regNumber: '',
    name: '',
    type: 'Van',
    maxLoadKg: '',
    odometer: '',
    acquisitionCost: '',
    region: 'North',
    status: 'Available'
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchVehicles = async () => {
    try {
      const data = await vehiclesApi.getAll();
      setVehicles(data);
    } catch (err) {
      console.error('Failed to load vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({
      regNumber: '',
      name: '',
      type: 'Van',
      maxLoadKg: '',
      odometer: '',
      acquisitionCost: '',
      region: 'North',
      status: 'Available'
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (vehicle) => {
    setModalMode('edit');
    setSelectedVehicleId(vehicle.id);
    setFormData({
      regNumber: vehicle.regNumber,
      name: vehicle.name,
      type: vehicle.type,
      maxLoadKg: vehicle.maxLoadKg,
      odometer: vehicle.odometer,
      acquisitionCost: vehicle.acquisitionCost,
      region: vehicle.region || 'North',
      status: vehicle.status
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    try {
      if (modalMode === 'create') {
        await vehiclesApi.create(formData);
      } else {
        await vehiclesApi.update(selectedVehicleId, formData);
      }
      await fetchVehicles();
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const handleRetire = async (id) => {
    if (window.confirm('Are you sure you want to retire this vehicle? Retired vehicles cannot be dispatched on trips.')) {
      try {
        await vehiclesApi.retire(id);
        await fetchVehicles();
      } catch (err) {
        alert(err.message || 'Failed to retire vehicle.');
      }
    }
  };

  // Filter and search computation
  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = v.regNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          v.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Available': return 'badge-available';
      case 'On Trip': return 'badge-ontrip';
      case 'In Shop': return 'badge-inshop';
      case 'Retired': return 'badge-retired';
      default: return 'badge-draft';
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Vehicle Registry</h2>
          <p className="text-slate-400 text-sm">Manage fleet assets, configurations, and active statuses</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus className="h-4.5 w-4.5" />
          <span>Add Vehicle</span>
        </button>
      </div>

      {/* Search & Filter bar */}
      <div className="search-container card py-4 px-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex-1 min-w-[280px] relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="h-4.5 w-4.5" />
          </span>
          <input
            type="text"
            placeholder="Search by registration number or name..."
            className="input-field pl-10 w-full"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="select-field py-2 px-3 text-sm bg-slate-900 border-slate-800"
          >
            <option value="All">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="In Shop">In Shop</option>
            <option value="Retired">Retired</option>
          </select>
        </div>
      </div>

      {/* Datatable */}
      {loading ? (
        <div className="flex h-48 items-center justify-center text-cyan-400">
          <div className="pulse-dot mr-2"></div>
          <span>Loading vehicles...</span>
        </div>
      ) : filteredVehicles.length > 0 ? (
        <div className="table-wrapper card p-0 overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reg Number</th>
                <th>Name / Details</th>
                <th>Type</th>
                <th>Region</th>
                <th>Max Load (kg)</th>
                <th>Odometer (km)</th>
                <th>Purchase Cost</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map(vehicle => (
                <tr key={vehicle.id}>
                  <td className="font-bold text-cyan-400">{vehicle.regNumber}</td>
                  <td>
                    <div className="font-semibold">{vehicle.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">ID: {vehicle.id}</div>
                  </td>
                  <td>{vehicle.type}</td>
                  <td>{vehicle.region || 'North'}</td>
                  <td>{Number(vehicle.maxLoadKg).toLocaleString()}</td>
                  <td>{Number(vehicle.odometer).toLocaleString()}</td>
                  <td>${Number(vehicle.acquisitionCost).toLocaleString()}</td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(vehicle.status)}`}>
                      {vehicle.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex justify-end gap-2">
                      <button 
                        className="btn btn-secondary p-2 text-slate-400 hover:text-white" 
                        onClick={() => openEditModal(vehicle)}
                        title="Edit Vehicle"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {vehicle.status !== 'Retired' && vehicle.status !== 'On Trip' && (
                        <button 
                          className="btn btn-danger p-2" 
                          onClick={() => handleRetire(vehicle.id)}
                          title="Retire Vehicle"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card text-center py-12 text-slate-400 italic">
          No vehicles matching search criteria.
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{modalMode === 'create' ? 'Add New Vehicle' : 'Edit Vehicle Details'}</h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="flex items-center gap-2 mb-4 p-3 rounded bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
                    <Info className="h-4 w-4 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group col-span-1">
                    <label htmlFor="regNumber">Registration Number*</label>
                    <input
                      type="text"
                      id="regNumber"
                      name="regNumber"
                      className="input-field"
                      placeholder="e.g. VAN-05"
                      value={formData.regNumber}
                      onChange={handleInputChange}
                      required
                      disabled={modalMode === 'edit'} // Lock regNumber on edit
                    />
                  </div>

                  <div className="form-group col-span-1">
                    <label htmlFor="name">Vehicle Name*</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      className="input-field"
                      placeholder="e.g. Mercedes Sprinter"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label htmlFor="type">Vehicle Type*</label>
                    <select
                      id="type"
                      name="type"
                      className="select-field"
                      value={formData.type}
                      onChange={handleInputChange}
                    >
                      {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="region">Operational Region*</label>
                    <select
                      id="region"
                      name="region"
                      className="select-field"
                      value={formData.region}
                      onChange={handleInputChange}
                    >
                      {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="form-group">
                    <label htmlFor="maxLoadKg">Max Load (kg)*</label>
                    <input
                      type="number"
                      id="maxLoadKg"
                      name="maxLoadKg"
                      className="input-field"
                      placeholder="e.g. 1200"
                      value={formData.maxLoadKg}
                      onChange={handleInputChange}
                      min="1"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="odometer">Odometer (km)*</label>
                    <input
                      type="number"
                      id="odometer"
                      name="odometer"
                      className="input-field"
                      placeholder="e.g. 52000"
                      value={formData.odometer}
                      onChange={handleInputChange}
                      min="0"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="acquisitionCost">Cost ($)*</label>
                    <input
                      type="number"
                      id="acquisitionCost"
                      name="acquisitionCost"
                      className="input-field"
                      placeholder="e.g. 32000"
                      value={formData.acquisitionCost}
                      onChange={handleInputChange}
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="status">Fleet Status*</label>
                  <select
                    id="status"
                    name="status"
                    className="select-field"
                    value={formData.status}
                    onChange={handleInputChange}
                    disabled={formData.status === 'On Trip'} // Cannot manually toggle On Trip
                  >
                    {formData.status === 'On Trip' && <option value="On Trip">On Trip (Locked)</option>}
                    <option value="Available">Available</option>
                    <option value="In Shop">In Shop</option>
                    <option value="Retired">Retired</option>
                  </select>
                  {formData.status === 'On Trip' && (
                    <span className="text-[10px] text-amber-400 mt-1">
                      Status is locked while the vehicle is dispatched on a trip.
                    </span>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
