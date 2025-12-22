import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Encounter, OrganizationTest } from '../types';
import { searchEncounters, getEnabledTestsForLab, createBill, updateEncounterStatus } from '../services/api';

import { Billing } from './Billing';

const StatusBadge: React.FC<{ status: Encounter['status'] }> = ({ status }) => {
    const statusClasses: Record<Encounter['status'], string> = {
        PLANNED: 'bg-gray-100 text-gray-800',
        ARRIVED: 'bg-blue-100 text-blue-800',
        IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
        FINISHED: 'bg-green-100 text-green-800',
        CANCELLED: 'bg-red-100 text-red-800',
    };
    const formattedStatus = status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[status]}`}>
            {formattedStatus}
        </span>
    );
};

const ActionButtons: React.FC<{ encounter: Encounter; onBill: (encounter: Encounter) => void; onUpdate: () => void; }> = ({ encounter, onBill, onUpdate }) => {
    const navigate = useNavigate();
    const { status, tests } = encounter;

    const handleAddTests = () => {
        navigate('/create-tests', { state: { encounter } });
    };

    const handleStartProgress = async () => {
        try {
            await updateEncounterStatus(encounter.id.toString(), { status: 'IN_PROGRESS' });
            onUpdate();
        } catch (error) {
            console.error('Failed to update status', error);
            alert('Failed to start progress.');
        }
    };

    const hasTests = tests && tests.length > 0;

    switch (status) {
        case 'ARRIVED':
            return (
                <>
                    <button onClick={handleAddTests} className="text-indigo-600 hover:text-indigo-900">Add tests</button>
                    {hasTests && (
                        <button onClick={handleStartProgress} className="text-blue-600 hover:text-blue-900 ml-2">Start Progress</button>
                    )}
                </>
            );
        case 'IN_PROGRESS':
            return (
                <>
                    <button onClick={handleAddTests} className="text-indigo-600 hover:text-indigo-900">Add tests</button>
                    <button onClick={() => onBill(encounter)} className="text-green-600 hover:text-green-900 ml-2">Bill</button>
                </>
            );
        case 'FINISHED':
            return <button className="text-green-600 hover:text-green-900">Print Report</button>;
        default:
            if (!hasTests) {
                return <button onClick={handleAddTests} className="text-indigo-600 hover:text-indigo-900">Add tests</button>;
            }
            return null;
    }
};

export const PatientList: React.FC = () => {
    const [encounters, setEncounters] = useState<Encounter[]>([]);
    const [tests, setTests] = useState<OrganizationTest[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTests, setSelectedTests] = useState<string[]>([]);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const pageSize = 10;
    const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
    const [selectedEncounterForBilling, setSelectedEncounterForBilling] = useState<Encounter | null>(null);

    const handleBill = (encounter: Encounter) => {
        setSelectedEncounterForBilling(encounter);
        setIsBillingModalOpen(true);
    };

    const onEncounterUpdate = () => {
        // Refetch encounters to update status
        fetchEncounters(searchQuery, selectedTests, startDate, endDate, currentPage);
    };

    const fetchEncounters = async (query: string, testIds: string[], startDate: string, endDate: string, page: number) => {
        setIsLoading(true);
        try {
            const orgId = localStorage.getItem('organizationId');
            if (!orgId) {
                throw new Error('Organization ID not found');
            }
            const response = await searchEncounters(orgId, startDate, endDate, query, testIds, page - 1, pageSize);
            
            setEncounters(response.content);
            setTotalPages(response.totalPages);
            setCurrentPage(page);
        } catch (error) {
            console.error('Failed to fetch encounters:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const orgId = localStorage.getItem('organizationId');
        if (orgId) {
            getEnabledTestsForLab(orgId)
                .then(setTests)
                .catch(error => console.error('Failed to fetch tests:', error));
        }
    }, []);

    useEffect(() => {
        // Fetch encounters when filters change
        fetchEncounters(searchQuery, selectedTests, startDate, endDate, 1);
    }, [searchQuery, selectedTests, startDate, endDate]);

    const handleFilter = () => {
        fetchEncounters(searchQuery, selectedTests, startDate, endDate, 1);
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            fetchEncounters(searchQuery, selectedTests, startDate, endDate, currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            fetchEncounters(searchQuery, selectedTests, startDate, endDate, currentPage + 1);
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
    
    const handleTestSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { options } = e.target;
        const value: string[] = [];
        for (let i = 0, l = options.length; i < l; i += 1) {
            if (options[i].selected) {
                value.push(options[i].value);
            }
        }
        setSelectedTests(value);
    }

    return (
        <div className="bg-gradient-to-br from-white to-cyan-50 p-6 rounded-xl shadow-lg border border-cyan-100">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent mb-2">
                    Patient Encounters
                </h2>
                <p className="text-sm text-gray-600">Manage patient visits and consultations</p>
            </div>
            
            {/* Filters - Compact Single Row */}
            <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Search */}
                    <div className="flex-1 min-w-[250px]">
                        <input 
                            type="text" 
                            placeholder="Search by name, phone, UHID, ABHA..." 
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
                        <span className="ml-1.5 text-sm font-bold text-cyan-700">{encounters.length}</span>
                        <span className="ml-1 text-xs text-gray-600">encounters</span>
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

            {/* Encounter Table */}
            <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <svg className="animate-spin h-8 w-8 text-cyan-600" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        <span className="ml-3 text-gray-600">Loading encounters...</span>
                    </div>
                ) : encounters.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        <p className="mt-2">No encounters found</p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-cyan-50 to-teal-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Encounter ID</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Patient ID</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Patient Name</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ref. Doctor</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Tests</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {encounters.map((encounter) => (
                                <tr key={encounter.id} className="hover:bg-cyan-50 transition-colors">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {encounter.localEncounterValue || `ENC-${encounter.id.toString().padStart(6, '0')}`}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-cyan-600">{encounter.mrnId}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">{encounter.patientName}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{encounter.referenceDoctor}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{encounter.tests.join(', ')}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{new Date(encounter.date).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <StatusBadge status={encounter.status} />
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2">
                                        <ActionButtons encounter={encounter} onBill={handleBill} onUpdate={onEncounterUpdate} />
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

            {isBillingModalOpen && <Billing 
                isOpen={isBillingModalOpen}
                onClose={() => setIsBillingModalOpen(false)}
                encounter={selectedEncounterForBilling}
                onBillCreated={onEncounterUpdate}
            />}
        </div>
    );
};



