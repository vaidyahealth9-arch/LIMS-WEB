import React, { useState, useEffect } from 'react';
import type { Bill } from '../types';

interface InvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    bill: Bill | any;
    organizationGstin?: string;
    formatCurrency: (amount: number) => string;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
    isOpen,
    onClose,
    bill,
    organizationGstin = '27AAAHV1234A1Z1',
    formatCurrency
}) => {
    const [invoiceDetails, setInvoiceDetails] = useState<{ items: any[], pricingReliable: boolean } | null>(null);

    useEffect(() => {
        if (bill) {
            // Process bill items for a clean display
            let items = [];
            let pricingReliable = true;

            if (bill.testItems && Array.isArray(bill.testItems) && bill.testItems.length > 0) {
                // If we have explicit test items with prices (ideal)
                items = bill.testItems.map((item: any) => ({
                    testName: item.testName,
                    listPrice: item.price,
                    discount: 0,
                    netPrice: item.price
                }));
            } else if (bill.serviceRequests && Array.isArray(bill.serviceRequests)) {
                // Fallback to service requests
                items = bill.serviceRequests.flatMap((sr: any) => 
                    (sr.tests || []).map((t: any) => ({
                        testName: t.testName,
                        listPrice: t.price,
                        discount: 0,
                        netPrice: t.price
                    }))
                );
            }

            if (items.length === 0) {
                // Last resort: single consolidated item
                items = [{
                    testName: 'Consolidated Diagnostic Services',
                    listPrice: bill.totalAmount || bill.netAmount,
                    discount: bill.discountAmount || 0,
                    netPrice: bill.netAmount
                }];
                pricingReliable = false;
            }

            setInvoiceDetails({ items, pricingReliable });
        }
    }, [bill]);

    const handlePrintInvoice = () => {
        // Small delay to ensure any layout transitions are settled
        setTimeout(() => {
            window.print();
        }, 100);
    };

    if (!isOpen || !bill) return null;

    const BillStatusBadge = ({ status }: { status: string }) => {
        const classes = status === 'PAID' 
            ? 'bg-emerald-100 text-emerald-800' 
            : status === 'PARTIALLY_PAID' 
                ? 'bg-amber-100 text-amber-800' 
                : 'bg-red-100 text-red-800';
        return (
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${classes}`}>
                {status.replace(/_/g, ' ')}
            </span>
        );
    };

    return (
        <div id="invoice-modal-wrapper" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 px-4 print:p-0 print:static print:bg-white print:z-0 print:block print:backdrop-blur-none">
            <style>
                {`
                @media print {
                    @page { size: A4; margin: 10mm; }
                    body { 
                        visibility: hidden !important;
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                    }
                    #invoice-modal-wrapper, #invoice-modal-wrapper * {
                        visibility: visible !important;
                    }
                    #invoice-modal-wrapper { 
                        position: absolute !important; 
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        background: white !important; 
                        display: block !important; 
                        padding: 0 !important; 
                        margin: 0 !important;
                        backdrop-filter: none !important;
                    }
                    #invoice-modal { 
                        box-shadow: none !important; 
                        max-height: none !important; 
                        width: 100% !important; 
                        border: none !important; 
                        border-radius: 0 !important; 
                        transform: none !important; 
                        animation: none !important;
                        position: static !important;
                        overflow: visible !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .print-hide { display: none !important; }
                    .rounded-3xl { border-radius: 0.5rem !important; }
                    .shadow-2xl, .shadow-lg, .shadow-sm { box-shadow: none !important; }
                }
                `}
            </style>
            <div id="invoice-modal" className="bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-300 print:max-h-none print:overflow-visible print:rounded-none print:animate-none">
                <div className="border-b border-slate-200 px-10 py-8 bg-slate-50/50 flex justify-between items-center">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Tax Invoice</h2>
                            <div className="flex items-center gap-3 mt-1">
                                <p className="text-sm font-bold text-blue-600 font-mono tracking-wider">{bill.invoiceNumber || `INV-${bill.billId}`}</p>
                                <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{new Date(bill.invoiceDate || bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Billing Status</p>
                            <div className="mt-1">
                                <BillStatusBadge status={bill.status} />
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="print-hide w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all shadow-sm"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="p-10 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                        <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Laboratory Information</p>
                            <p className="text-2xl font-black text-slate-900 tracking-tight">VAIDYA LABS</p>
                            <p className="text-sm font-bold text-slate-500 mt-1">Diagnostic Excellence & Research</p>
                            <div className="mt-6 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </div>
                                    <p className="text-xs font-bold text-slate-600">Main Healthcare Campus, Mumbai</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                    </div>
                                    <p className="text-xs font-bold text-slate-600">+91 98765 43210</p>
                                </div>
                                <div className="pt-3 border-t border-slate-200/60 mt-3">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">GSTIN</p>
                                    <p className="text-xs font-mono font-bold text-slate-700">{organizationGstin}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Patient Information</p>
                            <div className="flex items-start gap-5">
                                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                </div>
                                <div className="flex-1">
                                    <p className="text-xl font-black text-slate-900 leading-none mb-2">{bill.patientName}</p>
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wider">MRN: {bill.patientMrn || bill.mrnId}</span>
                                        <span className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md uppercase tracking-wider">Enc: #{bill.localEncounterId || bill.localEncounterValue}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Contact Number</p>
                                            <p className="text-xs font-bold text-slate-700">Not provided</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Billing ID</p>
                                            <p className="text-xs font-bold text-slate-700">#{bill.billId}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 overflow-hidden mb-10 shadow-sm">
                        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Diagnostic Services</h3>
                            <span className="text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">{invoiceDetails?.items.length} Items Listed</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead>
                                    <tr className="bg-slate-50/30">
                                        <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider w-16">#</th>
                                        <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Description of Service</th>
                                        <th className="text-right px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Base Rate</th>
                                        <th className="text-right px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Disc.</th>
                                        <th className="text-right px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Net Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {invoiceDetails?.items.map((item, index) => (
                                        <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 text-xs font-bold text-slate-400 font-mono">{String(index + 1).padStart(2, '0')}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-800">{item.testName}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600 text-right font-medium">{invoiceDetails?.pricingReliable ? formatCurrency(item.listPrice) : '—'}</td>
                                            <td className="px-6 py-4 text-sm text-red-500 text-right font-medium">{invoiceDetails?.pricingReliable ? formatCurrency(item.discount) : '—'}</td>
                                            <td className="px-6 py-4 text-sm font-black text-slate-900 text-right">{invoiceDetails?.pricingReliable ? formatCurrency(item.netPrice) : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {!invoiceDetails?.pricingReliable && (
                                <div className="px-6 py-3 text-[11px] text-amber-700 bg-amber-50/50 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <p className="font-semibold italic">Individual test pricing is currently unavailable. Referring to consolidated total below.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                        <div className="md:col-span-3">
                            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Payment Summary</p>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Payment Method</p>
                                        <p className="text-sm font-black text-slate-900">{bill.paymentMethod || 'CASH'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Receipt Status</p>
                                        <p className="text-sm font-black text-emerald-600 uppercase tracking-tight">{bill.status}</p>
                                    </div>
                                </div>
                                <div className="mt-6 pt-6 border-t border-slate-200">
                                    <p className="text-[10px] font-bold text-slate-400 italic">This is a computer-generated document. No signature is required. Rates are inclusive of all applicable taxes.</p>
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <div className="space-y-3 px-2">
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span className="text-slate-500">Subtotal</span>
                                    <span className="text-slate-900">{formatCurrency(bill.totalAmount || bill.netAmount)}</span>
                                </div>
                                {bill.discountPercentage > 0 && (
                                    <div className="flex justify-between items-center text-sm font-bold">
                                        <span className="text-slate-500">Global Discount ({bill.discountPercentage}%)</span>
                                        <span className="text-red-500">- {formatCurrency(bill.discountAmount || 0)}</span>
                                    </div>
                                )}
                                <div className="h-px bg-slate-200 my-4"></div>
                                <div className="flex justify-between items-center bg-slate-900 p-6 rounded-2xl text-white shadow-lg shadow-slate-200 ring-4 ring-slate-50">
                                    <span className="text-xs font-black uppercase tracking-widest">Total Payable</span>
                                    <span className="text-2xl font-black">{formatCurrency(bill.netAmount)}</span>
                                </div>
                                <div className="mt-6 space-y-2">
                                    <div className="flex justify-between items-center text-xs font-bold px-1">
                                        <span className="text-slate-400">Paid to date</span>
                                        <span className="text-emerald-600">{formatCurrency(bill.paidAmount)}</span>
                                    </div>
                                    {bill.netAmount - bill.paidAmount > 0 && (
                                        <div className="flex justify-between items-center text-xs font-bold px-1">
                                            <span className="text-slate-400">Outstanding Balance</span>
                                            <span className="text-red-600">{formatCurrency(bill.netAmount - bill.paidAmount)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {bill.notes && (
                        <div className="mt-10 p-6 rounded-2xl bg-amber-50 border border-amber-100">
                            <p className="text-[10px] font-black text-amber-700 uppercase tracking-[0.2em] mb-2">Notes & Remarks</p>
                            <p className="text-xs font-bold text-amber-900 leading-relaxed">{bill.notes}</p>
                        </div>
                    )}

                    <div className="mt-12 flex justify-between items-end border-t border-slate-100 pt-10">
                        <div className="text-slate-400 text-[10px] space-y-1.5 max-w-sm">
                            <p className="font-black uppercase tracking-wider text-slate-500 mb-2">Standard Terms</p>
                            <p>• This document is computer-generated and legally valid without a physical signature.</p>
                            <p>• For any billing queries, please quote the invoice number mentioned in the header.</p>
                            <p>• Diagnostic reports will be available once the billing is fully settled.</p>
                        </div>
                        <div className="text-center">
                            <div className="w-48 h-16 flex items-center justify-center border-b border-slate-200 mb-3 grayscale opacity-40">
                                <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>
                            </div>
                            <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">Authorized Signatory</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">Vaidya Diagnostic Center</p>
                        </div>
                    </div>
                </div>

                <div className="print-hide bg-slate-50 px-10 py-6 border-t border-slate-200 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Document Hash: {bill.billId.toString(16).toUpperCase()}</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all shadow-sm"
                        >
                            Close View
                        </button>
                        <button
                            onClick={handlePrintInvoice}
                            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 transition-all flex items-center gap-2.5 shadow-sm"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Print Document
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
