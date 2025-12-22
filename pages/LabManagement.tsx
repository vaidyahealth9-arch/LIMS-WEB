import React, { useState, useEffect } from 'react';
import {
    getEnabledTestsForLab,
    getAnalytesForOrganization,
    addOrUpdateAnalyteForOrganization,
    createOrUpdateOrganizationTest,
    setAnalytesForOrganizationTest,
} from '../services/api';
import type { OrganizationTest, Analyte } from '../types';
import { useNotifications } from '../services/NotificationContext';

const AssignAnalytesModal = ({ isOpen, onClose, test, allAnalytes, onSave }) => {
    const [selectedAnalyteIds, setSelectedAnalyteIds] = useState<Set<number>>(new Set());

    const handleCheckboxChange = (analyteId: number) => {
        setSelectedAnalyteIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(analyteId)) {
                newSet.delete(analyteId);
            } else {
                newSet.add(analyteId);
            }
            return newSet;
        });
    };

    const handleSave = () => {
        onSave(test.testId, Array.from(selectedAnalyteIds));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full">
                <h3 className="text-xl font-bold mb-4">Manage Analytes for {test.testName}</h3>
                <div className="max-h-96 overflow-y-auto">
                    {allAnalytes.map(analyte => (
                        <div key={analyte.id} className="flex items-center justify-between p-2 border-b">
                            <label htmlFor={`analyte-${analyte.id}`}>{analyte.name} ({analyte.code})</label>
                            <input
                                type="checkbox"
                                id={`analyte-${analyte.id}`}
                                checked={selectedAnalyteIds.has(analyte.id)}
                                onChange={() => handleCheckboxChange(analyte.id)}
                                className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                            />
                        </div>
                    ))}
                </div>
                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500">Save Analytes</button>
                </div>
            </div>
        </div>
    );
};


