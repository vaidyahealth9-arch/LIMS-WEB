import React, { useState, useEffect } from 'react';
import type { MasterTest, OrganizationTest } from '../types';

interface TestFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (testData: any) => void;
    test: OrganizationTest | null;
    availableTests?: MasterTest[];
}

const TestFormModal: React.FC<TestFormModalProps> = ({ isOpen, onClose, onSave, test }) => {
    const [formState, setFormState] = useState({
        testId: '',
        price: '',
        isEnabled: true,
    });

    useEffect(() => {
        if (isOpen && test) {
            setFormState({
                testId: test.testId.toString(),
                price: test.price != null ? test.price.toString() : '',
                isEnabled: test.isEnabled,
            });
        } else {
            setFormState({
                testId: '',
                price: '',
                isEnabled: true,
            });
        }
    }, [test, isOpen]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormState(prevState => ({ ...prevState, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formState,
            price: parseFloat(formState.price),
            testId: parseInt(formState.testId),
        });
    };

    if (!isOpen) {
        return null;
    }

    const inputClass = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500";
    const buttonClass = "px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">{test ? 'Edit Organization Test' : 'Add New Organization Test'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="testId" className="block text-sm font-medium text-gray-700">Test ID</label>
                        <input
                            type="number"
                            name="testId"
                            id="testId"
                            value={formState.testId}
                            onChange={handleInputChange}
                            required
                            className={inputClass}
                            placeholder="Enter master test ID"
                            disabled={!!test}
                        />
                    </div>
                    <div>
                        <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price</label>
                        <input
                            type="number"
                            step="0.01"
                            name="price"
                            id="price"
                            value={formState.price}
                            onChange={handleInputChange}
                            required
                            className={inputClass}
                            placeholder="e.g., 150.00"
                        />
                    </div>
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            name="isEnabled"
                            id="isEnabled"
                            checked={formState.isEnabled}
                            onChange={handleInputChange}
                            className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <label htmlFor="isEnabled" className="ml-2 block text-sm text-gray-900">Enable this test</label>
                    </div>
                    <div className="flex justify-end gap-4 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">Cancel</button>
                        <button type="submit" className={buttonClass}>
                            {test ? 'Update Test' : 'Add Test'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TestFormModal;
