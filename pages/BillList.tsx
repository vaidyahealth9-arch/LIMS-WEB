import React, { useState, useEffect } from 'react';
import type { Bill, Paginated } from '../types';
import { searchBills, recordPayment } from '../services/api';
import { useNotifications } from '../services/NotificationContext';

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
    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
    const [billForPayment, setBillForPayment] = useState<Bill | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<string | number>('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const { addNotification } = useNotifications();
    const pageSize = 10;

    const handlePrintInvoice = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow || !selectedBill) return;

        const invoiceContent = document.getElementById('invoice-modal')?.innerHTML || '';
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice - ${selectedBill.invoiceNumber}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    @page {
                        size: A4;
                        margin: 1cm;
                    }
                    body {
                        margin: 0;
                        padding: 20px;
                        font-family: system-ui, -apple-system, sans-serif;
                    }
                    @media print {
                        .print-hide {
                            display: none !important;
                        }
                        * {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                    }
                </style>
            </head>
            <body>
                ${invoiceContent}
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.onafterprint = function() {
                                window.close();
                            };
                        }, 250);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    useEffect(() => {
        fetchBills(searchQuery, startDate, endDate, 1);
    }, [searchQuery, startDate, endDate]);

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

    const handleRecordPaymentClick = (bill: Bill) => {
        setBillForPayment(bill);
        setPaymentAmount((bill.netAmount - bill.paidAmount).toFixed(2));
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setPaymentMethod('CASH');
    };

    const handlePaymentSubmit = async () => {
        if (!billForPayment) return;

        setIsLoading(true);
        try {
            const paymentData = {
                amountPaid: parseFloat(paymentAmount as string),
                paymentMethod: paymentMethod,
                paymentDate: new Date(paymentDate).toISOString(),
            };

            await recordPayment(billForPayment.billId.toString(), paymentData);

            addNotification({
                type: 'success',
                title: 'Payment Recorded',
                message: `Payment for invoice ${billForPayment.invoiceNumber} recorded successfully.`,
                persist: false,
            });

            setBillForPayment(null);
            fetchBills(searchQuery, startDate, endDate, currentPage);

        } catch (error) {
            console.error('Failed to record payment:', error);
            addNotification({
                type: 'error',
                title: 'Payment Failed',
                message: error instanceof Error ? error.message : 'Failed to record payment.',
                persist: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-white to-cyan-50 p-6 rounded-xl shadow-lg border border-cyan-100">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent mb-2">
                    Bills Dashboard
                </h2>
                <p className="text-sm text-gray-600">Manage billing and invoices</p>
            </div>
            
            {/* Filters - Compact Single Row */}
            <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Search */}
                    <div className="flex-1 min-w-[250px]">
                        <input 
                            type="text" 
                            placeholder="Search by name, MRN, invoice number..." 
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
                        <span className="ml-1.5 text-sm font-bold text-cyan-700">{bills.length}</span>
                        <span className="ml-1 text-xs text-gray-600">bills</span>
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

            {/* Bills Table */}
            <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <svg className="animate-spin h-8 w-8 text-cyan-600" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        <span className="ml-3 text-gray-600">Loading bills...</span>
                    </div>
                ) : bills.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        <p className="mt-2">No bills found</p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-cyan-50 to-teal-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Invoice No.</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Patient Name</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">MRN</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Encounter ID</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Tests</th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Net Amount</th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Paid</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {bills.map((bill) => (
                                <tr key={bill.billId} className="hover:bg-cyan-50 transition-colors">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{bill.invoiceNumber}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{new Date(bill.invoiceDate).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">{bill.patientName}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-cyan-600 font-medium">{bill.patientMrn}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{bill.localEncounterId}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{bill.tests.join(', ')}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold text-right">₹{bill.netAmount.toFixed(2)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">₹{bill.paidAmount.toFixed(2)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <BillStatusBadge status={bill.status} />
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                        <button 
                                            onClick={() => setSelectedBill(bill)}
                                            className="text-cyan-600 hover:text-cyan-900 font-medium"
                                        >
                                            View
                                        </button>
                                        {(bill.status === 'DUE' || bill.status === 'PARTIALLY_PAID') && (
                                            <button
                                                onClick={() => handleRecordPaymentClick(bill)}
                                                className="ml-4 text-green-600 hover:text-green-900 font-medium"
                                            >
                                                Record Payment
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

            {/* Payment Modal */}
            {billForPayment && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                        <h3 className="text-2xl font-bold text-gray-800 mb-4">Record Payment</h3>
                        <p className="mb-2">Invoice: <span className="font-semibold">{billForPayment.invoiceNumber}</span></p>
                        <p className="mb-6">Amount Due: <span className="font-semibold">₹{(billForPayment.netAmount - billForPayment.paidAmount).toFixed(2)}</span></p>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="amountPaid" className="block text-sm font-medium text-gray-700">Amount to Pay</label>
                                <input
                                    type="number"
                                    id="amountPaid"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500"
                                    placeholder="Enter amount"
                                />
                            </div>
                            <div>
                                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700">Payment Method</label>
                                <select
                                    id="paymentMethod"
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500"
                                >
                                    <option>CASH</option>
                                    <option>CARD</option>
                                    <option>UPI</option>
                                    <option>BANK_TRANSFER</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700">Payment Date</label>
                                <input
                                    type="date"
                                    id="paymentDate"
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500"
                                />
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end space-x-4">
                            <button
                                onClick={() => setBillForPayment(null)}
                                className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePaymentSubmit}
                                disabled={isLoading}
                                className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 disabled:opacity-50"
                            >
                                {isLoading ? 'Saving...' : 'Submit Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bill Details Modal */}
            {selectedBill && (
                <div id="invoice-modal-wrapper" className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 backdrop-blur-sm">
                    <div id="invoice-modal" className="bg-white shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto border border-gray-200">
                        {/* Modal Header - Corporate Style */}
                        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-8 py-6 border-b-4 border-cyan-500">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <h2 className="text-2xl font-bold text-white tracking-tight">INVOICE</h2>
                                    </div>
                                    <div className="pl-11">
                                        <p className="text-cyan-300 text-sm font-semibold">Invoice Number</p>
                                        <p className="text-white text-lg font-mono font-bold">{selectedBill.invoiceNumber}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedBill(null)}
                                    className="print-hide text-gray-300 hover:text-white hover:bg-white/10 rounded p-2 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 bg-gray-50">
                            {/* Company Info & Invoice Date - Corporate Header */}
                            <div className="bg-white border border-gray-200 shadow-sm p-6 mb-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Issued By</h3>
                                        <p className="text-lg font-bold text-slate-800">Vaidya Labs</p>
                                        <p className="text-sm text-gray-600 mt-1">Laboratory Information Management System</p>
                                    </div>
                                    <div className="text-right">
                                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Invoice Date</h3>
                                        <p className="text-lg font-bold text-slate-800">{new Date(selectedBill.invoiceDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                        <div className="mt-3">
                                            <BillStatusBadge status={selectedBill.status} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Patient & Encounter Info - Corporate Grid */}
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <div className="bg-white border border-gray-200 shadow-sm p-6">
                                    <div className="flex items-center mb-4 pb-3 border-b border-gray-200">
                                        <div className="bg-slate-100 rounded p-2 mr-3">
                                            <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Patient Details</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Full Name</p>
                                            <p className="text-base font-semibold text-slate-800">{selectedBill.patientName}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Medical Record Number</p>
                                            <p className="text-base font-mono font-bold text-cyan-700">{selectedBill.patientMrn}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white border border-gray-200 shadow-sm p-6">
                                    <div className="flex items-center mb-4 pb-3 border-b border-gray-200">
                                        <div className="bg-slate-100 rounded p-2 mr-3">
                                            <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Encounter Details</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Encounter ID</p>
                                            <p className="text-base font-mono font-bold text-slate-800">{selectedBill.localEncounterId}</p>
                                        </div>
                                        {selectedBill.dueDate && (
                                            <div>
                                                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Payment Due Date</p>
                                                <p className="text-base font-semibold text-red-700">{new Date(selectedBill.dueDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Tests/Services Table - Corporate Style */}
                            <div className="bg-white border border-gray-200 shadow-sm mb-6">
                                <div className="bg-slate-50 border-b border-gray-200 px-6 py-4">
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Services & Laboratory Tests</h3>
                                </div>
                                <div className="overflow-hidden">
                                    <table className="min-w-full">
                                        <thead className="bg-slate-100 border-b border-gray-300">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider w-20">Item #</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Test Description</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {selectedBill.tests.map((test, index) => (
                                                <tr key={index} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 text-sm font-semibold text-gray-600">{String(index + 1).padStart(2, '0')}</td>
                                                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{test}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Payment Summary - Professional Invoice Style */}
                            <div className="bg-white border border-gray-200 shadow-sm">
                                <div className="bg-slate-50 border-b border-gray-200 px-6 py-4">
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Financial Summary</h3>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-4 mb-6">
                                        <div className="flex justify-between items-center py-2">
                                            <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">Subtotal Amount</span>
                                            <span className="text-base font-semibold text-slate-800">₹ {(selectedBill.totalAmount || selectedBill.netAmount).toFixed(2)}</span>
                                        </div>
                                        {selectedBill.discountPercentage > 0 && (
                                            <div className="flex justify-between items-center py-2 border-t border-gray-200">
                                                <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                                                    Discount Applied
                                                    <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">
                                                        {selectedBill.discountPercentage}%
                                                    </span>
                                                </span>
                                                <span className="text-base font-semibold text-red-600">- ₹ {((selectedBill.totalAmount || selectedBill.netAmount) - selectedBill.netAmount).toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center py-3 border-y-2 border-slate-300 bg-slate-50 px-4 -mx-6">
                                            <span className="text-base font-bold text-slate-800 uppercase tracking-wide">Net Payable Amount</span>
                                            <span className="text-xl font-bold text-slate-900">₹ {selectedBill.netAmount.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 mt-4">
                                            <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">Amount Paid</span>
                                            <span className="text-base font-bold text-green-700">₹ {selectedBill.paidAmount.toFixed(2)}</span>
                                        </div>
                                        {selectedBill.status !== 'PAID' && (
                                            <div className="flex justify-between items-center py-3 border-t-2 border-red-300 bg-red-50 px-4 -mx-6 mt-3">
                                                <span className="text-base font-bold text-red-800 uppercase tracking-wide">Outstanding Balance</span>
                                                <span className="text-xl font-bold text-red-700">₹ {(selectedBill.netAmount - selectedBill.paidAmount).toFixed(2)}</span>
                                            </div>
                                        )}
                                        {selectedBill.status === 'PAID' && (
                                            <div className="flex items-center justify-center py-3 bg-green-50 border border-green-200 rounded mt-3">
                                                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="text-sm font-bold text-green-800 uppercase tracking-wide">Fully Paid</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Notes - Corporate Style */}
                            {selectedBill.notes && (
                                <div className="bg-white border border-gray-200 shadow-sm mt-6">
                                    <div className="bg-slate-50 border-b border-gray-200 px-6 py-3 flex items-center">
                                        <svg className="w-4 h-4 text-slate-700 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                        </svg>
                                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Additional Notes</h3>
                                    </div>
                                    <div className="p-6">
                                        <p className="text-sm text-gray-700 leading-relaxed italic">{selectedBill.notes}</p>
                                    </div>
                                </div>
                            )}

                            {/* Footer Disclaimer */}
                            <div className="mt-6 pt-6 border-t-2 border-gray-300">
                                <p className="text-xs text-gray-500 text-center leading-relaxed">
                                    This is a computer-generated invoice and does not require a physical signature. 
                                    For any queries, please contact the billing department. All amounts are in Indian Rupees (INR).
                                </p>
                            </div>
                        </div>

                        {/* Modal Footer - Corporate Actions */}
                        <div className="print-hide bg-slate-100 px-8 py-5 border-t-2 border-slate-300 flex justify-between items-center">
                            <div className="text-xs text-gray-600">
                                <p className="font-semibold">Document ID: {selectedBill.invoiceNumber}</p>
                                <p className="mt-1">Generated on: {new Date(selectedBill.invoiceDate).toLocaleString('en-IN')}</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSelectedBill(null)}
                                    className="px-6 py-2.5 bg-white border-2 border-gray-300 text-slate-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={handlePrintInvoice}
                                    className="px-6 py-2.5 bg-slate-800 border-2 border-slate-800 text-white font-semibold hover:bg-slate-900 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                    Print Invoice
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};