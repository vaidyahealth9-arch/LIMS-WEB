import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ServiceRequest, GroupedAnalyte, ResultEntry } from '../types';
import { searchServiceRequests, createObservationForServiceRequest, getServiceRequestAnalytes } from '../services/api';

const TestEntry: React.FC = () => {
    const navigate = useNavigate();
    const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
    const [analytes, setAnalytes] = useState<GroupedAnalyte[]>([]);
    const [results, setResults] = useState<{ [key: string]: ResultEntry }>({});
    
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
    }, [searchQuery, startDate, endDate]);

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

    const handleSelectRequest = async (request: ServiceRequest) => {
        setSelectedRequest(request);
        try {
            const fetchedAnalytes = await getServiceRequestAnalytes(request.id);
            setAnalytes(fetchedAnalytes);

            // Assumption: The service request may have multiple tests, each with its own specimen.
            // For simplicity in this context, we'll find the first available specimen barcode
            // and associate it with all analytes for this service request.
            // This may need to be refined if analytes can be linked to different specimens.
            const specimenId = request.requestedTests.find(t => t.specimenBarcodes && t.specimenBarcodes.length > 0)?.specimenBarcodes[0] || 'N/A';

            const initialResults = {};
            fetchedAnalytes.forEach(group => {
                group.analytes.forEach(analyte => {
                    initialResults[analyte.analyteId] = {
                        id: analyte.analyteId.toString(),
                        testName: group.testName,
                        observedValue: '',
                        machineValue: '',
                        units: analyte.unit,
                        normalRange: 'N/A',
                        comments: '',
                        specimenId: specimenId,
                        analyteId: analyte.analyteId,
                        interpretationRule: analyte.interpretationRule,
                    };
                });
            });
            setResults(initialResults);
        } catch (error) {
            console.error('Failed to fetch analytes:', error);
            setResults([]);
        }
    };

    const handleResultChange = (id: string, field: string, value: string) => {
        setResults(prevResults => ({
            ...prevResults,
            [id]: {
                ...prevResults[id],
                [field]: value,
            },
        }));
    };

    const handleApprove = async () => {
        if (!selectedRequest) return;

        try {
            const observationPromises = Object.values(results)
                .filter(result => result.observedValue)
                .map(result => {
                    // if (!result.specimenId) {
                    //     throw new Error(`Specimen ID is missing for analyte ${result.testName}.`);
                    // }

                    const value = isNaN(Number(result.observedValue)) ? { valueString: result.observedValue } : { valueNumeric: Number(result.observedValue) };
                    
                    const observationData = {
                        specimenId: result.specimenId,
                        analyteId: result.analyteId,
                        ...value,
                        effectiveDateTime: new Date().toISOString(),
                    };

                    return createObservationForServiceRequest(selectedRequest.id, observationData);
                });

            await Promise.all(observationPromises);
            
            console.log("All observations created successfully.");
            // Maybe show a success message
            setSelectedRequest(null); // Clear selection
            setResults([]);
            // Refetch service requests to update the list
            fetchServiceRequests(searchQuery, startDate, endDate, currentPage);

        } catch (error) {
            console.error("Failed to create observations:", error);
            // Show an error message to the user, e.g. using a notification system.
            alert(`Error: ${error.message}`); // Using alert for immediate feedback for the user.
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-white to-cyan-50 p-6 rounded-xl shadow-lg border border-cyan-100">
                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent mb-2">
                        Entry & Verify
                    </h2>
                    <p className="text-sm text-gray-600">Patient worklist for test data entry and verification</p>
                </div>
                
                {/* Filters - Compact Single Row */}
                <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Search */}
                        <div className="flex-1 min-w-[250px]">
                            <input 
                                type="text" 
                                placeholder="Search by name, MRN, Lab ID..." 
                                className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Date Range */}
                        <div className="flex items-center gap-2">
                            <input 
                                type="date" 
                                className="px-3 py-2 text-sm border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all" 
                                value={startDate} 
                                onChange={e => setStartDate(e.target.value)} 
                            />
                            <span className="text-gray-400 font-bold text-sm">→</span>
                            <input 
                                type="date" 
                                className="px-3 py-2 text-sm border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all" 
                                value={endDate} 
                                onChange={e => setEndDate(e.target.value)} 
                            />
                        </div>

                        {/* Date Presets */}
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => handleDatePreset('7d')} className="px-2.5 py-1.5 text-xs text-cyan-700 bg-cyan-50 rounded-md hover:bg-cyan-100 hover:text-cyan-800 border border-cyan-200 font-medium transition-colors whitespace-nowrap">7 days</button>
                            <button onClick={() => handleDatePreset('1m')} className="px-2.5 py-1.5 text-xs text-cyan-700 bg-cyan-50 rounded-md hover:bg-cyan-100 hover:text-cyan-800 border border-cyan-200 font-medium transition-colors whitespace-nowrap">1 month</button>
                            <button onClick={() => handleDatePreset('3m')} className="px-2.5 py-1.5 text-xs text-cyan-700 bg-cyan-50 rounded-md hover:bg-cyan-100 hover:text-cyan-800 border border-cyan-200 font-medium transition-colors whitespace-nowrap">3 months</button>
                        </div>

                        {/* Total Counter */}
                        <div className="flex items-center bg-gradient-to-r from-cyan-50 to-teal-50 px-3 py-2 rounded-lg border border-cyan-200 whitespace-nowrap">
                            <span className="text-xs text-gray-600">Total:</span>
                            <span className="ml-1.5 text-sm font-bold text-cyan-700">{serviceRequests.length}</span>
                            <span className="ml-1 text-xs text-gray-600">requests</span>
                        </div>
                    </div>

                    {/* Clear Filters */}
                    {searchQuery && (
                        <div className="flex items-center justify-start mt-3 pt-3 border-t border-gray-200">
                            <button
                                onClick={() => setSearchQuery('')}
                                className="px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md font-medium transition-colors flex items-center"
                            >
                                <span className="mr-1">×</span>
                                Clear filters
                            </button>
                        </div>
                    )}
                </div>

                {/* Service Requests Table */}
                <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <svg className="animate-spin h-8 w-8 text-cyan-600" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                            </svg>
                            <span className="ml-3 text-gray-600">Loading requests...</span>
                        </div>
                    ) : serviceRequests.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                            </svg>
                            <p className="mt-2">No service requests found</p>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gradient-to-r from-cyan-50 to-teal-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Order ID</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Patient ID</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Patient Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Tests</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {serviceRequests.map((req) => (
                                <tr key={req.id} className={`hover:bg-cyan-50 transition-colors ${selectedRequest?.id === req.id ? 'bg-cyan-100' : ''}`}>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{req.localOrderValue}</td>
                                    <td className="px-4 py-3 text-sm font-medium text-cyan-600">{req.patientMrn}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700 font-medium">{req.patientName}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{req.requestedTests.map(t => t.testName).join(', ')}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(req.orderDate).toLocaleDateString()}</td>
                                    <td className="px-4 py-3">
                                        <button onClick={() => handleSelectRequest(req)} className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-teal-600 rounded-md hover:from-cyan-700 hover:to-teal-700 transition-all">
                                            {selectedRequest?.id === req.id ? '✓ Selected' : 'Select'}
                                        </button>
                                        {(req.status !== 'ACTIVE' && req.status !== 'PENDING') && (
                                            <button
                                                onClick={() => navigate('/view-observations', { state: { serviceRequest: req } })}
                                                className="ml-2 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-md hover:from-blue-700 hover:to-indigo-700 transition-all"
                                            >
                                                View Observations
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-6 px-4">
                        <button
                            onClick={handlePreviousPage}
                            disabled={currentPage === 1 || isLoading}
                            className="px-4 py-2 text-sm font-medium text-cyan-700 bg-white border-2 border-cyan-200 rounded-lg hover:bg-cyan-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            ← Previous
                        </button>
                        <span className="text-sm font-medium text-gray-700">
                            Page <span className="text-cyan-600 font-bold">{currentPage}</span> of <span className="text-cyan-600 font-bold">{totalPages}</span>
                        </span>
                        <button
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages || isLoading}
                            className="px-4 py-2 text-sm font-medium text-cyan-700 bg-white border-2 border-cyan-200 rounded-lg hover:bg-cyan-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Next →
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
                    {analytes.map(group => (
                        <div key={group.testId} className="overflow-x-auto mb-6">
                            <h4 className="text-lg font-bold text-gray-700 mb-2">{group.testName}</h4>
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Analyte</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Observed Value</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Machine Value</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Units</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Normal Range</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Comments</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {group.analytes.map(analyte => {
                                        const result = results[analyte.analyteId];
                                        if (!result) return null;
                                        return (
                                            <tr key={analyte.analyteId}>
                                                <td className="px-4 py-2 font-medium">{analyte.analyteName}</td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="text"
                                                        value={result.observedValue}
                                                        onChange={(e) => handleResultChange(result.id, 'observedValue', e.target.value)}
                                                        className={`w-28 px-2 py-1 border rounded-md ${!result.observedValue && result.machineValue ? '' : !result.observedValue ? 'border-red-400 ring-red-300 ring-1' : 'border-gray-300'}`}
                                                    />
                                                </td>
                                                <td className="px-4 py-2">{result.machineValue || 'N/A'}</td>
                                                <td className="px-4 py-2">{result.units}</td>
                                                <td className="px-4 py-2">{result.normalRange}</td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="text"
                                                        value={result.comments}
                                                        onChange={(e) => handleResultChange(result.id, 'comments', e.target.value)}
                                                        className="w-full px-2 py-1 border border-gray-300 rounded-md"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ))}
                    <div className="mt-6 flex justify-end space-x-4">
                        {/* <div className="text-sm">
                            <p className="font-semibold">For Technician:</p>
                            <div className="flex space-x-2 mt-1">
                                <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100" disabled={!isTechnicianRole}>Save</button>
                                <button className="px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg shadow-md hover:bg-yellow-600" disabled={!isTechnicianRole}>Send for Verification</button>
                            </div>
                        </div> */}
                        <div className="text-sm">
                            {/* <p className="font-semibold">For Doctor:</p> */}
                             <div className="flex space-x-2 mt-1">
                                {/* <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100" disabled={!isDoctorRole}>Save</button> */}
                                <button onClick={handleApprove} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700">Approve & Print</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestEntry;