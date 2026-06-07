import React, { useState, useEffect } from 'react';
import type { Bill, Organization } from '../types';
import { getOrganizationById } from '../services/api';

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
    organizationGstin,
    formatCurrency
}) => {
    const [invoiceDetails, setInvoiceDetails] = useState<{ items: any[], pricingReliable: boolean } | null>(null);
    const [organization, setOrganization] = useState<Organization | null>(null);

    useEffect(() => {
        if (bill) {
            let items: any[] = [];
            let pricingReliable = true;

            if (bill.testItems && Array.isArray(bill.testItems) && bill.testItems.length > 0) {
                items = bill.testItems.map((item: any) => ({
                    testName: item.testName,
                    listPrice: item.price,
                    discount: 0,
                    netPrice: item.price,
                }));
            } else if (bill.serviceRequests && Array.isArray(bill.serviceRequests)) {
                items = bill.serviceRequests.flatMap((sr: any) =>
                    (sr.tests || []).map((t: any) => ({
                        testName: t.testName,
                        listPrice: t.price,
                        discount: 0,
                        netPrice: t.price,
                    }))
                );
            }

            if (items.length === 0) {
                items = [{
                    testName: 'Consolidated Diagnostic Services',
                    listPrice: bill.totalAmount || bill.netAmount,
                    discount: bill.discountAmount || 0,
                    netPrice: bill.netAmount,
                }];
                pricingReliable = false;
            }

            setInvoiceDetails({ items, pricingReliable });

            const orgId = bill.organizationId || localStorage.getItem('organizationId');
            if (orgId) {
                getOrganizationById(String(orgId)).then(setOrganization).catch(console.error);
            }
        }
    }, [bill]);

    const handlePrintInvoice = () => {
        window.focus();
        setTimeout(() => { window.print(); }, 150);
    };

    if (!isOpen || !bill) return null;

    const BillStatusBadge = ({ status }: { status: string }) => {
        const classes =
            status === 'PAID'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : status === 'PARTIALLY_PAID'
                ? 'bg-amber-100 text-amber-800 border-amber-200'
                : 'bg-rose-100 text-rose-800 border-rose-200';
        return (
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${classes}`}>
                {status.replace(/_/g, ' ')}
            </span>
        );
    };

    const orgName    = organization?.organizationName || 'VAIDYA LABS';
    const orgType    = organization?.orgType           || 'Diagnostic Excellence & Research';
    const orgAddress = organization
        ? `${organization.addressLine1}, ${organization.city}, ${organization.state} ${organization.postalCode}`
        : 'Main Healthcare Campus, Mumbai';
    const orgPhone   = organization?.contactPhone || '+91 98765 43210';
    const orgEmail   = organization?.contactEmail || 'support@vaidyalabs.com';
    const orgGstin   = organization?.gstin || organizationGstin || 'Not Available';

    return (
        <div id="invoice-modal-wrapper" className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-50 px-4">

            {/* ─── PRINT STYLES ─── */}
            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 10mm;
                    }

                    /* Reset container heights and overflows to allow proper multi-page printing */
                    html, body, #root, [class*="h-screen"], [class*="overflow-hidden"], main {
                        height: auto !important;
                        overflow: visible !important;
                        min-height: 0 !important;
                    }

                    /* Hide everything except the modal visually */
                    body { visibility: hidden; background: white !important; margin: 0 !important; padding: 0 !important; }
                    
                    #invoice-modal-wrapper { 
                        visibility: visible; 
                        display: block !important;
                        position: absolute !important; 
                        left: 0 !important; 
                        top: 0 !important; 
                        width: 100% !important;
                        height: auto !important;
                        min-height: 0 !important;
                        background: white !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        box-sizing: border-box !important;
                        backdrop-filter: none !important;
                        z-index: 9999;
                    }
                    #invoice-modal-wrapper * { visibility: visible; }

                    /* Remove modal chrome for print */
                    #invoice-modal {
                        display: block !important;
                        max-height: none !important;
                        overflow: visible !important;
                        width: 100% !important;
                        max-width: none !important;
                        border: none !important;
                        border-radius: 0 !important;
                        box-shadow: none !important;
                        animation: none !important;
                        transform: none !important;
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    /* Convert dark header → clean light header for print */
                    #inv-header {
                        background: #f8fafc !important; /* Lighter for print */
                        border: 1px solid #e2e8f0 !important;
                        border-radius: 8px !important;
                        padding: 15px !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    #inv-header h1   { color: #0f172a !important; }
                    #inv-header h2   { color: #1e293b !important; }
                    #inv-header p    { color: #475569 !important; }
                    #inv-header .inv-sub { color: #4f46e5 !important; }
                    #inv-icon {
                        background: #eff6ff !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    #inv-icon svg { color: #2563eb !important; }

                    /* Tighten body for print */
                    #inv-body { padding: 20px 0 !important; }

                    /* Hide action bar */
                    .print-hide { display: none !important; visibility: hidden !important; }

                    /* Table print rules */
                    table { border-collapse: collapse !important; width: 100% !important; }
                    thead { display: table-header-group; }
                    tr    { page-break-inside: avoid; }
                    th, td { border-bottom: 1px solid #f1f5f9 !important; }
                }
            `}</style>

            {/* ─── MODAL CARD ─── */}
            <div
                id="invoice-modal"
                className="bg-white w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl border border-slate-200 flex flex-col"
            >
                {/* ── COMPACT HEADER ── */}
                <div
                    id="inv-header"
                    className="flex justify-between items-center px-6 py-3.5 bg-slate-900 rounded-t-2xl flex-shrink-0"
                >
                    {/* Lab brand */}
                    <div className="flex items-center gap-3">
                        <div id="inv-icon" className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                            <svg className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-base font-black text-white leading-tight">{orgName}</h1>
                            <p className="inv-sub text-[10px] font-semibold text-indigo-300 uppercase tracking-wider leading-tight mt-0.5">{orgType}</p>
                        </div>
                    </div>

                    {/* Invoice title */}
                    <div className="text-right">
                        <h2 className="text-xl font-black text-white tracking-tighter uppercase leading-none">Invoice</h2>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 tracking-widest">
                            #{bill.invoiceNumber || `INV-${bill.billId}`}
                        </p>
                    </div>
                </div>

                {/* ── BODY ── */}
                <div id="inv-body" className="flex-1 px-6 py-5 overflow-visible">

                    {/* Billed To & Meta */}
                    <div className="grid grid-cols-2 gap-4 mb-5">
                        <div className="bg-slate-50 px-4 py-3.5 rounded-xl border border-slate-100">
                            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1.5">Billed To</p>
                            <p className="text-sm font-black text-slate-900 mb-0.5">{bill.patientName}</p>
                            <p className="text-xs text-slate-600 mb-0.5">
                                <span className="text-slate-400 w-9 inline-block">MRN:</span>
                                <span className="font-semibold">{bill.patientMrn || bill.mrnId}</span>
                            </p>
                            <p className="text-xs text-slate-600">
                                <span className="text-slate-400 w-9 inline-block">Enc:</span>
                                <span className="font-semibold">#{bill.localEncounterId || bill.localEncounterValue}</span>
                            </p>
                        </div>

                        <div className="bg-white border border-slate-100 px-4 py-3.5 rounded-xl">
                            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Invoice Date</p>
                                <p className="text-xs font-black text-slate-800 text-right">
                                    {new Date(bill.invoiceDate || bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Due Date</p>
                                <p className="text-xs font-black text-slate-800 text-right">
                                    {new Date(bill.invoiceDate || bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider self-center">Status</p>
                                <div className="text-right"><BillStatusBadge status={bill.status} /></div>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="mb-5 rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest">
                                    <th className="px-3 py-2.5 w-10 text-center border-b border-slate-200">#</th>
                                    <th className="px-3 py-2.5 border-b border-slate-200">Service Description</th>
                                    <th className="px-3 py-2.5 text-right border-b border-slate-200">Rate</th>
                                    <th className="px-3 py-2.5 text-right border-b border-slate-200">Discount</th>
                                    <th className="px-3 py-2.5 text-right border-b border-slate-200 bg-slate-50">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {invoiceDetails?.items.map((item, index) => (
                                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-3 py-2.5 text-xs font-bold text-slate-400 text-center">{String(index + 1).padStart(2, '0')}</td>
                                        <td className="px-3 py-2.5 text-sm font-semibold text-slate-800">{item.testName}</td>
                                        <td className="px-3 py-2.5 text-xs text-slate-600 text-right">{invoiceDetails?.pricingReliable ? formatCurrency(item.listPrice) : '—'}</td>
                                        <td className="px-3 py-2.5 text-xs text-rose-500 text-right">{invoiceDetails?.pricingReliable ? formatCurrency(item.discount) : '—'}</td>
                                        <td className="px-3 py-2.5 text-sm font-black text-slate-900 text-right">{invoiceDetails?.pricingReliable ? formatCurrency(item.netPrice) : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!invoiceDetails?.pricingReliable && (
                            <div className="px-4 py-2.5 text-xs text-amber-800 bg-amber-50 border-t border-amber-200 flex items-center gap-2">
                                <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-semibold">Individual test pricing unavailable. Showing consolidated total.</span>
                            </div>
                        )}
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end mb-5">
                        <div className="w-60 bg-slate-50 px-4 py-3.5 rounded-xl border border-slate-100 space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Subtotal</span>
                                <span className="font-bold text-slate-800">{formatCurrency(bill.totalAmount || bill.netAmount)}</span>
                            </div>
                            {bill.discountPercentage > 0 && (
                                <div className="flex justify-between text-xs">
                                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Discount ({bill.discountPercentage}%)</span>
                                    <span className="font-bold text-rose-600">− {formatCurrency(bill.discountAmount || 0)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-xs">
                                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Paid to Date</span>
                                <span className="font-bold text-emerald-600">{formatCurrency(bill.paidAmount)}</span>
                            </div>
                            <div className="border-t-2 border-dashed border-slate-200 pt-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-black text-slate-900">Balance Due</span>
                                    <span className="text-sm font-black text-indigo-600">{formatCurrency(bill.netAmount - bill.paidAmount)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-100 pt-4">
                        <div className="grid grid-cols-2 gap-6 items-start">
                            <div>
                                <h4 className="text-sm font-black text-slate-800 mb-1">Thank you for choosing {orgName}!</h4>
                                {bill.notes && (
                                    <div className="mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100 inline-block">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Notes</p>
                                        <p className="text-xs font-semibold text-slate-700 italic">{bill.notes}</p>
                                    </div>
                                )}
                            </div>
                            <div className="text-right">
                                <p className="text-[11px] font-medium text-slate-600">{orgAddress}</p>
                                <p className="text-[11px] font-medium text-slate-600 mt-0.5">{orgPhone} · {orgEmail}</p>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-2 bg-slate-100 inline-block px-2 py-0.5 rounded">
                                    GSTIN: {orgGstin}
                                </p>
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 text-center">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex justify-center items-center gap-1.5">
                                <svg className="w-2.5 h-2.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Generated by Vaidya LIMS — Powering Smart Diagnostic Workflows
                            </p>
                        </div>
                    </div>

                </div>{/* /inv-body */}

                {/* ── ACTION BAR ── */}
                <div className="print-hide bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex justify-end items-center gap-3 rounded-b-2xl flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                    >
                        Close
                    </button>
                    <button
                        onClick={handlePrintInvoice}
                        className="px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-md shadow-indigo-200"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print Invoice
                    </button>
                </div>

            </div>
        </div>
    );
};
