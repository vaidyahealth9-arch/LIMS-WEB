import React, { useState, useEffect } from 'react';
import type { BillableTest, Encounter, ServiceRequest } from '../types';
import { createBill, getBillableDetailsForEncounter, getServiceRequestById, getBillsByEncounter } from '../services/api';

export const Billing: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    encounter: Encounter | null;
    onBillCreated: () => void;
}> = ({ isOpen, onClose, encounter, onBillCreated }) => {
    // State for Bill Creation Modal
    const [billedTests, setBilledTests] = useState<BillableTest[]>([]);
    const [serviceRequestIds, setServiceRequestIds] = useState<number[]>([]);
    const [fullServiceRequests, setFullServiceRequests] = useState<ServiceRequest[]>([]);
    const [billCreatedSuccessfully, setBillCreatedSuccessfully] = useState(false);
    const [isDuePayment, setIsDuePayment] = useState(false);
    const [alreadyPaid, setAlreadyPaid] = useState(0);
    const [existingDue, setExistingDue] = useState(0);
    const [discount, setDiscount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [paidAmount, setPaidAmount] = useState(0);
    const [notes, setNotes] = useState('');
    const [dueDate, setDueDate] = useState('');

    // Effect for fetching billable details for modal
    useEffect(() => {
        if (isOpen && encounter) {
            const fetchDetails = async () => {
                try {
                    const details = await getBillableDetailsForEncounter(encounter.id.toString());
                    const allTests = details.serviceRequests.flatMap(sr => sr.tests);
                    const ids = details.serviceRequests.map(sr => sr.serviceRequestId);
                    setBilledTests(allTests);
                    setServiceRequestIds(ids);

                    const srPromises = ids.map(id => getServiceRequestById(id.toString()));
                    const fetchedServiceRequests = await Promise.all(srPromises);
                    setFullServiceRequests(fetchedServiceRequests);
                } catch (error) {
                    console.error('Failed to fetch billable details:', error);
                }
            };
            fetchDetails();
            
            setDiscount(0);
            setPaymentMethod('CASH');
            setPaidAmount(0);
            setNotes('');
            setDueDate('');
            setBillCreatedSuccessfully(false);
            // default to due payment checked to avoid manual click
            setIsDuePayment(true);

            // fetch any existing bills for this encounter and compute outstanding due
            (async () => {
                try {
                    const bills = await getBillsByEncounter(encounter.id.toString());
                    const totalPaid = bills.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
                    const totalDue = bills.reduce((sum, b) => sum + (b.dueAmount || 0), 0);
                    setAlreadyPaid(totalPaid);
                    setExistingDue(totalDue);
                } catch (err) {
                    console.error('Failed to fetch existing bills for encounter:', err);
                    setAlreadyPaid(0);
                    setExistingDue(0);
                }
            })();
        }
    }, [isOpen, encounter]);

    // Bill Creation Modal Logic
    const testsSubtotal = billedTests.reduce((sum, test) => sum + test.price, 0);
    // totalAmount is the gross amount of all tests
    const totalAmount = testsSubtotal;

    const handleDeleteTest = (testId: number) => {
        setBilledTests(billedTests.filter(test => test.testId !== testId));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!encounter || serviceRequestIds.length === 0) {
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
            // include explicit test items so invoice can display per-test prices
            testItems: billedTests.map(t => ({ testName: t.testName, price: t.price })),
        };

        try {
            await createBill(billData);
            setBillCreatedSuccessfully(true);
            onBillCreated && onBillCreated();
        } catch (error) {
            console.error('Failed to create bill:', error);
            alert(`Failed to create bill: ${(error as Error).message}`);
        }
    };

    if (!isOpen || !encounter) return null;

    if (billCreatedSuccessfully) {
        return (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-10 mx-auto p-8 border w-full max-w-lg shadow-lg rounded-md bg-white">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Bill Created Successfully!</h2>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                        <h3 className="font-semibold text-lg mb-2">Test Barcodes</h3>
                        {fullServiceRequests.flatMap(sr => sr.requestedTests).map(test => (
                            <div key={test.testId} className="flex justify-between items-center py-1">
                                <span className="text-sm font-medium text-gray-700">{test.testName}</span>
                                <span className="text-sm font-semibold text-gray-900 bg-gray-200 px-2 py-0.5 rounded">{test.barcode}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 flex justify-end">
                        <button onClick={() => { setBillCreatedSuccessfully(false); onClose(); }} className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative mx-auto bg-white w-full max-w-6xl shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-slate-900 px-8 py-6 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">Create Billing Statement</h2>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Encounter #{encounter.localEncounterValue}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-8">
                    {/* Patient Summary Card */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="md:col-span-2 p-6 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-6">
                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-400">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                            <div className="flex-1 grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Patient Name</p>
                                    <p className="text-base font-black text-slate-900">{encounter.patientName}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">UHID / MRN</p>
                                    <p className="text-base font-bold text-blue-600 font-mono uppercase tracking-tight">{encounter.mrnId}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 rounded-2xl bg-blue-50 border border-blue-100 flex flex-col justify-center">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Encounter Date</p>
                            <p className="text-base font-black text-blue-900">{new Date(encounter.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Billed Items Table */}
                        <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">#</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Test / Diagnostic Package</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Standard Price</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {billedTests.map((test, index) => (
                                        <tr key={test.testId} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 text-sm font-bold text-slate-400 font-mono">{index + 1}</td>
                                            <td className="px-6 py-4 text-sm font-black text-slate-800">{test.testName}</td>
                                            <td className="px-6 py-4 text-sm text-right font-bold text-slate-900">₹{test.price.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <button type="button" onClick={() => handleDeleteTest(test.testId)} className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 transition-all">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                            {/* Payment Configuration */}
                            <div className="lg:col-span-3 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Payment Method</label>
                                        <div className="relative">
                                            <select 
                                                value={paymentMethod} 
                                                onChange={e => setPaymentMethod(e.target.value)} 
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-bold text-slate-900 focus:border-blue-500 focus:ring-0 transition-all appearance-none"
                                            >
                                                <option value="CASH">Cash Payment</option>
                                                <option value="CARD">Credit/Debit Card</option>
                                                <option value="UPI">UPI / Digital Wallet</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Reference Notes</label>
                                        <textarea 
                                            value={notes} 
                                            onChange={e => setNotes(e.target.value)} 
                                            placeholder="Optional billing remarks..."
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-bold text-slate-900 focus:border-blue-500 focus:ring-0 transition-all h-[52px] resize-none" 
                                        />
                                    </div>
                                </div>

                                <div className="p-6 rounded-2xl bg-amber-50 border border-amber-100 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <h4 className="text-sm font-black text-amber-900">Payment Schedule</h4>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={isDuePayment} onChange={() => setIsDuePayment(!isDuePayment)} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-amber-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                                            <span className="ml-3 text-xs font-bold text-amber-800">Has Due Amount</span>
                                        </label>
                                    </div>

                                    {isDuePayment && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Amount Paying Now</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400 font-bold">₹</span>
                                                    <input 
                                                        type="number" 
                                                        value={paidAmount} 
                                                        onChange={e => setPaidAmount(Number(e.target.value))} 
                                                        className="w-full bg-white border-2 border-amber-200 rounded-xl py-3 pl-8 pr-4 text-sm font-black text-amber-900 focus:border-amber-500 focus:ring-0 transition-all" 
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Tentative Due Date</label>
                                                <input 
                                                    type="date" 
                                                    value={dueDate} 
                                                    onChange={e => setDueDate(e.target.value)} 
                                                    className="w-full bg-white border-2 border-amber-200 rounded-xl py-3 px-4 text-sm font-black text-amber-900 focus:border-amber-500 focus:ring-0 transition-all" 
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Calculation Summary */}
                            <div className="lg:col-span-2">
                                <div className="p-8 rounded-3xl bg-slate-900 text-white shadow-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/10 transition-colors"></div>
                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Final Settlement</h3>
                                    
                                    <div className="space-y-4 mb-8">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400 font-bold">Subtotal Amount</span>
                                            <span className="font-black">₹{totalAmount.toFixed(2)}</span>
                                        </div>
                                        {alreadyPaid > 0 && (
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-emerald-400 font-bold">Already Settled</span>
                                                <span className="font-black">- ₹{alreadyPaid.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-400 font-bold text-sm">Discount (%)</span>
                                            <div className="w-20 relative">
                                                <input 
                                                    type="number" 
                                                    value={discount} 
                                                    onChange={e => setDiscount(Number(e.target.value))} 
                                                    className="w-full bg-white/10 border-none rounded-lg py-1.5 px-3 text-right text-sm font-black text-white focus:ring-1 focus:ring-white/30" 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-px bg-white/10 my-6"></div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Total Payable</span>
                                            <span className="text-3xl font-black tracking-tight text-white">
                                                ₹{Math.max(0, totalAmount * (1 - discount/100) - alreadyPaid).toFixed(2)}
                                            </span>
                                        </div>
                                        {isDuePayment && (
                                            <div className="flex justify-between items-center pt-4 mt-4 border-t border-white/5">
                                                <span className="text-xs font-bold text-amber-400 italic">Remaining Balance</span>
                                                <span className="text-lg font-black text-amber-500">
                                                    ₹{(totalAmount * (1 - discount/100) - alreadyPaid - paidAmount).toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-10 grid grid-cols-2 gap-4">
                                        <button 
                                            type="button" 
                                            onClick={onClose} 
                                            className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-all"
                                        >
                                            Discard
                                        </button>
                                        <button 
                                            type="submit" 
                                            className="px-6 py-4 rounded-2xl bg-blue-600 text-white font-black text-sm shadow-lg shadow-blue-900/40 hover:bg-blue-500 hover:-translate-y-0.5 transition-all"
                                        >
                                            Finalize Bill
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
