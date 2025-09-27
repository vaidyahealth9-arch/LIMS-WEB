import React, { useState, useEffect } from 'react';
import type { Patient, PatientRegistrationResponse, Test } from '../types';
import { searchPatients, getAllTests } from '../services/api';

const StatusBadge: React.FC<{ status: Patient['status'] }> = ({ status }) => {
    const statusClasses = {
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

const PatientList: React.FC = () => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [tests, setTests] = useState<Test[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTest, setSelectedTest] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const pageSize = 10;

    const fetchPatients = async (query: string, testId: string, page: number) => {
        setIsLoading(true);
        try {
            const orgId = '2'; // Hardcoded for now
            // Assuming searchPatients can handle empty query for initial load
            // and will eventually handle testId for filtering.
            const response = await searchPatients(orgId, query, page - 1, pageSize);
            
            const transformedPatients: Patient[] = response.content.map(p => ({
                id: p.id.toString(),
                uhid: p.localMrnValue,
                name: `${p.firstName} ${p.lastName}`,
                age: new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear(),
                gender: p.gender.charAt(0).toUpperCase() + p.gender.slice(1) as 'Male' | 'Female' | 'Other',
                phone: p.contactPhone,
                status: 'Ongoing', // Hardcoded
                date: new Date(p.createdAt).toLocaleDateString(),
                refDoctor: 'N/A', // Hardcoded
                tests: [], // Hardcoded
                amount: 0, // Hardcoded
                abhaId: p.abhaId,
            }));
            setPatients(transformedPatients);
            setTotalPages(response.totalPages);
            setCurrentPage(page);
        } catch (error) {
            console.error('Failed to fetch patients:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Fetch initial patient list
        fetchPatients('', '', 1);

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
        fetchPatients(searchQuery, selectedTest, 1);
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            fetchPatients(searchQuery, selectedTest, currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            fetchPatients(searchQuery, selectedTest, currentPage + 1);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Patient Records Dashboard</h2>
            
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <input 
                    type="text" 
                    placeholder="Search by name, phone, UHID, ABHA ID..." 
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select 
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    value={selectedTest}
                    onChange={(e) => setSelectedTest(e.target.value)}
                >
                    <option value="">All Tests</option>
                    {tests.map(test => (
                        <option key={test.id} value={test.id}>{test.name}</option>
                    ))}
                </select>
                <input type="date" className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                <button 
                    onClick={handleFilter}
                    className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={isLoading}
                >
                    {isLoading ? 'Filtering...' : 'Filter'}
                </button>
            </div>

            {/* Patient Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient ID</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ref. Doctor</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tests</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {patients.map((patient) => (
                            <tr key={patient.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{patient.uhid}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.refDoctor}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.tests.join(', ')}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{patient.amount}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.date}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <StatusBadge status={patient.status} />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                    <button className="text-indigo-600 hover:text-indigo-900">Bill</button>
                                    <button className="text-green-600 hover:text-green-900">Print Report</button>
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
