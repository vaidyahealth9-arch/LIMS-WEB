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
import TestFormModal from '../components/TestFormModal';
import AnalyteFormModal from '../components/AnalyteFormModal';

const AssignAnalytesModal = ({ isOpen, onClose, test, allAnalytes, onSave }) => {
    const [selectedAnalyteIds, setSelectedAnalyteIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        // This effect can be used to pre-populate selected analytes if the test object contains them
        // For now, we'll start with an empty set.
        setSelectedAnalyteIds(new Set());
    }, [test, isOpen]);

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

    const [isTestModalOpen, setIsTestModalOpen] = useState(false);
    const [isAnalyteModalOpen, setIsAnalyteModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

    const [editingTest, setEditingTest] = useState<OrganizationTest | null>(null);
    const [editingAnalyte, setEditingAnalyte] = useState<Analyte | null>(null);
    const [assigningTest, setAssigningTest] = useState<OrganizationTest | null>(null);

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

    // Modal Openers
    const handleAddTest = () => {
        setEditingTest(null);
        setIsTestModalOpen(true);
    };

    const handleEditTest = (test: OrganizationTest) => {
        setEditingTest(test);
        setIsTestModalOpen(true);
    };

    const handleAddAnalyte = () => {
        setEditingAnalyte(null);
        setIsAnalyteModalOpen(true);
    };

    const handleEditAnalyte = (analyte: Analyte) => {
        setEditingAnalyte(analyte);
        setIsAnalyteModalOpen(true);
    };

    const openAssignAnalyteModal = (test: OrganizationTest) => {
        setAssigningTest(test);
        setIsAssignModalOpen(true);
    };

    // Save Handlers
    const handleSaveTest = async (testData: any) => {
        if (!organizationId) return;
        try {
            await createOrUpdateOrganizationTest(organizationId, testData);
            addNotification({ type: 'success', title: 'Test Saved', message: `Test ${testData.testId} has been saved.` });
            setIsTestModalOpen(false);
            fetchData();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred';
            addNotification({ type: 'error', title: 'Failed to Save Test', message, persist: true });
        }
    };

    const handleSaveAnalyte = async (analyteData: any) => {
        if (!organizationId) return;
        try {
            await addOrUpdateAnalyteForOrganization(organizationId, analyteData);
            addNotification({ type: 'success', title: 'Analyte Saved', message: `Analyte ${analyteData.name} has been saved.` });
            setIsAnalyteModalOpen(false);
            fetchData();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred';
            addNotification({ type: 'error', title: 'Failed to Save Analyte', message, persist: true });
        }
    };

    const handleSaveAnalytesForTest = async (testId: number, analyteIds: number[]) => {
        if (!organizationId) return;
        try {
            await setAnalytesForOrganizationTest(organizationId, testId.toString(), analyteIds.map(String));
            addNotification({ type: 'success', title: 'Analytes Assigned', message: 'Analytes have been assigned to the test.' });
            setIsAssignModalOpen(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred';
            addNotification({ type: 'error', title: 'Failed to Assign Analytes', message, persist: true });
        }
    };

    if (isLoading) {
        return <div className="p-8">Loading lab management data...</div>;
    }

    const buttonClass = "px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500";
    const thClass = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase";
    const tdClass = "px-4 py-4 whitespace-nowrap text-gray-500";

    return (
        <div className="container mx-auto px-4 py-6 space-y-8">
            <div className="bg-white p-8 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Available Organization Tests</h2>
                    <button onClick={handleAddTest} className={buttonClass}>Add New Test</button>
                </div>
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
                                    <td className={`${tdClass} space-x-2`}>
                                        <button onClick={() => handleEditTest(test)} className="text-indigo-600 hover:text-indigo-900 font-semibold">Edit</button>
                                        <button onClick={() => openAssignAnalyteModal(test)} className="text-cyan-600 hover:text-cyan-800 font-semibold">Manage Analytes</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Available Organization Analytes</h2>
                    <button onClick={handleAddAnalyte} className={buttonClass}>Add New Analyte</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                       <thead className="bg-gray-50">
                            <tr>
                                <th className={thClass}>Name</th>
                                <th className={thClass}>Code</th>
                                <th className={thClass}>Bio. Reference</th>
                                <th className={thClass}>Source</th>
                                <th className={thClass}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {analytes.map(analyte => (
                                <tr key={analyte.id}>
                                    <td className={`font-medium text-gray-900 ${tdClass}`}>{analyte.name}</td>
                                    <td className={tdClass}>{analyte.code}</td>
                                    <td className={tdClass}>{analyte.bioReference}</td>
                                    <td className={tdClass}>{analyte.isOrgSpecific ? 'Organization' : 'Common'}</td>
                                    <td className={tdClass}>
                                        <button onClick={() => handleEditAnalyte(analyte)} className="text-indigo-600 hover:text-indigo-900 font-semibold">Edit</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <TestFormModal
                isOpen={isTestModalOpen}
                onClose={() => setIsTestModalOpen(false)}
                onSave={handleSaveTest}
                test={editingTest}
            />
            <AnalyteFormModal
                isOpen={isAnalyteModalOpen}
                onClose={() => setIsAnalyteModalOpen(false)}
                onSave={handleSaveAnalyte}
                analyte={editingAnalyte}
            />
            {assigningTest && (
                <AssignAnalytesModal
                    isOpen={isAssignModalOpen}
                    onClose={() => setIsAssignModalOpen(false)}
                    test={assigningTest}
                    allAnalytes={analytes}
                    onSave={handleSaveAnalytesForTest}
                />
            )}
        </div>
    );
};

export default LabManagement;
