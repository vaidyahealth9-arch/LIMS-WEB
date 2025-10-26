
import React, { useState } from 'react';
import type { IrisWorklistItem } from '../types';

const mockWorklist: IrisWorklistItem[] = [
    { id: '1', patientId: 'P001', patientName: 'Anjali Sharma', modality: 'MRI', part: 'Brain & Spine', dateTime: '2024-08-21 10:30', priority: 'Urgent', status: 'New' },
    { id: '2', patientId: 'P002', patientName: 'Rajesh Kumar', modality: 'CT', part: 'Abdomen', dateTime: '2024-08-21 09:45', priority: 'Routine', status: 'Completed' },
    { id: '3', patientId: 'P003', patientName: 'Sunita Rao', modality: 'X-ray', part: 'Chest', dateTime: '2024-08-20 15:00', priority: 'Routine', status: 'Ongoing' },
    { id: '4', patientId: 'P004', patientName: 'Amit Verma', modality: 'USG', part: 'Abdomen & Pelvis', dateTime: '2024-08-20 14:10', priority: 'Routine', status: 'Completed' },
    { id: '5', patientId: 'P005', patientName: 'Priya Singh', modality: 'CT', part: 'Head', dateTime: '2024-08-19 18:00', priority: 'Urgent', status: 'Stopped/Interrupted' },
];

