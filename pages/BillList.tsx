import React, { useState, useEffect } from 'react';
import type { Bill, Paginated } from '../types';
import { searchBills, recordPayment, syncBill, getOrganizationById } from '../services/api';
import { useNotifications } from '../services/NotificationContext';
import { InvoiceModal } from '../components/InvoiceModal';
import { WorkflowStepper } from '../components/WorkflowStepper';

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

const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount || 0);
};

type InvoiceLineItem = {
    testName: string;
    listPrice: number;
    discount: number;
    netPrice: number;
};

const roundTo2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

const buildInvoiceLineItems = (bill: Bill): { items: InvoiceLineItem[]; pricingReliable: boolean } => {
    const sourceItems = Array.isArray(bill.testItems) && bill.testItems.length > 0
        ? bill.testItems
        : (bill.tests || []).map((testName) => ({ testName, price: 0 }));

    const subtotal = Number(bill.totalAmount || 0);
    const explicitDiscount = typeof bill.discountAmount === 'number'
        ? Number(bill.discountAmount)
        : Math.max(0, subtotal - Number(bill.netAmount || 0));

    const effectiveDiscount = roundTo2(Math.max(0, explicitDiscount));
    const hasPricedRows = sourceItems.some((item) => Number(item?.price || 0) > 0);
    const pricingReliable = hasPricedRows || subtotal === 0;

    if (!pricingReliable) {
        return {
            items: sourceItems.map((item) => ({
                testName: item.testName,
                listPrice: 0,
                discount: 0,
                netPrice: 0,
            })),
            pricingReliable: false,
        };
    }

    const items: InvoiceLineItem[] = sourceItems.map((item) => ({
        testName: item.testName,
        listPrice: roundTo2(Number(item?.price || 0)),
        discount: 0,
        netPrice: 0,
    }));

    if (effectiveDiscount <= 0 || subtotal <= 0) {
        return {
            items: items.map((item) => ({ ...item, netPrice: item.listPrice })),
            pricingReliable: true,
        };
    }

    let distributedDiscount = 0;
    items.forEach((item, index) => {
        if (index === items.length - 1) {
            item.discount = roundTo2(Math.max(0, effectiveDiscount - distributedDiscount));
        } else {
            item.discount = roundTo2((item.listPrice / subtotal) * effectiveDiscount);
            distributedDiscount += item.discount;
        }
        item.netPrice = roundTo2(Math.max(0, item.listPrice - item.discount));
    });

    return { items, pricingReliable: true };
};