const LabManagement: React.FC = () => {
    const { addNotification } = useNotifications();
    const [orgTests, setOrgTests] = useState<OrganizationTest[]>([]);
    const [analytes, setAnalytes] = useState<Analyte[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [organizationId, setOrganizationId] = useState<string | null>(null);

    const [testForm, setTestForm] = useState({ testId: '', price: '', isEnabled: true });
    const [analyteForm, setAnalyteForm] = useState({ analyteId: '', name: '', price: '', code: '', bioReference: '' });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTest, setSelectedTest] = useState<OrganizationTest | null>(null);

    useEffect(() => {
        const orgId = localStorage.getItem('organizationId');
        if (orgId) {
            setOrganizationId(orgId);
        } else {
            addNotification({ type: 'error', title: 'Error', message: 'Organization ID not found.' });
            setIsLoading(false);
        }
    }, [addNotification]);

    const fetchData = async () => {
        if (!organizationId) return;
        try {
            setIsLoading(true);
            const [testsData, analytesData] = await Promise.all([
                getEnabledTestsForLab(organizationId),
                getAnalytesForOrganization(organizationId),
            ]);
            setOrgTests(testsData);
            setAnalytes(analytesData);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred';
            addNotification({ type: 'error', title: 'Failed to Fetch Data', message, persist: true });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if(organizationId) {
            fetchData();
        }
    }, [organizationId]);

    const handleTestFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setTestForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleTestFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organizationId) return;

        try {
            await createOrUpdateOrganizationTest(organizationId, {
                ...testForm,
                price: parseFloat(testForm.price),
                testId: parseInt(testForm.testId)
            });
            addNotification({ type: 'success', title: 'Test Saved', message: 'Organization test has been saved successfully.' });
            setTestForm({ testId: '', price: '', isEnabled: true });
            fetchData();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred';
            addNotification({ type: 'error', title: 'Failed to Save Test', message, persist: true });
        }
    };

    const handleAnalyteFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setAnalyteForm(prev => ({ ...prev, [name]: value }));
    };

    const handleAnalyteFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organizationId) return;

        const payload = {
            analyteId: analyteForm.analyteId ? parseInt(analyteForm.analyteId) : undefined,
            name: analyteForm.name,
            price: analyteForm.price ? parseFloat(analyteForm.price) : null,
            code: analyteForm.code,
            bioReference: analyteForm.bioReference,
        };

        try {
            await addOrUpdateAnalyteForOrganization(organizationId, payload);
            addNotification({ type: 'success', title: 'Analyte Saved', message: 'Analyte has been saved successfully.' });
            setAnalyteForm({ analyteId: '', name: '', price: '', code: '', bioReference: '' });
            fetchData();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred';
            addNotification({ type: 'error', title: 'Failed to Save Analyte', message, persist: true });
        }
    };

    const openAnalyteModal = (test: OrganizationTest) => {
        setSelectedTest(test);
        setIsModalOpen(true);
    };

    const handleSaveAnalytesForTest = async (testId: number, analyteIds: number[]) => {
        if (!organizationId) return;
        try {
            await setAnalytesForOrganizationTest(organizationId, testId.toString(), analyteIds.map(String));
            addNotification({ type: 'success', title: 'Analytes Assigned', message: 'Analytes have been assigned to the test.' });
            setIsModalOpen(false);
            setSelectedTest(null);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred';
            addNotification({ type: 'error', title: 'Failed to Assign Analytes', message, persist: true });
        }
    };

    if (isLoading) {
        return <div className="p-8">Loading lab management data...</div>;
    }

    const inputClass = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500";
    const buttonClass = "px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500";
    const thClass = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase";
    const tdClass = "px-4 py-4 whitespace-nowrap text-gray-500";

    return (
        <div className="container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-8">
                <div className="bg-white p-8 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Manage Organization Test</h2>
                    <form onSubmit={handleTestFormSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="testId" className="block text-sm font-medium text-gray-700">Test ID</label>
                            <input type="number" name="testId" id="testId" value={testForm.testId} onChange={handleTestFormChange} required className={inputClass} placeholder="Enter master test ID"/>
                        </div>
                        <div>
                            <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price</label>
                            <input type="number" step="0.01" name="price" id="price" value={testForm.price} onChange={handleTestFormChange} required className={inputClass} placeholder="e.g., 150.00"/>
                        </div>
                        <div className="flex items-center">
                            <input type="checkbox" name="isEnabled" id="isEnabled" checked={testForm.isEnabled} onChange={handleTestFormChange} className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"/>
                            <label htmlFor="isEnabled" className="ml-2 block text-sm text-gray-900">Enable this test</label>
                        </div>
                        <div className="text-right">
                            <button type="submit" className={buttonClass}>Save Test</button>
                        </div>
                    </form>
                </div>

                <div className="bg-white p-8 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Available Organization Tests</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className={thClass}>Name</th>
                                    <th className={thClass}>Local Code</th>
                                    <th className={thClass}>Price</th>
                                    <th className={thClass}>Status</th>
                                    <th className={thClass}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {orgTests.map(test => (
                                    <tr key={test.testId}>
                                        <td className={`font-medium text-gray-900 ${tdClass}`}>{test.testName}</td>
                                        <td className={tdClass}>{test.testLocalCode}</td>
                                        <td className={tdClass}>${test.price.toFixed(2)}</td>
                                        <td className={tdClass}>{test.isEnabled ? 'Enabled' : 'Disabled'}</td>
                                        <td className={tdClass}>
                                            <button onClick={() => openAnalyteModal(test)} className="text-cyan-600 hover:text-cyan-800 font-semibold">
                                                Manage Analytes
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                 <div className="bg-white p-8 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Manage Organization Analyte</h2>
                    <form onSubmit={handleAnalyteFormSubmit} className="space-y-4">
                        <p className="text-sm text-gray-600">Leave Analyte ID blank to create a new one.</p>
                        <div>
                            <label htmlFor="analyteId" className="block text-sm font-medium text-gray-700">Analyte ID (for updates)</label>
                            <input type="number" name="analyteId" id="analyteId" value={analyteForm.analyteId} onChange={handleAnalyteFormChange} className={inputClass} placeholder="Optional"/>
                        </div>
                         <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Analyte Name</label>
                            <input type="text" name="name" id="name" value={analyteForm.name} onChange={handleAnalyteFormChange} className={inputClass} placeholder="e.g., Glucose" required/>
                        </div>
                        <div>
                            <label htmlFor="code" className="block text-sm font-medium text-gray-700">Code</label>
                            <input type="text" name="code" id="code" value={analyteForm.code} onChange={handleAnalyteFormChange} className={inputClass} placeholder="e.g., GLU" required/>
                        </div>
                        <div>
                            <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price</label>
                            <input type="number" step="0.01" name="price" id="price" value={analyteForm.price} onChange={handleAnalyteFormChange} className={inputClass} placeholder="Optional"/>
                        </div>
                        <div>
                            <label htmlFor="bioReference" className="block text-sm font-medium text-gray-700">Bio. Reference</label>
                            <input type="text" name="bioReference" id="bioReference" value={analyteForm.bioReference} onChange={handleAnalyteFormChange} className={inputClass} placeholder="e.g., 70-110 mg/dL"/>
                        </div>
                        <div className="text-right">
                            <button type="submit" className={buttonClass}>Save Analyte</button>
                        </div>
                    </form>
                </div>

                <div className="bg-white p-8 rounded-xl shadow-lg">
                     <h2 className="text-2xl font-bold text-gray-800 mb-6">Available Organization Analytes</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                           <thead className="bg-gray-50">
                                <tr>
                                    <th className={thClass}>Name</th>
                                    <th className={thClass}>Code</th>
                                    <th className={thClass}>Bio. Reference</th>
                                    <th className={thClass}>Source</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {analytes.map(analyte => (
                                    <tr key={analyte.id}>
                                        <td className={`font-medium text-gray-900 ${tdClass}`}>{analyte.name}</td>
                                        <td className={tdClass}>{analyte.code}</td>
                                        <td className={tdClass}>{analyte.bioReference}</td>
                                        <td className={tdClass}>{analyte.isOrgSpecific ? 'Organization' : 'Common'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {selectedTest && (
                <AssignAnalytesModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    test={selectedTest}
                    allAnalytes={analytes}
                    onSave={handleSaveAnalytesForTest}
                />
            )}
        </div>
    );
};

export default LabManagement;
