
import React, { useState } from 'react';
import { User, UserRole } from '../types';

const mockUsers: User[] = [
    { id: '1', name: 'Dr. Ramesh Gupta', gender: 'Male', role: UserRole.Doctor, contact: '9876543210', status: 'Active' },
    { id: '2', name: 'Anita Desai', gender: 'Female', role: UserRole.Technician, contact: '9876543211', status: 'Active' },
    { id: '3', name: 'Suresh Kumar', gender: 'Male', role: UserRole.Receptionist, contact: '9876543212', status: 'Active' },
    { id: '4', name: 'Dr. Priya Sharma', gender: 'Female', role: UserRole.Radiologist, contact: '9876543213', status: 'Inactive' },
    { id: '5', name: 'Rajesh Singh', gender: 'Male', role: UserRole.Admin, contact: '9876543214', status: 'Active' },
];

const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
    const roleColors: { [key in UserRole]: string } = {
        [UserRole.Admin]: 'bg-red-200 text-red-800',
        [UserRole.Doctor]: 'bg-blue-200 text-blue-800',
        [UserRole.Radiologist]: 'bg-purple-200 text-purple-800',
        [UserRole.Technician]: 'bg-yellow-200 text-yellow-800',
        [UserRole.Receptionist]: 'bg-green-200 text-green-800',
        [UserRole.Manager]: 'bg-indigo-200 text-indigo-800',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-md ${roleColors[role]}`}>{role}</span>;
};

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>(mockUsers);
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
                <div className="flex space-x-2">
                    <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">Export User List (Excel)</button>
                    <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700">Add User</button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">S. No.</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contact No.</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Login Access</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user, index) => (
                            <tr key={user.id}>
                                <td className="px-4 py-3">{index + 1}</td>
                                <td className="px-4 py-3 font-medium">{user.name}</td>
                                <td className="px-4 py-3">{user.gender}</td>
                                <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                                <td className="px-4 py-3">{user.contact}</td>
                                <td className="px-4 py-3">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" defaultChecked={user.status === 'Active'} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                    </label>
                                </td>
                                <td className="px-4 py-3">
                                    <button className="text-indigo-600 hover:text-indigo-900 font-semibold">Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
                    <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">Add/Edit User</h3>
                        <form className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium">Role</label>
                                <select className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md">
                                    {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
                                </select>
                            </div>
                            <div><label className="block text-sm font-medium">Name</label><input type="text" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"/></div>
                            <div><label className="block text-sm font-medium">Phone</label><input type="text" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"/></div>
                            <div><label className="block text-sm font-medium">Username</label><input type="text" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"/></div>
                            <div><label className="block text-sm font-medium">Password</label><input type="password" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"/></div>
                            <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md text-gray-700">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">Save User</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default UserManagement;
