import React, { useState, useEffect } from 'react';
import { addTest, getAllTests } from '../services/api';
import type { Test } from '../types';
import { useNotifications } from '../services/NotificationContext';

const LabManagement: React.FC = () => {
    const { addNotification } = useNotifications();
    const [tests, setTests] = useState<Test[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [formState, setFormState] = useState({
        testName: '',
        localCode: '',
        price: '',
        lowValue: '',
        highValue: '',
        description: '',
    });

    useEffect(() => {
        fetchTests();
    }, []);

    const fetchTests = async () => {
        try {
            setIsLoading(true);
            const allTests = await getAllTests();
            setTests(allTests);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            addNotification({
                type: 'error',
                title: 'Failed to Fetch Tests',
                message: errorMessage,
                persist: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormState(prevState => ({ ...prevState, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newTest = {
            testName: formState.testName,
            localCode: formState.localCode,
            price: parseFloat(formState.price),
            lowValue: parseFloat(formState.lowValue),
            highValue: parseFloat(formState.highValue),
            description: formState.description,
        };

        try {
            await addTest(newTest);
            addNotification({
                type: 'success',
                title: 'Test Added',
                message: `${formState.testName} has been added successfully.`,
                persist: false,
            });
            setFormState({
                testName: '',
                localCode: '',
                price: '',
                lowValue: '',
                highValue: '',
                description: '',
            });
            fetchTests(); // Refresh the list of tests
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            addNotification({
                type: 'error',
                title: 'Failed to Add Test',
                message: errorMessage,
                persist: true,
            });
        }
    };

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Add New Lab Test</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Form fields */}
                    <div className="col-span-1">
                        <label htmlFor="testName" className="block text-sm font-medium text-gray-700">Test Name</label>
                        <input type="text" name="testName" id="testName" value={formState.testName} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                    </div>
                    <div className="col-span-1">
                        <label htmlFor="localCode" className="block text-sm font-medium text-gray-700">Local Code</label>
                        <input type="text" name="localCode" id="localCode" value={formState.localCode} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                    </div>
                    <div className="col-span-1">
                        <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price</label>
                        <input type="number" name="price" id="price" value={formState.price} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                    </div>
                    <div className="col-span-1">
                        <label htmlFor="lowValue" className="block text-sm font-medium text-gray-700">Low Value</label>
                        <input type="number" name="lowValue" id="lowValue" value={formState.lowValue} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                    </div>
                    <div className="col-span-1">
                        <label htmlFor="highValue" className="block text-sm font-medium text-gray-700">High Value</label>
                        <input type="number" name="highValue" id="highValue" value={formState.highValue} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                    </div>
                    <div className="col-span-2">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea name="description" id="description" value={formState.description} onChange={handleInputChange} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                    </div>
                    <div className="col-span-2 text-right">
                        <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500">
                            Add Test
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg max-w-6xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Available Lab Tests</h2>
                {isLoading ? (
                    <p>Loading tests...</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Local Code</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference Range</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {tests.map(test => (
                                    <tr key={test.id}>
                                        <td className="px-4 py-4 whitespace-nowrap font-medium text-gray-900">{test.testName}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-gray-500">{test.localCode}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-gray-500">{test.price}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-gray-500">{`${test.lowValue} - ${test.highValue}`}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LabManagement;