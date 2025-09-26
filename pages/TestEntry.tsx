
import React, { useState } from 'react';
import type { Patient, TestResult } from '../types';

const mockPatientsPending: Omit<Patient, 'status' | 'amount' | 'refDoctor'>[] = [
    { id: '2', uhid: 'LAB2408210002', name: 'Priya Patel', age: 28, gender: 'Female', phone: '9876543211', date: '2024-08-21', tests: ['Thyroid Profile'] },
    { id: '5', uhid: 'LAB2408190011', name: 'Vikram Singh', age: 51, gender: 'Male', phone: '9876543214', date: '2024-08-19', tests: ['MRI Brain'] },
];

const mockTestResults: TestResult[] = [
    { id: 't1', testName: 'TSH', observedValue: '', machineValue: '2.15', units: 'uIU/mL', normalRange: '0.4 - 4.2', comments: '' },
    { id: 't2', testName: 'T3, Total', observedValue: '', machineValue: '110', units: 'ng/dL', normalRange: '80 - 180', comments: '' },
    { id: 't3', testName: 'T4, Total', observedValue: '', machineValue: '', units: 'ug/dL', normalRange: '4.5 - 12.5', comments: '' },
];

const TestEntry: React.FC = () => {
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [results, setResults] = useState<TestResult[]>(mockTestResults);

    const handleSelectPatient = (patient: any) => {
        setSelectedPatient(patient);
    };

    const handleResultChange = (id: string, field: keyof TestResult, value: string) => {
        setResults(results.map(r => r.id === id ? { ...r, [field]: value } : r));
    };
    
    const isDoctor = true; // Simulate role

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Patient Worklist for Data Entry</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patient ID</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patient Details</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tests</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {mockPatientsPending.map((p) => (
                                <tr key={p.id} className={`${selectedPatient?.id === p.id ? 'bg-indigo-50' : ''}`}>
                                    <td className="px-4 py-3 font-medium">{p.uhid}</td>
                                    <td className="px-4 py-3">{p.name}, {p.age}/{p.gender.charAt(0)}</td>
                                    <td className="px-4 py-3">{p.tests.join(', ')}</td>
                                    <td className="px-4 py-3">{p.date}</td>
                                    <td className="px-4 py-3">
                                        <button onClick={() => handleSelectPatient(p as Patient)} className="text-indigo-600 hover:text-indigo-900 font-semibold">
                                            {selectedPatient?.id === p.id ? 'Selected' : 'Select'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedPatient && (
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <div className="mb-4">
                        <h3 className="text-xl font-bold text-gray-800">Data Entry for {selectedPatient.name}</h3>
                        <p className="text-sm text-gray-500">Status: Ongoing</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Observed Value</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Machine Value</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Units</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Normal Range</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Comments</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {results.map(r => (
                                    <tr key={r.id}>
                                        <td className="px-4 py-2 font-medium">{r.testName}</td>
                                        <td className="px-4 py-2">
                                            <input type="text" value={r.observedValue} onChange={(e) => handleResultChange(r.id, 'observedValue', e.target.value)} className={`w-28 px-2 py-1 border rounded-md ${!r.observedValue && r.machineValue ? '' : !r.observedValue ? 'border-red-400 ring-red-300 ring-1' : 'border-gray-300'}`} />
                                        </td>
                                        <td className="px-4 py-2">{r.machineValue || 'N/A'}</td>
                                        <td className="px-4 py-2">{r.units}</td>
                                        <td className="px-4 py-2">{r.normalRange}</td>
                                        <td className="px-4 py-2">
                                            <input type="text" value={r.comments} onChange={(e) => handleResultChange(r.id, 'comments', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded-md" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-6 flex justify-end space-x-4">
                        <div className="text-sm">
                            <p className="font-semibold">For Technician:</p>
                            <div className="flex space-x-2 mt-1">
                                <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100" disabled={isDoctor}>Save</button>
                                <button className="px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg shadow-md hover:bg-yellow-600" disabled={isDoctor}>Send for Verification</button>
                            </div>
                        </div>
                        <div className="text-sm">
                            <p className="font-semibold">For Doctor:</p>
                             <div className="flex space-x-2 mt-1">
                                <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100" disabled={!isDoctor}>Save</button>
                                <button className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700" disabled={!isDoctor}>Approve & Print</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestEntry;
