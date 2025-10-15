import React, { useState, useEffect } from 'react';
import type { Bill, Paginated } from '../types';
import { searchBills } from '../services/api';

const BillStatusBadge: React.FC<{ status: Bill['status'] }> = ({ status }) => {
    const statusClasses: Record<Bill['status'], string> = {
        PAID: 'bg-green-100 text-green-800',
        PARTIALLY_PAID: 'bg-yellow-100 text-yellow-800',
        DUE: 'bg-red-100 text-red-800',
        CANCELLED: 'bg-gray-100 text-gray-800',
    };
    const formattedStatus = status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[status]}`}>
            {formattedStatus}
        </span>
    );
};

export const BillList: React.FC = () => {
    const [bills, setBills] = useState<Bill[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const pageSize = 10;

    useEffect(() => {
        fetchBills(searchQuery, startDate, endDate, currentPage);
    }, [currentPage]);

    const fetchBills = async (query: string, start: string, end: string, page: number) => {
        setIsLoading(true);
        try {
            const orgId = localStorage.getItem('organizationId');
            if (!orgId) {
                throw new Error('Organization ID not found');
            }
            const response: Paginated<Bill> = await searchBills(orgId, start, end, query, page - 1, pageSize);
            setBills(response.content);
            setTotalPages(response.totalPages);
            setCurrentPage(page);
        } catch (error) {
            console.error('Failed to fetch bills:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFilter = () => {
        fetchBills(searchQuery, startDate, endDate, 1);
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            fetchBills(searchQuery, startDate, endDate, currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            fetchBills(searchQuery, startDate, endDate, currentPage + 1);
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

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Bills Dashboard</h2>
            
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <input 
                    type="text" 
                    placeholder="Search by patient name, MRN, invoice number..." 
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

            {/* Bills Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice No.</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Date</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MRN</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Encounter ID</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tests</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Amount</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Paid Amount</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {bills.map((bill) => (
                            <tr key={bill.billId}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{bill.invoiceNumber}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(bill.invoiceDate).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bill.patientName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bill.patientMrn}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bill.localEncounterId}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bill.tests.join(', ')}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">₹{bill.netAmount.toFixed(2)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">₹{bill.paidAmount.toFixed(2)}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <BillStatusBadge status={bill.status} />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                    {/* Actions for bills */}
                                    <button className="text-indigo-600 hover:text-indigo-900">View</button>
                                    <button className="text-green-600 hover:text-green-900 ml-2">Print</button>
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
