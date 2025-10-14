import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Encounter, Test } from '../types';
import { searchEncounters, getAllTests, createBill, updateEncounterStatus } from '../services/api';

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
        case 'arrived':
            return (
                <>
                    <button onClick={handleAddTests} className="text-indigo-600 hover:text-indigo-900">Add tests</button>
                    {hasTests && (
                        <button onClick={handleStartProgress} className="text-blue-600 hover:text-blue-900 ml-2">Start Progress</button>
                    )}
                </>
            );
        case 'in-progress':
            return (
                <>
                    <button onClick={handleAddTests} className="text-indigo-600 hover:text-indigo-900">Add tests</button>
                    <button onClick={() => onBill(encounter)} className="text-green-600 hover:text-green-900 ml-2">Bill</button>
                </>
            );
        case 'finished':
            return <button className="text-green-600 hover:text-green-900">Print Report</button>;
        default:
            if (!hasTests) {
                return <button onClick={handleAddTests} className="text-indigo-600 hover:text-indigo-900">Add tests</button>;
            }
            return null;
    }
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
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Encounter ID</th>
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
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{encounter.localEncounterValue}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{encounter.mrnId}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{encounter.patientName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{encounter.referenceDoctor}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{encounter.tests.join(', ')}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(encounter.date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <StatusBadge status={encounter.status} />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                    <ActionButtons encounter={encounter} onBill={handleBill} onUpdate={onEncounterUpdate} />
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

            {isBillingModalOpen && <BillingModal 
                isOpen={isBillingModalOpen}
                onClose={() => setIsBillingModalOpen(false)}
                encounter={selectedEncounterForBilling}
                onBillCreated={onEncounterUpdate}
            />}
        </div>
    );
};

export default PatientList;

const BillingModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    encounter: Encounter | null;
    onBillCreated: () => void;
}> = ({ isOpen, onClose, encounter, onBillCreated }) => {
    const [discount, setDiscount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [paidAmount, setPaidAmount] = useState(0);
    const [notes, setNotes] = useState('');
    const [dueDate, setDueDate] = useState('');

    useEffect(() => {
        if (encounter) {
            // Reset form when a new encounter is selected
            setDiscount(0);
            setPaymentMethod('CASH');
            setPaidAmount(0);
            setNotes('');
            setDueDate('');
        }
    }, [encounter]);

    if (!isOpen || !encounter) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const serviceRequestIds = encounter.serviceRequestIds || [];

        if (serviceRequestIds.length === 0) {
            alert('This encounter has no service requests to bill.');
            return;
        }

        const billData = {
            encounterId: encounter.id,
            serviceRequestIds,
            discountPercentage: discount,
            initialPaymentMethod: paymentMethod,
            initialPaidAmount: paidAmount,
            notes,
            dueDate: dueDate || undefined,
        };

        try {
            await createBill(billData);
            alert('Bill created successfully!');
            onBillCreated();
            onClose();
        } catch (error) {
            console.error('Failed to create bill:', error);
            alert(`Failed to create bill: ${(error as Error).message}`);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3 text-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Create Bill for Encounter #{encounter.localEncounterValue}</h3>
                    <form onSubmit={handleSubmit} className="mt-2 text-left">
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Discount (%)</label>
                            <input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Payment Method</label>
                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
                                <option value="CASH">Cash</option>
                                <option value="CARD">Card</option>
                                <option value="UPI">UPI</option>
                            </select>
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Paid Amount</label>
                            <input type="number" value={paidAmount} onChange={e => setPaidAmount(Number(e.target.value))} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Notes</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Due Date</label>
                            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
                        </div>
                        <div className="items-center gap-2 mt-3 sm:flex">
                            <button type="button" onClick={onClose} className="w-full mt-2 p-2.5 flex-1 text-gray-800 bg-gray-100 rounded-md outline-none border ring-offset-2 ring-indigo-600 focus:ring-2">Cancel</button>
                            <button type="submit" className="w-full mt-2 p-2.5 flex-1 text-white bg-indigo-600 rounded-md outline-none ring-offset-2 ring-indigo-600 focus:ring-2">Create Bill</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
