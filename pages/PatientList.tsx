import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Encounter, Test } from '../types';
import { searchEncounters, getAllTests } from '../services/api';

const StatusBadge: React.FC<{ status: Encounter['status'] }> = ({ status }) => {
    const statusClasses = {
        arrived: 'bg-blue-100 text-blue-800',
        'in-progress': 'bg-yellow-100 text-yellow-800',
        finished: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800',
    };
    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[status]}`}>
            {status}
        </span>
    );
};

const ActionButtons: React.FC<{ encounter: Encounter }> = ({ encounter }) => {
    const navigate = useNavigate();
    const { status, tests } = encounter;

    const handleAddTests = () => {
        navigate('/create-tests', { state: { encounter } });
    };

    if (status === 'arrived' || !tests || tests.length === 0) {
        return <button onClick={handleAddTests} className="text-indigo-600 hover:text-indigo-900">Add tests</button>;
    }

    if (status === 'in-progress') {
        return (
            <>
                <button onClick={handleAddTests} className="text-indigo-600 hover:text-indigo-900">Add tests</button>
                <button className="text-green-600 hover:text-green-900">Bill</button>
            </>
        );
    }

    if (status === 'finished') {
        return <button className="text-green-600 hover:text-green-900">Print Report</button>;
    }

    return null;
};

const PatientList: React.FC = () => {
    const [encounters, setEncounters] = useState<Encounter[]>([]);
    const [tests, setTests] = useState<Test[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTests, setSelectedTests] = useState<string[]>([]);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const pageSize = 10;

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
        // Fetch initial encounter list
        fetchEncounters('', [], startDate, endDate, 1);

        // Fetch tests for the filter dropdown
        const fetchTests = async () => {
            try {
                const allTests = await getAllTests();
                setTests(allTests);
            } catch (error) {
                console.error('Failed to fetch tests:', error);
            }
        };
        fetchTests();
    }, []);

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
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Encounters Dashboard</h2>
            
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <input 
                    type="text" 
                    placeholder="Search by name, phone, UHID, ABHA ID..." 
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {/* {<select 
                    multiple
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    value={selectedTests}
                    onChange={handleTestSelection}
                >
                    <option value="">All Tests</option>
                    {tests.map(test => (
                        <option key={test.id} value={test.id}>{test.name}</option>
                    ))}
                </select>} */}
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

            {/* Encounter Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient ID</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ref. Doctor</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tests</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {encounters.map((encounter) => (
                            <tr key={encounter.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{encounter.mrnId}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{encounter.patientName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{encounter.referenceDoctor}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{encounter.tests.join(', ')}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(encounter.date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <StatusBadge status={encounter.status} />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                    <ActionButtons encounter={encounter} />
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
    );
};

export default PatientList;
