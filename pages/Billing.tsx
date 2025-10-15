import React, { useState, useEffect } from 'react';
import type { BillableTest, Encounter } from '../types';
import { createBill, getBillableDetailsForEncounter } from '../services/api';

export const Billing: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    encounter: Encounter | null;
    onBillCreated: () => void;
}> = ({ isOpen, onClose, encounter, onBillCreated }) => {
    // State for Bill Creation Modal
    const [billedTests, setBilledTests] = useState<BillableTest[]>([]);
    const [serviceRequestIds, setServiceRequestIds] = useState<number[]>([]);
    const [isDuePayment, setIsDuePayment] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [paidAmount, setPaidAmount] = useState(0);
    const [notes, setNotes] = useState('');
    const [dueDate, setDueDate] = useState('');

    // Effect for fetching billable details for modal
    useEffect(() => {
        if (isOpen && encounter) {
            const fetchBillableDetails = async () => {
                try {
                    const details = await getBillableDetailsForEncounter(encounter.id.toString());
                    const allTests = details.serviceRequests.flatMap(sr => sr.tests);
                    const ids = details.serviceRequests.map(sr => sr.serviceRequestId);
                    setBilledTests(allTests);
                    setServiceRequestIds(ids);
                } catch (error) {
                    console.error('Failed to fetch billable details:', error);
                }
            };
            fetchBillableDetails();
            
            setDiscount(0);
            setPaymentMethod('CASH');
            setPaidAmount(0);
            setNotes('');
            setDueDate('');
        }
    }, [isOpen, encounter]);

    // Bill Creation Modal Logic
    const totalAmount = billedTests.reduce((sum, test) => sum + test.price, 0);

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
        };

        try {
            await createBill(billData);
            alert('Bill created successfully!');
            onBillCreated && onBillCreated();
            onClose && onClose();
        } catch (error) {
            console.error('Failed to create bill:', error);
            alert(`Failed to create bill: ${(error as Error).message}`);
        }
    };

    if (!isOpen || !encounter) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-8 border w-full max-w-6xl shadow-lg rounded-md bg-white">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Billing for Encounter #{encounter.localEncounterValue}</h2>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                    <h3 className="font-semibold text-lg mb-2">Patient Details</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div><strong>UHID:</strong> {encounter.mrnId}</div>
                        <div><strong>Name:</strong> {encounter.patientName}</div>
                        <div><strong>Date:</strong> {new Date(encounter.date).toLocaleDateString()}</div>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="overflow-x-auto mb-6">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">S.no.</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Test/Package</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {billedTests.map((test, index) => (
                                    <tr key={test.testId}>
                                        <td className="px-4 py-3 text-sm">{index + 1}</td>
                                        <td className="px-4 py-3 text-sm font-medium">{test.testName}</td>
                                        <td className="px-4 py-3 text-sm text-right">₹{test.price.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <button type="button" onClick={() => handleDeleteTest(test.testId)} className="text-red-500 hover:text-red-700 font-semibold">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-between items-start">
                        <div className="space-y-4">
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2">Payment Method</label>
                                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
                                    <option value="CASH">Cash</option>
                                    <option value="CARD">Card</option>
                                    <option value="UPI">UPI</option>
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2">Notes</label>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
                            </div>
                        </div>

                        <div className="w-1/3 space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Amount:</span>
                                <span className="font-medium">₹{totalAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <label htmlFor="discount" className="text-gray-600">Discount (%):</label>
                                <input id="discount" type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="w-28 px-2 py-1 border border-gray-300 rounded-md text-right" />
                            </div>
                            <div className="flex justify-between border-t pt-2">
                                <span className="font-semibold text-lg">Total Amount:</span>
                                <span className="font-semibold text-lg text-indigo-600">₹{(totalAmount * (1 - discount / 100)).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center">
                                <input type="checkbox" id="due-payment" checked={isDuePayment} onChange={() => setIsDuePayment(!isDuePayment)} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                                <label htmlFor="due-payment" className="ml-2 block text-sm text-gray-900">Due Payment</label>
                            </div>
                            {isDuePayment && (
                                <>
                                    <div className="flex justify-between items-center">
                                        <label htmlFor="paid-amount" className="text-gray-600">Paid Amount:</label>
                                        <input id="paid-amount" type="number" value={paidAmount} onChange={e => setPaidAmount(Number(e.target.value))} className="w-28 px-2 py-1 border border-gray-300 rounded-md text-right" />
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-red-600 font-semibold">Due Amount:</span>
                                        <span className="text-red-600 font-semibold">₹{(totalAmount * (1 - discount / 100) - paidAmount).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <label htmlFor="due-date" className="text-gray-600">Due Date:</label>
                                        <input id="due-date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-36 px-2 py-1 border border-gray-300 rounded-md" />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 focus:outline-none">
                            Cancel
                        </button>
                        <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75">
                            Create Bill
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
