import React, { useEffect, useMemo, useState } from 'react';
import { addUser, getAllOrganizations, getUsersByOrganization, toggleUserActiveStatus, updateUser, deleteUser } from '../services/api';
import { Organization, User, UserCreateRequest, UserRole, UserUpdateRequest } from '../types';

const backendRoleToUiRole: Record<string, UserRole> = {
    ADMIN: UserRole.Admin,
    MANAGER: UserRole.Manager,
    RECEPTIONIST: UserRole.Receptionist,
    TECHNICIAN: UserRole.Technician,
    PATHOLOGIST: UserRole.Doctor,
    RADIOLOGIST: UserRole.Radiologist,
};

const roleOptions: { value: string; label: UserRole }[] = [
    { value: 'ADMIN', label: UserRole.Admin },
    { value: 'MANAGER', label: UserRole.Manager },
    { value: 'RECEPTIONIST', label: UserRole.Receptionist },
    { value: 'TECHNICIAN', label: UserRole.Technician },
    { value: 'PATHOLOGIST', label: UserRole.Doctor },
    { value: 'RADIOLOGIST', label: UserRole.Radiologist },
];

const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
    const roleColors: { [key in UserRole]: string } = {
        [UserRole.Admin]: 'bg-red-100 text-red-800 border border-red-200',
        [UserRole.Manager]: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
        [UserRole.Doctor]: 'bg-cyan-100 text-cyan-800 border border-cyan-200',
        [UserRole.Radiologist]: 'bg-purple-100 text-purple-800 border border-purple-200',
        [UserRole.Technician]: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
        [UserRole.Receptionist]: 'bg-green-100 text-green-800 border border-green-200',
    };

    return <span className={`px-3 py-1 text-xs font-semibold rounded-full ${roleColors[role]}`}>{role}</span>;
};

type FormState = {
    practitionerFirstName: string;
    practitionerLastName: string;
    practitionerGender: 'male' | 'female' | 'other' | 'unknown';
    practitionerDateOfBirth: string;
    username: string;
    password: string;
    role: string;
    organizationId: string;
    isActive: boolean;
};

const getInitialFormState = (defaultOrganizationId: string = ''): FormState => ({
    practitionerFirstName: '',
    practitionerLastName: '',
    practitionerGender: 'unknown',
    practitionerDateOfBirth: '',
    username: '',
    password: '',
    role: 'TECHNICIAN',
    organizationId: defaultOrganizationId,
    isActive: true,
});