const StatusBadge: React.FC<{ status: IrisWorklistItem['status'] }> = ({ status }) => {
    const statusClasses = {
        New: 'bg-cyan-100 text-cyan-800 border border-cyan-200',
        Completed: 'bg-green-100 text-green-800 border border-green-200',
        Ongoing: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
        'Stopped/Interrupted': 'bg-red-100 text-red-800 border border-red-200',
    };
    return (
        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[status]}`}>
            {status}
        </span>
    );
};

const DicomViewerModal: React.FC<{ onClose: () => void, item: IrisWorklistItem }> = ({ onClose, item }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
        <div className="bg-gray-800 text-white p-4 rounded-lg shadow-2xl w-11/12 h-5/6 flex flex-col">
            <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-4">
                <h3 className="text-xl font-bold">DICOM Viewer & Report - {item.patientName} ({item.part})</h3>
                <button onClick={onClose} className="text-gray-300 hover:text-white">&times;</button>
            </div>
            <div className="flex-1 flex gap-4 overflow-hidden">
                <div className="w-2/3 bg-black rounded-md flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-2xl">OHIF/Cornerstone Viewer</p>
                        <p className="text-gray-400">Multi-series viewport placeholder</p>
                        <img src={`https://picsum.photos/seed/${item.id}/800/600`} alt="dicom placeholder" className="mt-4 rounded opacity-20"/>
                    </div>
                </div>
                <div className="w-1/3 flex flex-col">
                    <h4 className="font-semibold mb-2">Structured Report</h4>
                    <select className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md mb-2">
                        <option>Select template</option>
                        <option>MRI Brain Template</option>
                        <option>CT Abdomen Template</option>
                    </select>
                    <label className="text-sm mt-2">Findings</label>
                    <textarea rows={8} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md mb-2 flex-1"></textarea>
                    <label className="text-sm mt-2">Impression</label>
                    <textarea rows={4} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md mb-4"></textarea>
                    <div className="flex justify-end space-x-2">
                        <button className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700">Sync with PHR</button>
                        <button className="px-4 py-2 bg-green-600 rounded-md hover:bg-green-700">Sync with ABHA</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const IrisWorklist: React.FC = () => {
    const [viewerItem, setViewerItem] = useState<IrisWorklistItem | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterModality, setFilterModality] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterPriority, setFilterPriority] = useState<string>('all');

    // Get unique modalities
    const modalities = Array.from(new Set(mockWorklist.map(item => item.modality)));

    // Filter worklist
    const filteredWorklist = mockWorklist.filter(item => {
        const matchesSearch = item.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.part.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesModality = filterModality === 'all' || item.modality === filterModality;
        const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
        const matchesPriority = filterPriority === 'all' || item.priority === filterPriority;
        
        return matchesSearch && matchesModality && matchesStatus && matchesPriority;
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-teal-600 rounded-xl shadow-lg p-6 mb-6">
                <div className="flex items-center gap-3">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                        <h1 className="text-3xl font-bold text-white">IRIS Worklist</h1>
                        <p className="text-cyan-100 mt-1">Medical imaging worklist with DICOM viewer integration</p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-cyan-600">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Total Cases</p>
                            <p className="text-3xl font-bold text-gray-800 mt-1">{mockWorklist.length}</p>
                        </div>
                        <div className="bg-cyan-100 rounded-full p-3">
                            <svg className="w-8 h-8 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-600">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">New</p>
                            <p className="text-3xl font-bold text-gray-800 mt-1">{mockWorklist.filter(i => i.status === 'New').length}</p>
                        </div>
                        <div className="bg-blue-100 rounded-full p-3">
                            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-600">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Ongoing</p>
                            <p className="text-3xl font-bold text-gray-800 mt-1">{mockWorklist.filter(i => i.status === 'Ongoing').length}</p>
                        </div>
                        <div className="bg-yellow-100 rounded-full p-3">
                            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-600">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Completed</p>
                            <p className="text-3xl font-bold text-gray-800 mt-1">{mockWorklist.filter(i => i.status === 'Completed').length}</p>
                        </div>
                        <div className="bg-green-100 rounded-full p-3">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by patient, ID, part..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                    </div>

                    {/* Modality Filter */}
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        <select
                            value={filterModality}
                            onChange={(e) => setFilterModality(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent appearance-none"
                        >
                            <option value="all">All Modalities</option>
                            {modalities.map(mod => (
                                <option key={mod} value={mod}>{mod}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent appearance-none"
                        >
                            <option value="all">All Status</option>
                            <option value="New">New</option>
                            <option value="Ongoing">Ongoing</option>
                            <option value="Completed">Completed</option>
                            <option value="Stopped/Interrupted">Stopped/Interrupted</option>
                        </select>
                    </div>

                    {/* Priority Filter */}
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <select
                            value={filterPriority}
                            onChange={(e) => setFilterPriority(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent appearance-none"
                        >
                            <option value="all">All Priority</option>
                            <option value="Urgent">Urgent</option>
                            <option value="Routine">Routine</option>
                        </select>
                    </div>
                </div>

                {/* Results count */}
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Showing {filteredWorklist.length} of {mockWorklist.length} cases
                </div>
            </div>

            {/* Worklist Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-cyan-50 to-teal-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-cyan-700 uppercase tracking-wider">Patient ID</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-cyan-700 uppercase tracking-wider">Patient Name</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-cyan-700 uppercase tracking-wider">Modality</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-cyan-700 uppercase tracking-wider">Part</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-cyan-700 uppercase tracking-wider">Date/Time</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-cyan-700 uppercase tracking-wider">Priority</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-cyan-700 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-cyan-700 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredWorklist.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center">
                                            <svg className="w-16 h-16 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <p className="text-gray-500 text-lg font-medium">No cases found</p>
                                            <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredWorklist.map(item => (
                                    <tr key={item.id} className="hover:bg-cyan-50 transition-all duration-200">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2.5 py-1 text-xs font-mono bg-gray-100 text-gray-700 rounded">{item.patientId}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="w-2 h-2 rounded-full mr-3 bg-cyan-500"></div>
                                                <span className="font-medium text-gray-900">{item.patientName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-3 py-1 bg-cyan-100 text-cyan-700 text-sm font-semibold rounded-md">{item.modality}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{item.part}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                {item.dateTime}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 text-sm font-semibold rounded-md ${item.priority === 'Urgent' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                                                {item.priority}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={item.status} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex justify-center gap-2">
                                                <button 
                                                    onClick={() => setViewerItem(item)} 
                                                    className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-sm font-semibold rounded-lg hover:from-cyan-700 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    Open Viewer
                                                </button>
                                                <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {viewerItem && <DicomViewerModal item={viewerItem} onClose={() => setViewerItem(null)} />}
        </div>
    );
};

export default IrisWorklist;
