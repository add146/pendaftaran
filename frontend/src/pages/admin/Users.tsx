import { useState, useEffect } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import { superAdminAPI, settingsAPI } from '../../lib/api'

interface User {
    id: string
    email: string
    name: string
    role: string
    organization_id: string
    organization_name: string
    created_at: string
}

interface Organization {
    id: string
    name: string
}

export default function Users() {
    const [users, setUsers] = useState<User[]>([])
    const [organizations, setOrganizations] = useState<Organization[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // Create user form
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [newUser, setNewUser] = useState({
        email: '',
        password: '',
        name: '',
        organization_id: '',
        role: 'admin'
    })
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)
            const [usersData, orgsData, settingsData] = await Promise.all([
                superAdminAPI.getUsers(),
                superAdminAPI.getOrganizations(),
                settingsAPI.get('public_registration_enabled')
            ])
            setUsers(usersData.users)
            setOrganizations(orgsData.organizations)
            setRegistrationEnabled(settingsData?.value === true || settingsData?.value === 'true')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data')
        } finally {
            setLoading(false)
        }
    }

    const [registrationEnabled, setRegistrationEnabled] = useState(false)
    const [toggling, setToggling] = useState(false)

    const handleToggleRegistration = async () => {
        try {
            setToggling(true)
            const newValue = !registrationEnabled
            await settingsAPI.save('public_registration_enabled', newValue)
            setRegistrationEnabled(newValue)
            setSuccess(`Registrasi publik berhasil ${newValue ? 'diaktifkan' : 'dinonaktifkan'}`)
        } catch (err) {
            setError('Gagal mengubah status registrasi')
        } finally {
            setToggling(false)
        }
    }

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setCreating(true)
            setError('')
            await superAdminAPI.createUser(newUser)
            setSuccess('User created successfully!')
            setShowCreateForm(false)
            setNewUser({ email: '', password: '', name: '', organization_id: '', role: 'admin' })
            await loadData()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create user')
        } finally {
            setCreating(false)
        }
    }

    const handleDeleteUser = async (userId: string, userName: string) => {
        if (!confirm(`Are you sure you want to delete user "${userName}"?`)) return

        try {
            await superAdminAPI.deleteUser(userId)
            setSuccess('User deleted successfully!')
            await loadData()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete user')
        }
    }

    const handleChangeRole = async (userId: string, newRole: string) => {
        try {
            await superAdminAPI.updateUserRole(userId, newRole)
            setSuccess('User role updated!')
            await loadData()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update role')
        }
    }

    // Edit user
    const [showEditForm, setShowEditForm] = useState(false)
    const [editUser, setEditUser] = useState<{ id: string; name: string; email: string; password: string; organization_id: string } | null>(null)
    const [editing, setEditing] = useState(false)

    const openEditForm = (user: User) => {
        setEditUser({
            id: user.id,
            name: user.name,
            email: user.email,
            password: '',
            organization_id: user.organization_id
        })
        setShowEditForm(true)
    }

    const handleEditUser = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editUser) return

        try {
            setEditing(true)
            setError('')
            const data: any = { name: editUser.name, email: editUser.email, organization_id: editUser.organization_id }
            if (editUser.password && editUser.password.length >= 6) {
                data.password = editUser.password
            }
            await superAdminAPI.updateUser(editUser.id, data)
            setSuccess('User updated successfully!')
            setShowEditForm(false)
            setEditUser(null)
            await loadData()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update user')
        } finally {
            setEditing(false)
        }
    }

    if (loading) {
        return (
            <AdminLayout title="User Management" currentPage="super-users">
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Loading users...</div>
                </div>
            </AdminLayout>
        )
    }

    return (
        <AdminLayout title="User Management" currentPage="super-users">
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-text-main">User Management</h1>
                        <p className="text-text-sub mt-1">Create and manage users across all organizations</p>
                    </div>
                    <div className="flex items-center gap-3 mr-4 border-r border-gray-200 pr-4">
                        <span className="text-sm font-medium text-gray-600 hidden sm:inline">Public Registration</span>
                        <button
                            onClick={handleToggleRegistration}
                            disabled={toggling}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${registrationEnabled ? 'bg-primary' : 'bg-gray-200'}`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${registrationEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                            />
                        </button>
                    </div>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium"
                    >
                        <span className="material-symbols-outlined">person_add</span>
                        <span className="hidden sm:inline">Create User</span>
                    </button>
                </div>

                {/* Messages */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center">
                        {error}
                        <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">×</button>
                    </div>
                )}
                {success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex justify-between items-center">
                        {success}
                        <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700">×</button>
                    </div>
                )}

                {/* Create User Modal */}
                {showCreateForm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                            <h2 className="text-xl font-bold text-text-main mb-4">Create New User</h2>
                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={newUser.name}
                                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={newUser.email}
                                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                    <input
                                        type="password"
                                        value={newUser.password}
                                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                        required
                                        minLength={6}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                                    <select
                                        value={newUser.organization_id}
                                        onChange={(e) => setNewUser({ ...newUser, organization_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                        required
                                    >
                                        <option value="">Select organization...</option>
                                        {organizations.map(org => (
                                            <option key={org.id} value={org.id}>{org.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                    <select
                                        value={newUser.role}
                                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="user">User</option>
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateForm(false)}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium disabled:opacity-50"
                                    >
                                        {creating ? 'Creating...' : 'Create User'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit User Modal */}
                {showEditForm && editUser && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                            <h2 className="text-xl font-bold text-text-main mb-4">Edit User</h2>
                            <form onSubmit={handleEditUser} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={editUser.name}
                                        onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={editUser.email}
                                        onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password (optional)</label>
                                    <input
                                        type="password"
                                        value={editUser.password}
                                        onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                        minLength={6}
                                        placeholder="Leave empty to keep current password"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Minimum 6 characters if changing</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                                    <select
                                        value={editUser.organization_id}
                                        onChange={(e) => setEditUser({ ...editUser, organization_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                        required
                                    >
                                        {organizations.map(org => (
                                            <option key={org.id} value={org.id}>{org.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => { setShowEditForm(false); setEditUser(null) }}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={editing}
                                        className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium disabled:opacity-50"
                                    >
                                        {editing ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Users Table */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">User</th>
                                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Organization</th>
                                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Role</th>
                                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Created</th>
                                <th className="text-right px-6 py-3 text-sm font-semibold text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="font-medium text-text-main">{user.name}</div>
                                            <div className="text-sm text-gray-500">{user.email}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-700">{user.organization_name}</td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={user.role}
                                            onChange={(e) => handleChangeRole(user.id, e.target.value)}
                                            className="px-2 py-1 border border-gray-200 rounded text-sm"
                                        >
                                            <option value="admin">Admin</option>
                                            <option value="user">User</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-sm">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button
                                            onClick={() => openEditForm(user)}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(user.id, user.name)}
                                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No users found. Create your first user above.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    )
}