const escapeCsv = (value: string | number | boolean | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const normalized = String(value).replace(/"/g, '""');
    return /[",\n]/.test(normalized) ? `"${normalized}"` : normalized;
};

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [form, setForm] = useState<FormState>(getInitialFormState(localStorage.getItem('organizationId') || ''));

    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterOrganization, setFilterOrganization] = useState<string>('all');

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');

    const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; userId: number | null; userName: string }>({
        isOpen: false,
        userId: null,
        userName: '',
    });

    const loadUsers = async () => {
        setIsLoading(true);
        setError('');
        try {
            const organizationId = localStorage.getItem('organizationId');
            if (!organizationId) {
                throw new Error('Organization context not found. Please log in again.');
            }

            const [usersResponse, organizationsResponse] = await Promise.all([
                getUsersByOrganization(organizationId),
                getAllOrganizations(),
            ]);

            const scopedOrganizations = organizationsResponse.filter((org) => String(org.id) === organizationId);

            setUsers(usersResponse);
            setOrganizations(scopedOrganizations);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load users');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const openCreateModal = () => {
        setIsEditMode(false);
        setSelectedUser(null);
        setForm(getInitialFormState(localStorage.getItem('organizationId') || ''));
        setError('');
        setIsModalOpen(true);
    };

    const openEditModal = (user: User) => {
        setIsEditMode(true);
        setSelectedUser(user);
        setForm({
            practitionerFirstName: user.practitionerFirstName || '',
            practitionerLastName: user.practitionerLastName || '',
            practitionerGender: user.practitionerGender || 'unknown',
            practitionerDateOfBirth: user.practitionerDateOfBirth || '',
            username: user.username,
            password: '',
            role: user.roles?.[0] || 'TECHNICIAN',
            organizationId: user.organizationId ? String(user.organizationId) : '',
            isActive: Boolean(user.isActive),
        });
        setError('');
        setIsModalOpen(true);
    };

    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            const fullName = `${user.practitionerFirstName || ''} ${user.practitionerLastName || ''}`.trim();
            const primaryRole = user.roles?.[0] || '';

            const matchesSearch =
                fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.username.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesRole = filterRole === 'all' || primaryRole === filterRole;
            const matchesStatus =
                filterStatus === 'all' ||
                (filterStatus === 'Active' ? user.isActive : !user.isActive);
            const matchesOrganization =
                filterOrganization === 'all' || String(user.organizationId) === filterOrganization;

            return matchesSearch && matchesRole && matchesStatus && matchesOrganization;
        });
    }, [users, searchTerm, filterRole, filterStatus, filterOrganization]);

    const onChangeForm = (field: keyof FormState, value: string | boolean) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleToggleActive = async (userId: number, isActive: boolean) => {
        try {
            const updated = await toggleUserActiveStatus(userId, isActive);
            setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
            setSuccess(`User ${isActive ? 'activated' : 'deactivated'} successfully`);
            setTimeout(() => setSuccess(''), 3000);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to update user status');
        }
    };

    const openDeleteConfirmModal = (user: User) => {
        const fullName = `${user.practitionerFirstName || ''} ${user.practitionerLastName || ''}`.trim() || user.username;
        setDeleteConfirmModal({
            isOpen: true,
            userId: user.id,
            userName: fullName,
        });
    };

    const closeDeleteConfirmModal = () => {
        setDeleteConfirmModal({
            isOpen: false,
            userId: null,
            userName: '',
        });
    };

    const handleConfirmDelete = async () => {
        if (deleteConfirmModal.userId === null) return;

        try {
            setIsSaving(true);
            await deleteUser(deleteConfirmModal.userId);
            setUsers((prev) => prev.filter((u) => u.id !== deleteConfirmModal.userId));
            setSuccess(`User "${deleteConfirmModal.userName}" deleted successfully`);
            setTimeout(() => setSuccess(''), 3000);
            closeDeleteConfirmModal();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to delete user');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveUser = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);
        setError('');

        try {
            if (!form.organizationId) {
                throw new Error('Organization is required');
            }

            if (isEditMode && selectedUser) {
                const payload: UserUpdateRequest = {
                    practitionerFirstName: form.practitionerFirstName,
                    practitionerLastName: form.practitionerLastName,
                    practitionerGender: form.practitionerGender,
                    practitionerDateOfBirth: form.practitionerDateOfBirth || undefined,
                    roles: [form.role],
                    isActive: form.isActive,
                    newPassword: form.password || undefined,
                };

                const updated = await updateUser(selectedUser.id, payload);
                setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? updated : u)));
            } else {
                if (!form.password || form.password.length < 8) {
                    throw new Error('Password must be at least 8 characters');
                }

                const payload: UserCreateRequest = {
                    practitionerFirstName: form.practitionerFirstName,
                    practitionerLastName: form.practitionerLastName || undefined,
                    practitionerGender: form.practitionerGender,
                    practitionerDateOfBirth: form.practitionerDateOfBirth || undefined,
                    username: form.username.trim(),
                    password: form.password,
                    roles: [form.role],
                    organizationId: Number(form.organizationId),
                    isActive: form.isActive,
                };

                const created = await addUser(payload);
                setUsers((prev) => [created, ...prev]);
            }

            setIsModalOpen(false);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save user');
        } finally {
            setIsSaving(false);
        }
    };

    const totalActiveUsers = users.filter((u) => u.isActive).length;
    const totalInactiveUsers = users.length - totalActiveUsers;

    const handleExportUsers = () => {
        if (filteredUsers.length === 0) {
            setError('No users available to export with current filters');
            return;
        }

        const headers = [
            'User ID',
            'First Name',
            'Last Name',
            'Username',
            'Gender',
            'Role',
            'Organization ID',
            'Organization Name',
            'Active',
            'Created At',
            'Updated At',
        ];

        const rows = filteredUsers.map((user) => {
            const role = user.roles?.join('|') || '';
            return [
                user.id,
                user.practitionerFirstName,
                user.practitionerLastName,
                user.username,
                user.practitionerGender,
                role,
                user.organizationId,
                user.organizationName,
                user.isActive,
                user.createdAt,
                user.updatedAt,
            ].map(escapeCsv).join(',');
        });

        const csvContent = [headers.map(escapeCsv).join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        const dateSegment = new Date().toISOString().slice(0, 10);
        anchor.href = url;
        anchor.download = `users-export-${dateSegment}.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
            <div className="bg-gradient-to-r from-cyan-600 to-teal-600 rounded-xl shadow-lg p-6 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <div>
                            <h1 className="text-3xl font-bold text-white">User Management</h1>
                            <p className="text-cyan-100 mt-1">Manage system users, roles, and permissions</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExportUsers}
                            className="px-4 py-2.5 bg-white text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-lg flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16v-8m0 8l-3-3m3 3l3-3M5 20h14" />
                            </svg>
                            Export CSV
                        </button>
                        <button
                            onClick={openCreateModal}
                            className="px-4 py-2.5 bg-white text-cyan-600 font-bold rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-lg flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add User
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-cyan-600">
                    <p className="text-gray-500 text-sm font-medium">Total Users</p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">{users.length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-600">
                    <p className="text-gray-500 text-sm font-medium">Active</p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">{totalActiveUsers}</p>
                </div>
                <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-600">
                    <p className="text-gray-500 text-sm font-medium">Inactive</p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">{totalInactiveUsers}</p>
                </div>
                <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-600">
                    <p className="text-gray-500 text-sm font-medium">Roles</p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">{roleOptions.length}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                        type="text"
                        placeholder="Search by name or username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />

                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    >
                        <option value="all">All Roles</option>
                        {roleOptions.map((role) => (
                            <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                    </select>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    >
                        <option value="all">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-cyan-50 to-teal-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-cyan-700 uppercase tracking-wider">S. No.</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-cyan-700 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-cyan-700 uppercase tracking-wider">Gender</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-cyan-700 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-cyan-700 uppercase tracking-wider">Username</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-cyan-700 uppercase tracking-wider">Login Access</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-cyan-700 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">Loading users...</td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">No users found</td>
                                </tr>
                            ) : (
                                filteredUsers.map((user, index) => {
                                    const fullName = `${user.practitionerFirstName || ''} ${user.practitionerLastName || ''}`.trim() || user.username;
                                    const uiRole = backendRoleToUiRole[user.roles?.[0]] || UserRole.Technician;

                                    return (
                                        <tr key={user.id} className="hover:bg-cyan-50 transition-all duration-200">
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-700 font-medium">{index + 1}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-gray-900">{fullName}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{user.practitionerGender || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap"><RoleBadge role={uiRole} /></td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{user.username}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={user.isActive}
                                                        onChange={(e) => handleToggleActive(user.id, e.target.checked)}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-cyan-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                                                </label>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => openEditModal(user)}
                                                        className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-semibold rounded-lg hover:from-cyan-700 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => openDeleteConfirmModal(user)}
                                                        className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all duration-200 shadow-md hover:shadow-lg"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h3 className="text-2xl font-bold text-gray-800 mb-6">{isEditMode ? 'Edit User' : 'Add User'}</h3>
                        {error && (
                            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <form className="space-y-4" onSubmit={handleSaveUser}>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                                <select
                                    value={form.role}
                                    onChange={(e) => onChangeForm('role', e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg"
                                >
                                    {roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.practitionerFirstName}
                                    onChange={(e) => onChangeForm('practitionerFirstName', e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                <input
                                    type="text"
                                    value={form.practitionerLastName}
                                    onChange={(e) => onChangeForm('practitionerLastName', e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                                    <select
                                        value={form.practitionerGender}
                                        onChange={(e) => onChangeForm('practitionerGender', e.target.value)}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg"
                                    >
                                        <option value="unknown">Unknown</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">DOB</label>
                                    <input
                                        type="date"
                                        value={form.practitionerDateOfBirth}
                                        onChange={(e) => onChangeForm('practitionerDateOfBirth', e.target.value)}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Organization *</label>
                                <select
                                    required
                                    value={form.organizationId}
                                    disabled={isEditMode}
                                    onChange={(e) => onChangeForm('organizationId', e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg disabled:bg-gray-100"
                                >
                                    <option value="">Select organization</option>
                                    {organizations.map((org) => (
                                        <option key={org.id} value={org.id}>{org.organizationName}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                                <input
                                    type="text"
                                    required
                                    disabled={isEditMode}
                                    value={form.username}
                                    onChange={(e) => onChangeForm('username', e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg disabled:bg-gray-100"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{isEditMode ? 'New Password (optional)' : 'Password *'}</label>
                                <input
                                    type="password"
                                    required={!isEditMode}
                                    value={form.password}
                                    onChange={(e) => onChangeForm('password', e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    id="isActive"
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={(e) => onChangeForm('isActive', e.target.checked)}
                                />
                                <label htmlFor="isActive" className="text-sm text-gray-700">Allow login access</label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-semibold rounded-lg hover:from-cyan-700 hover:to-teal-700 disabled:opacity-70"
                                >
                                    {isSaving ? 'Saving...' : (isEditMode ? 'Update User' : 'Save User')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteConfirmModal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <h3 className="mt-6 text-xl font-bold text-gray-900 text-center">Delete User</h3>
                        <p className="mt-3 text-center text-gray-500">
                            Are you sure you want to delete <span className="font-semibold text-gray-900">"{deleteConfirmModal.userName}"</span>? This action cannot be undone.
                        </p>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={closeDeleteConfirmModal}
                                className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={isSaving}
                                className="px-6 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-70"
                            >
                                {isSaving ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
