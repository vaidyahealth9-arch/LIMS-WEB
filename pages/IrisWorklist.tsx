
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
        New: 'bg-blue-100 text-blue-800',
        Completed: 'bg-green-100 text-green-800',
        Ongoing: 'bg-yellow-100 text-yellow-800',
        'Stopped/Interrupted': 'bg-red-100 text-red-800',
    };
    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[status]}`}>
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

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">IRIS Worklist</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patient ID</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patient Name</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Modality</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Part</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date/Time</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {mockWorklist.map(item => (
                            <tr key={item.id}>
                                <td className="px-4 py-3 font-medium">{item.patientId}</td>
                                <td className="px-4 py-3">{item.patientName}</td>
                                <td className="px-4 py-3">{item.modality}</td>
                                <td className="px-4 py-3">{item.part}</td>
                                <td className="px-4 py-3">{item.dateTime}</td>
                                <td className="px-4 py-3">
                                    <span className={`font-semibold ${item.priority === 'Urgent' ? 'text-red-600' : 'text-gray-600'}`}>{item.priority}</span>
                                </td>
                                <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                                <td className="px-4 py-3 space-x-3">
                                    <button onClick={() => setViewerItem(item)} className="px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-md hover:bg-green-600">Open Viewer</button>
                                    <button className="text-red-600 hover:text-red-900 font-semibold">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {viewerItem && <DicomViewerModal item={viewerItem} onClose={() => setViewerItem(null)} />}
        </div>
    );
};

export default IrisWorklist;
