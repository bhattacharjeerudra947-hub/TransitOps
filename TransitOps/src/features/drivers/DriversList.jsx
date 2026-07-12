import React, { useState, useEffect } from 'react';
import { driversApi } from '../../api/api';
import { isLicenseExpired, isLicenseExpiringSoon, SYSTEM_DATE } from '../../utils/rules';
import { Search, Plus, Edit2, ShieldAlert, X, Info, Phone, Calendar, AlertTriangle } from 'lucide-react';

const CATEGORIES = ['Standard Class C', 'Commercial Class A', 'Commercial Class B'];
const STATUSES = ['Available', 'Off Duty', 'Suspended'];

export default function DriversList() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedDriverId, setSelectedDriverId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    licenseNumber: '',
    licenseCategory: 'Commercial Class A',
    licenseExpiryDate: '',
    contactNumber: '',
    safetyScore: '100',
    status: 'Available'
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchDrivers = async () => {
    try {
      const data = await driversApi.getAll();
      setDrivers(data);
    } catch (err) {
      console.error('Failed to load drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({
      name: '',
      licenseNumber: '',
      licenseCategory: 'Commercial Class A',
      licenseExpiryDate: '',
      contactNumber: '',
      safetyScore: '100',
      status: 'Available'
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (driver) => {
    setModalMode('edit');
    setSelectedDriverId(driver.id);
    setFormData({
      name: driver.name,
      licenseNumber: driver.licenseNumber,
      licenseCategory: driver.licenseCategory,
      licenseExpiryDate: driver.licenseExpiryDate,
      contactNumber: driver.contactNumber,
      safetyScore: driver.safetyScore.toString(),
      status: driver.status
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
        await driversApi.create(formData);
      } else {
        await driversApi.update(selectedDriverId, formData);
      }
      await fetchDrivers();
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = async (driver, newStatus) => {
    try {
      const updateData = { ...driver, status: newStatus };
      await driversApi.update(driver.id, updateData);
      await fetchDrivers();
    } catch (err) {
      alert(err.message || 'Failed to update driver status.');
    }
  };

  // Filter and search
  const filteredDrivers = drivers.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          d.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Available': return 'badge-available';
      case 'On Trip': return 'badge-ontrip';
      case 'Off Duty': return 'badge-draft';
      case 'Suspended': return 'badge-suspended';
      default: return 'badge-draft';
    }
  };

  const getSafetyScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 75) return 'text-amber-400';
    return 'text-red-400 font-bold';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Driver Management</h2>
          <p className="text-slate-400 text-sm">Monitor licensing compliance, safety parameters, and shift states</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus className="h-4.5 w-4.5" />
          <span>Add Driver</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="search-container card py-4 px-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex-1 min-w-[280px] relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="h-4.5 w-4.5" />
          </span>
          <input
            type="text"
            placeholder="Search by driver name or license number..."
            className="input-field pl-10 w-full"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Duty status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="select-field py-2 px-3 text-sm bg-slate-900 border-slate-800"
          >
            <option value="All">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="Off Duty">Off Duty</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Datatable */}
      {loading ? (
        <div className="flex h-48 items-center justify-center text-cyan-400">
          <div className="pulse-dot mr-2"></div>
          <span>Loading drivers...</span>
        </div>
      ) : filteredDrivers.length > 0 ? (
        <div className="table-wrapper card p-0 overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Driver Name</th>
                <th>License Info</th>
                <th>Expiration Date</th>
                <th>Contact</th>
                <th>Safety Score</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Duty Controls</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map(driver => {
                const expired = isLicenseExpired(driver.licenseExpiryDate);
                const expiringSoon = isLicenseExpiringSoon(driver.licenseExpiryDate);

                return (
                  <tr key={driver.id}>
                    <td>
                      <div className="font-semibold text-slate-200">{driver.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">ID: {driver.id}</div>
                    </td>
                    <td>
                      <div className="font-semibold">{driver.licenseNumber}</div>
                      <div className="text-xs text-slate-400">{driver.licenseCategory}</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span className={expired ? 'text-red-400 font-bold' : expiringSoon ? 'text-amber-400 font-semibold' : ''}>
                          {driver.licenseExpiryDate}
                        </span>
                        {expired && (
                          <span className="flex items-center gap-0.5 text-[9px] font-bold text-red-500 bg-red-950/20 border border-red-900/30 rounded px-1 py-0.5">
                            <ShieldAlert className="h-3 w-3" /> EXPIRED
                          </span>
                        )}
                        {!expired && expiringSoon && (
                          <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-500 bg-amber-950/20 border border-amber-900/30 rounded px-1 py-0.5">
                            <AlertTriangle className="h-3 w-3" /> EXPIRING
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-slate-300 text-xs">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span>{driver.contactNumber}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`font-bold ${getSafetyScoreColor(driver.safetyScore)}`}>
                        {driver.safetyScore} / 100
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(driver.status)}`}>
                        {driver.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex justify-end items-center gap-2">
                        <button 
                          className="btn btn-secondary p-2 text-slate-400 hover:text-white" 
                          onClick={() => openEditModal(driver)}
                          title="Edit Driver Details"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        
                        {driver.status !== 'On Trip' && (
                          <div className="flex gap-1.5">
                            {driver.status !== 'Suspended' ? (
                              <>
                                <button 
                                  className="btn btn-secondary py-1 px-2 text-xs text-amber-400 hover:bg-amber-950/20"
                                  onClick={() => handleStatusToggle(driver, driver.status === 'Available' ? 'Off Duty' : 'Available')}
                                  title="Toggle Duty state"
                                >
                                  {driver.status === 'Available' ? 'Go Off Duty' : 'Go On Duty'}
                                </button>
                                <button 
                                  className="btn btn-danger py-1 px-2 text-xs"
                                  onClick={() => handleStatusToggle(driver, 'Suspended')}
                                  title="Suspend Driver"
                                >
                                  Suspend
                                </button>
                              </>
                            ) : (
                              <button 
                                className="btn btn-primary py-1 px-2 text-xs"
                                onClick={() => handleStatusToggle(driver, 'Available')}
                                title="Reactivate Driver"
                              >
                                Activate
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card text-center py-12 text-slate-400 italic">
          No drivers matching search criteria.
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{modalMode === 'create' ? 'Register New Driver' : 'Edit Driver Profile'}</h3>
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
                    <label htmlFor="name">Full Name*</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      className="input-field"
                      placeholder="e.g. Johnathan Doe"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group col-span-1">
                    <label htmlFor="contactNumber">Contact Phone*</label>
                    <input
                      type="text"
                      id="contactNumber"
                      name="contactNumber"
                      className="input-field"
                      placeholder="e.g. 555-0100"
                      value={formData.contactNumber}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group col-span-1">
                    <label htmlFor="licenseNumber">License Number*</label>
                    <input
                      type="text"
                      id="licenseNumber"
                      name="licenseNumber"
                      className="input-field"
                      placeholder="e.g. DL-12345"
                      value={formData.licenseNumber}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group col-span-1">
                    <label htmlFor="licenseCategory">License Category*</label>
                    <select
                      id="licenseCategory"
                      name="licenseCategory"
                      className="select-field"
                      value={formData.licenseCategory}
                      onChange={handleInputChange}
                    >
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group col-span-1">
                    <label htmlFor="licenseExpiryDate">License Expiration Date*</label>
                    <input
                      type="date"
                      id="licenseExpiryDate"
                      name="licenseExpiryDate"
                      className="input-field text-slate-200"
                      value={formData.licenseExpiryDate}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group col-span-1">
                    <label htmlFor="safetyScore">Safety Score (0-100)*</label>
                    <input
                      type="number"
                      id="safetyScore"
                      name="safetyScore"
                      className="input-field"
                      min="0"
                      max="100"
                      value={formData.safetyScore}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="status">Duty Status*</label>
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
                    <option value="Off Duty">Off Duty</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                  {formData.status === 'On Trip' && (
                    <span className="text-[10px] text-amber-400 mt-1">
                      Status is locked while the driver is dispatched on an active delivery.
                    </span>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Registering...' : 'Save Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
