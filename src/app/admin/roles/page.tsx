"use client";

import { useState, useEffect } from 'react';
import { ALL_MODULES } from '@/lib/auth';
import PageHeader from '@/components/ui/PageHeader';
import PageTabs from '@/components/ui/PageTabs';

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [permissions, setPermissions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New Role Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchRoles = async (selectId?: string) => {
    try {
      const res = await fetch('/api/roles');
      if (res.ok) {
        const data = await res.json();
        setRoles(data);

        const currentId = selectId || selectedRoleId || (data.length > 0 ? data[0].id : '');
        setSelectedRoleId(currentId);

        const selectedRole = data.find((r: any) => r.id === currentId);
        if (selectedRole) {
          loadPermissionsMap(selectedRole.permissions);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPermissionsMap = (permsList: any[]) => {
    const map: Record<string, any> = {};
    ALL_MODULES.forEach(mod => {
      const found = permsList?.find((p: any) => p.module === mod);
      map[mod] = {
        can_view: found ? found.can_view : false,
        can_create: found ? found.can_create : false,
        can_edit: found ? found.can_edit : false,
        can_approve: found ? found.can_approve : false,
        can_delete: found ? found.can_delete : false,
        can_export: found ? found.can_export : false
      };
    });
    setPermissions(map);
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleSelectRole = (roleId: string) => {
    setSelectedRoleId(roleId);
    const selectedRole = roles.find(r => r.id === roleId);
    if (selectedRole) {
      loadPermissionsMap(selectedRole.permissions);
    }
  };

  const handlePermissionToggle = (module: string, permKey: string) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [permKey]: !prev[module]?.[permKey]
      }
    }));
  };

  const handleSavePermissions = async () => {
    if (!selectedRoleId) return;
    setSaving(true);

    try {
      const formattedPermissions = Object.entries(permissions).map(([module, perms]) => ({
        module,
        ...perms
      }));

      const res = await fetch(`/api/roles/${selectedRoleId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: formattedPermissions })
      });

      if (res.ok) {
        await fetchRoles(selectedRoleId);
        alert('Permissions saved successfully!');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update permissions');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoleName })
      });

      if (res.ok) {
        const created = await res.json();
        setShowAddModal(false);
        setNewRoleName('');
        await fetchRoles(created.id);
      } else {
        const err = await res.json();
        setModalError(err.error || 'Failed to create role');
      }
    } catch (err: any) {
      setModalError(err.message || 'Error occurred');
    }
  };

  const handleDeleteRole = async () => {
    const role = roles.find(r => r.id === selectedRoleId);
    if (!role) return;

    if (!confirm(`Are you sure you want to delete role '${role.name}'?`)) return;

    try {
      const res = await fetch(`/api/roles/${selectedRoleId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchRoles();
        alert('Role deleted');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete role');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred');
    }
  };

  const activeRole = roles.find(r => r.id === selectedRoleId);

  const roleTabs = roles.map(r => ({
    id: r.id,
    label: `${r.name}${r.is_system_role ? ' 🔒' : ''}`,
    badge: r.users?.length || 0
  }));

  return (
    <div>
      <PageHeader
        title="Roles & RBAC Permission Matrix"
        subtitle="Configure granular capability access and functional permissions per operational module"
        action={
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            + Add Custom Role
          </button>
        }
      />

      {/* Role Selection Tabs */}
      <PageTabs
        tabs={roleTabs}
        activeTab={selectedRoleId}
        onChange={handleSelectRole}
      />

      {/* Permission Grid for Selected Role */}
      {activeRole && (
        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                Permissions: <span style={{ color: 'var(--primary-color)' }}>{activeRole.name}</span>
              </h2>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                {activeRole.is_system_role ? 'System Role (Protected)' : 'Custom Role'} • {activeRole.users?.length || 0} user(s) assigned
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {!activeRole.is_system_role && (
                <button onClick={handleDeleteRole} className="btn btn-secondary" style={{ color: 'var(--danger-color)' }}>
                  Delete Role
                </button>
              )}
              <button
                onClick={handleSavePermissions}
                disabled={saving}
                className="btn btn-primary"
              >
                {saving ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>

          <div className="table-container" style={{ border: 'none', boxShadow: 'none', marginBottom: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Module Name</th>
                  <th style={{ textAlign: 'center' }}>Can View</th>
                  <th style={{ textAlign: 'center' }}>Can Create</th>
                  <th style={{ textAlign: 'center' }}>Can Edit</th>
                  <th style={{ textAlign: 'center' }}>Can Approve</th>
                  <th style={{ textAlign: 'center' }}>Can Delete</th>
                  <th style={{ textAlign: 'center' }}>Can Export</th>
                </tr>
              </thead>
              <tbody>
                {ALL_MODULES.map((mod) => {
                  const p = permissions[mod] || {};

                  return (
                    <tr key={mod}>
                      <td>
                        <strong>{mod.replace(/_/g, ' ').toUpperCase()}</strong>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(p.can_view)}
                          onChange={() => handlePermissionToggle(mod, 'can_view')}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(p.can_create)}
                          onChange={() => handlePermissionToggle(mod, 'can_create')}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(p.can_edit)}
                          onChange={() => handlePermissionToggle(mod, 'can_edit')}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(p.can_approve)}
                          onChange={() => handlePermissionToggle(mod, 'can_approve')}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(p.can_delete)}
                          onChange={() => handlePermissionToggle(mod, 'can_delete')}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(p.can_export)}
                          onChange={() => handlePermissionToggle(mod, 'can_export')}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Role Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>Create Custom Role</h3>

            {modalError && (
              <div style={{ color: 'var(--danger-color)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleAddRole}>
              <div className="form-group">
                <label>Role Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Shop Floor Lead, Procurement Auditor"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={!newRoleName.trim()}>
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
