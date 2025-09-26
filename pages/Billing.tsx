
import React, { useState } from 'react';
import type { BilledTest } from '../types';

const initialPatient = {
    uhid: 'LAB2408210002',
    name: 'Priya Patel',
    age: 28,
    sex: 'Female',
    contact: '9876543211',
};

const mockTests: BilledTest[] = [
    { id: '1', name: 'Complete Blood Picture', department: 'Pathology', sampleContainer: 'EDTA', price: 350 },
    { id: '2', name: 'Liver Function Tests', department: 'Biochemistry', sampleContainer: 'EDTA', price: 400 },
];

const Billing: React.FC = () => {
    const [billedTests, setBilledTests] = useState<BilledTest[]>(mockTests);
    const [isDuePayment, setIsDuePayment] = useState(false);
    
    const totalAmount = billedTests.reduce((sum, test) => sum + test.price, 0);

    const handleDeleteTest = (id: string) => {
        setBilledTests(billedTests.filter(test => test.id !== id));
    };

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Billing</h2>

            {/* Patient Details */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                <h3 className="font-semibold text-lg mb-2">Patient Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><strong>UHID:</strong> {initialPatient.uhid}</div>
                    <div><strong>Name:</strong> {initialPatient.name}</div>
                    <div><strong>Age/Sex:</strong> {initialPatient.age}/{initialPatient.sex}</div>
                    <div><strong>Contact:</strong> {initialPatient.contact}</div>
                </div>
            </div>

            {/* Add Tests/Radiology */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search by test name or test code</label>
                <input type="text" placeholder="Start typing to search for tests/packages..." className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>

            {/* Billed Items Table */}
            <div className="overflow-x-auto mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">S.no.</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Test/Package</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sample Container</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {billedTests.map((test, index) => (
                            <tr key={test.id}>
                                <td className="px-4 py-3 text-sm">{index + 1}</td>
                                <td className="px-4 py-3 text-sm font-medium">{test.name}</td>
                                <td className="px-4 py-3 text-sm">{test.department}</td>
                                <td className="px-4 py-3 text-sm">{test.sampleContainer}</td>
                                <td className="px-4 py-3 text-sm text-right">₹{test.price.toFixed(2)}</td>
                                <td className="px-4 py-3 text-center">
                                    <button onClick={() => handleDeleteTest(test.id)} className="text-red-500 hover:text-red-700 font-semibold">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Payment Section */}
            <div className="flex justify-between items-start">
                <div className="flex items-center space-x-4">
                     <p className="font-medium">Payment Method:</p>
                     <div className="flex space-x-2">
                         <button className="px-4 py-1.5 border border-gray-300 rounded-md hover:bg-gray-100 focus:bg-indigo-100 focus:ring-2 focus:ring-indigo-400">Cash</button>
                         <button className="px-4 py-1.5 border border-gray-300 rounded-md hover:bg-gray-100 focus:bg-indigo-100 focus:ring-2 focus:ring-indigo-400">UPI</button>
                         <button className="px-4 py-1.5 border border-gray-300 rounded-md hover:bg-gray-100 focus:bg-indigo-100 focus:ring-2 focus:ring-indigo-400">Card</button>
                     </div>
                </div>

                <div className="w-1/3 space-y-3">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-medium">₹{totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Discount:</span>
                        <span className="font-medium">₹0.00</span>
                    </div>
                     <div className="flex justify-between border-t pt-2">
                        <span className="font-semibold text-lg">Total Amount:</span>
                        <span className="font-semibold text-lg text-indigo-600">₹{totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center">
                        <input type="checkbox" id="due-payment" checked={isDuePayment} onChange={() => setIsDuePayment(!isDuePayment)} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                        <label htmlFor="due-payment" className="ml-2 block text-sm text-gray-900">Due Payment</label>
                    </div>
                    {isDuePayment && (
                        <>
                            <div className="flex justify-between items-center">
                                <label htmlFor="paid-amount" className="text-gray-600">Paid Amount:</label>
                                <input id="paid-amount" type="number" className="w-28 px-2 py-1 border border-gray-300 rounded-md text-right" />
                            </div>
                            <div className="flex justify-between">
                                <span className="text-red-600 font-semibold">Due Amount:</span>
                                <span className="text-red-600 font-semibold">₹{totalAmount.toFixed(2)}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex justify-end space-x-4">
                <button className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">Print Barcode</button>
                <button className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700">Print Bill</button>
            </div>
        </div>
    );
};

export default Billing;
