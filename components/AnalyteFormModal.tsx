import React, { useState, useEffect } from 'react';
import type { Analyte } from '../types';

interface AnalyteFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (analyteData: any) => void;
    analyte: Analyte | null;
    analyteOptions?: Analyte[];
}

const AnalyteFormModal: React.FC<AnalyteFormModalProps> = ({ isOpen, onClose, onSave, analyte }) => {
    const [formState, setFormState] = useState({
        analyteId: '',
        name: '',
        price: '',
        code: '',
        bioReference: '',
    });

    useEffect(() => {
        if (isOpen && analyte) {
            setFormState({
                analyteId: analyte.id.toString(),
                name: analyte.name,
                price: analyte.price ? analyte.price.toString() : '',
                code: analyte.code,
                bioReference: analyte.bioReference,
            });
        } else {
            setFormState({
                analyteId: '',
                name: '',
                price: '',
                code: '',
                bioReference: '',
            });
        }
    }, [analyte, isOpen]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormState(prevState => ({ ...prevState, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            analyteId: formState.analyteId ? parseInt(formState.analyteId) : undefined,
            name: formState.name,
            price: formState.price ? parseFloat(formState.price) : null,
            code: formState.code,
            bioReference: formState.bioReference,
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
                <h2 className="text-2xl font-bold text-gray-800 mb-6">{analyte ? 'Edit Organization Analyte' : 'Add New Organization Analyte'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {analyte && (
                        <div>
                            <label htmlFor="analyteId" className="block text-sm font-medium text-gray-700">Analyte ID</label>
                            <input
                                type="text"
                                name="analyteId"
                                id="analyteId"
                                value={formState.analyteId}
                                readOnly
                                disabled
                                className={`${inputClass} bg-gray-100`}
                            />
                        </div>
                    )}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Analyte Name</label>
                        <input
                            type="text"
                            name="name"
                            id="name"
                            value={formState.name}
                            onChange={handleInputChange}
                            required
                            className={inputClass}
                            placeholder="e.g., Glucose"
                        />
                    </div>
                    <div>
                        <label htmlFor="code" className="block text-sm font-medium text-gray-700">Code</label>
                        <input
                            type="text"
                            name="code"
                            id="code"
                            value={formState.code}
                            onChange={handleInputChange}
                            required
                            className={inputClass}
                            placeholder="e.g., GLU"
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
                            className={inputClass}
                            placeholder="Optional"
                        />
                    </div>
                    <div>
                        <label htmlFor="bioReference" className="block text-sm font-medium text-gray-700">Bio. Reference</label>
                        <input
                            type="text"
                            name="bioReference"
                            id="bioReference"
                            value={formState.bioReference}
                            onChange={handleInputChange}
                            className={inputClass}
                            placeholder="e.g., 70-110 mg/dL"
                        />
                    </div>
                    <div className="flex justify-end gap-4 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">Cancel</button>
                        <button type="submit" className={buttonClass}>
                            {analyte ? 'Update Analyte' : 'Add Analyte'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AnalyteFormModal;