export const BillList: React.FC = () => {
    const [bills, setBills] = useState<Bill[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 2);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
    const [billForPayment, setBillForPayment] = useState<Bill | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<string | number>('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [organizationGstin, setOrganizationGstin] = useState('');
    const { addNotification } = useNotifications();
    const pageSize = 10;

    useEffect(() => {
        const fetchOrganizationGstin = async () => {
            if (!selectedBill) {
                setOrganizationGstin('');
                return;
            }

            const orgIdFromBill = selectedBill.organizationId;
            const orgIdFromStorage = localStorage.getItem('organizationId');
            const orgId = orgIdFromBill ? String(orgIdFromBill) : orgIdFromStorage;

            if (!orgId) {
                setOrganizationGstin('');
                return;
            }

            try {
                const org = await getOrganizationById(orgId);
                setOrganizationGstin(org.gstin || '');
            } catch {
                setOrganizationGstin('');
            }
        };

        fetchOrganizationGstin();
    }, [selectedBill]);

    const handlePrintInvoice = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow || !selectedBill) return;

        const invoiceContent = document.getElementById('invoice-modal')?.innerHTML || '';
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice - ${selectedBill.invoiceNumber || selectedBill.billId}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
                <style>
                    @page {
                        size: A4;
                        margin: 10mm;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        color: #1e293b;
                        background: #ffffff;
                        line-height: 1.5;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    .print-hide {
                        display: none !important;
                    }

                    #invoice-modal-wrapper {
                        position: static !important;
                        background: transparent !important;
                        padding: 0 !important;
                        display: block !important;
                    }

                    #invoice-modal {
                        width: 100% !important;
                        border: none !important;
                        box-shadow: none !important;
                        overflow: visible !important;
                        max-height: none !important;
                        position: static !important;
                        transform: none !important;
                    }

                    /* High fidelity overrides */
                    .bg-slate-50 { background-color: #f8fafc !important; }
                    .bg-slate-900 { background-color: #0f172a !important; color: white !important; }
                    .bg-blue-600 { background-color: #2563eb !important; color: white !important; }
                    .text-blue-600 { color: #2563eb !important; }
                    .bg-emerald-100 { background-color: #d1fae5 !important; }
                    .text-emerald-800 { color: #065f46 !important; }
                    .border-slate-200 { border-color: #e2e8f0 !important; }
                    
                    @media print {
                        .print-hide { display: none !important; }
                        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    }
                </style>
            </head>
            <body class="bg-white">
                <div id="invoice-modal-wrapper">
                    <div id="invoice-modal">
                        ${invoiceContent}
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.onafterprint = function() {
                                window.close();
                            };
                        }, 500);
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

    const handleSyncBill = async (encounterId: number) => {
        setIsLoading(true);
        try {
            await syncBill(encounterId);
            addNotification({
                type: 'success',
                title: 'Bill Updated',
                message: 'Bill synchronized with current encounter tests successfully.',
                persist: false,
            });
            fetchBills(searchQuery, startDate, endDate, currentPage);
        } catch (error) {
            console.error('Failed to sync bill:', error);
            addNotification({
                type: 'error',
                title: 'Sync Failed',
                message: error instanceof Error ? error.message : 'Failed to synchronize bill.',
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
                <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent mb-2">Bills</h2>
                <p className="text-sm text-gray-600">View and manage billing records</p>
            </div>
            
            {/* Filters - Compact Single Row */}
            <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Search */}
                    <div className="flex-1 min-w-[250px]">
                        <input 
                            type="text" 
                            placeholder="Search by name, MRN, invoice..." 
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
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleDatePreset('7d')} className="px-2.5 py-1.5 text-xs text-cyan-700 bg-cyan-50 rounded-md hover:bg-cyan-100 hover:text-cyan-800 border border-cyan-200 font-medium transition-colors">7d</button>
                        <button onClick={() => handleDatePreset('1m')} className="px-2.5 py-1.5 text-xs text-cyan-700 bg-cyan-50 rounded-md hover:bg-cyan-100 hover:text-cyan-800 border border-cyan-200 font-medium transition-colors">1m</button>
                        <button onClick={() => handleDatePreset('3m')} className="px-2.5 py-1.5 text-xs text-cyan-700 bg-cyan-50 rounded-md hover:bg-cyan-100 hover:text-cyan-800 border border-cyan-200 font-medium transition-colors">3m</button>
                    </div>
                </div>

                {searchQuery && (
                    <div className="flex items-center justify-start mt-3 pt-3 border-t border-gray-300">
                        <button
                            onClick={() => setSearchQuery('')}
                            className="px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md font-medium transition-colors"
                        >
                            Clear
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
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Invoice</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Patient</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">MRN</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Encounter</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Tests</th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Paid</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Progress</th>
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
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-medium">{bill.patientMrn}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{bill.localEncounterId}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{bill.tests.join(', ')}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold text-right">₹{bill.netAmount.toFixed(2)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">₹{bill.paidAmount.toFixed(2)}</td>
                                    <td className="px-4 py-3 min-w-[150px]">
                                        <WorkflowStepper 
                                            status={bill.status === 'PAID' ? 'IN_PROGRESS' : 'ARRIVED'} 
                                            hasTests={true}
                                            billStatus={bill.status}
                                        />
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <BillStatusBadge status={bill.status} />
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                        <button 
                                            onClick={() => setSelectedBill(bill)}
                                            className="text-blue-600 hover:text-blue-900 font-medium text-xs mr-3 px-2 py-1 rounded hover:bg-blue-50"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => handleSyncBill(bill.encounterId)}
                                            className="text-cyan-600 hover:text-cyan-900 font-medium text-xs mr-3 px-2 py-1 rounded hover:bg-cyan-50"
                                        >
                                            Update
                                        </button>
                                        {(bill.status === 'DUE' || bill.status === 'PARTIALLY_PAID') && (
                                            <button
                                                onClick={() => handleRecordPaymentClick(bill)}
                                                className="ml-1 text-emerald-700 hover:text-emerald-900 font-medium text-xs px-2 py-1 rounded hover:bg-emerald-50 border border-emerald-200"
                                            >
                                                Pay
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

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
                        Page {currentPage} of {totalPages}
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

            {billForPayment && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-0 rounded-xl border border-gray-200 w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-green-600">
                            <h3 className="text-xl font-bold text-white">Record Payment</h3>
                        </div>
                        <div className="p-6">
                        <div className="bg-gray-50 p-3 rounded border border-gray-300 mb-6">
                            <p className="text-sm text-gray-600">Invoice: <span className="font-semibold text-gray-900">{billForPayment.invoiceNumber}</span></p>
                            <p className="text-sm text-gray-600 mt-1">Amount Due: <span className="font-semibold text-gray-900">₹{(billForPayment.netAmount - billForPayment.paidAmount).toFixed(2)}</span></p>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label htmlFor="amountPaid" className="block text-xs font-semibold text-gray-600 mb-1">Amount to Pay</label>
                                <input
                                    type="number"
                                    id="amountPaid"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-400 rounded focus:outline-none focus:border-blue-500"
                                    placeholder="Enter amount"
                                />
                            </div>
                            <div>
                                <label htmlFor="paymentMethod" className="block text-xs font-semibold text-gray-600 mb-1">Payment Method</label>
                                <select
                                    id="paymentMethod"
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-400 rounded focus:outline-none focus:border-blue-500"
                                >
                                    <option>CASH</option>
                                    <option>CARD</option>
                                    <option>UPI</option>
                                    <option>BANK_TRANSFER</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="paymentDate" className="block text-xs font-semibold text-gray-600 mb-1">Payment Date</label>
                                <input
                                    type="date"
                                    id="paymentDate"
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-400 rounded focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setBillForPayment(null)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePaymentSubmit}
                                disabled={isLoading}
                                className="px-4 py-2 border border-green-500 text-green-700 text-sm font-semibold rounded hover:bg-green-50 disabled:opacity-50 transition-colors"
                            >
                                {isLoading ? 'Saving...' : 'Submit Payment'}
                            </button>
                        </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedBill && (
                <InvoiceModal
                    isOpen={!!selectedBill}
                    onClose={() => setSelectedBill(null)}
                    bill={selectedBill}
                    formatCurrency={formatCurrency}
                />
            )}
        </div>
    );
};