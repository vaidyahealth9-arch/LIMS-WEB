import React, { useState, useEffect, useMemo } from 'react';
import type { ServiceRequest, TestResult } from '../types';
import { searchServiceRequests } from '../services/api';

const TestEntry: React.FC = () => {
    const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
    const [results, setResults] = useState<TestResult[]>([]);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const pageSize = 10;

    const roles = useMemo(() => {
        const token = localStorage.getItem('token');
        if (!token) return [];
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.roles || [];
        } catch (e) {
            console.error('Failed to parse token:', e);
            return [];
        }
    }, []);

    const isDoctorRole = roles.includes('doctor');
    const isTechnicianRole = roles.includes('technician');

    const fetchServiceRequests = async (query: string, startDate: string, endDate: string, page: number) => {
        setIsLoading(true);
        try {
            const orgId = localStorage.getItem('organizationId');
            if (!orgId) {
                throw new Error('Organization ID not found');
            }
            // Assuming testIds filter is not needed for now, passing empty array
            const response = await searchServiceRequests(orgId, startDate, endDate, query, [], page - 1, pageSize);
            
            setServiceRequests(response.content);
            setTotalPages(response.totalPages);
            setCurrentPage(page);
        } catch (error) {
            console.error('Failed to fetch service requests:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchServiceRequests(searchQuery, startDate, endDate, 1);
    }, []);

    const handleFilter = () => {
        fetchServiceRequests(searchQuery, startDate, endDate, 1);
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            fetchServiceRequests(searchQuery, startDate, endDate, currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            fetchServiceRequests(searchQuery, startDate, endDate, currentPage + 1);
        }
    };

    const handleDatePreset = (preset: '7d' | '1m' | '3m') => {
        const today = new Date();
        let pastDate = new Date();

        switch (preset) {
            case '7d':
                pastDate.setDate(today.getDate() - 7);
                break;
            case '1m':
                pastDate.setMonth(today.getMonth() - 1);
                break;
            case '3m':
                pastDate.setMonth(today.getMonth() - 3);
                break;
        }

        setStartDate(pastDate.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
    };

    const handleSelectRequest = (request: ServiceRequest) => {
        setSelectedRequest(request);
        const initialResults: TestResult[] = [];
        request.requestedTests.forEach(test => {
            if (test.analytes) {
                test.analytes.forEach(analyte => {
                    initialResults.push({
                        id: analyte.analyteId.toString(),
                        testName: analyte.analyteName,
                        observedValue: '',
                        machineValue: '',
                        units: analyte.unit,
                        normalRange: analyte.referenceRanges && analyte.referenceRanges.length > 0 ? analyte.referenceRanges[0].textRange : 'N/A',
                        comments: ''
                    });
                });
            }
        });
        setResults(initialResults);
    };

    const handleResultChange = (id: string, field: keyof TestResult, value: string) => {
        setResults(results.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Patient Worklist for Data Entry</h2>
                
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <input 
                        type="text" 
                        placeholder="Search by name, MRN..." 
                        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div>
                        <div className="flex items-center space-x-2">
                            <input type="date" className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            <span>-</span>
                            <input type="date" className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                        <div className="flex items-center space-x-2 mt-2">
                            <button onClick={() => handleDatePreset('7d')} className="px-2 py-1 text-xs text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300">7 days</button>
                            <button onClick={() => handleDatePreset('1m')} className="px-2 py-1 text-xs text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300">1 month</button>
                            <button onClick={() => handleDatePreset('3m')} className="px-2 py-1 text-xs text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300">3 months</button>
                        </div>
                    </div>
                    <button 
                        onClick={handleFilter}
                        className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Filtering...' : 'Filter'}
                    </button>
                </div>

                {/* Service Requests Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patient ID</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patient Name</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tests</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {serviceRequests.map((req) => (
                                <tr key={req.id} className={`${selectedRequest?.id === req.id ? 'bg-indigo-50' : ''}`}>
                                    <td className="px-4 py-3 font-medium">{req.patientMrn}</td>
                                    <td className="px-4 py-3">{req.patientName}</td>
                                    <td className="px-4 py-3">{req.requestedTests.map(t => t.testName).join(', ')}</td>
                                    <td className="px-4 py-3">{new Date(req.orderDate).toLocaleDateString()}</td>
                                    <td className="px-4 py-3">
                                        <button onClick={() => handleSelectRequest(req)} className="text-indigo-600 hover:text-indigo-900 font-semibold">
                                            {selectedRequest?.id === req.id ? 'Selected' : 'Select'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                        <button
                            onClick={handlePreviousPage}
                            disabled={currentPage === 1 || isLoading}
                            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-600">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages || isLoading}
                            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {selectedRequest && (
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <div className="mb-4">
                        <h3 className="text-xl font-bold text-gray-800">Data Entry for {selectedRequest.patientName}</h3>
                        <p className="text-sm text-gray-500">Status: {selectedRequest.status}</p>
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
                                <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100" disabled={!isTechnicianRole}>Save</button>
                                <button className="px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg shadow-md hover:bg-yellow-600" disabled={!isTechnicianRole}>Send for Verification</button>
                            </div>
                        </div>
                        <div className="text-sm">
                            <p className="font-semibold">For Doctor:</p>
                             <div className="flex space-x-2 mt-1">
                                <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100" disabled={!isDoctorRole}>Save</button>
                                <button className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700" disabled={!isDoctorRole}>Approve & Print</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestEntry;