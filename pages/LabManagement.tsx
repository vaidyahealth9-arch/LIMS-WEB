import React, { useState, useEffect } from 'react';
import type { Test } from '../types';
import { getAllTests, getEnabledTestsForLab, enableTestForLab } from '../services/api';
import InterpretationRuleModal from '../components/InterpretationRuleModal';


const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean, testId: string }> = ({ checked, onChange, disabled, testId }) => (
    <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" disabled={disabled} data-testid={`toggle-${testId}`} />
        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
    </label>
);

const LabManagement: React.FC = () => {
    const [allTests, setAllTests] = useState<Test[]>([]);
    // Stores the prices for ONLY the tests enabled by the lab.
    // The presence of a key indicates the test is enabled.
    const [labPrices, setLabPrices] = useState<Map<string, number>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatingTests, setUpdatingTests] = useState<Set<string>>(new Set());
    const [selectedTest, setSelectedTest] = useState<Test | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                setError(null);
                // Use the centralized API services to fetch data
                const orgId = localStorage.getItem('organizationId');
                if (!orgId) {
                    throw new Error('Organization ID not found');
                }
                const [masterList, labConfiguration] = await Promise.all([
                    getAllTests(),
                    getEnabledTestsForLab(orgId)
                ]);
                console.log('masterList', masterList);
                console.log('labConfiguration', labConfiguration);

                const enabledTestsMap = new Map<string, number>();
                labConfiguration.forEach(config => {
                    if (config.isEnabled) {
                        enabledTestsMap.set(config.testId, config.price);
                    }
                });

                setAllTests(masterList);
                setLabPrices(enabledTestsMap);
            } catch (e) {
                setError("Failed to load test data. Please refresh the page.");
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const handleToggleTest = async (testId: string, isEnabled: boolean) => {
        setUpdatingTests(prev => new Set(prev).add(testId));
        const originalPrices = new Map(labPrices);

        const newPrices = new Map(labPrices);
        let priceToUpdate: number | null = null;
        
        if (isEnabled) {
            priceToUpdate = 0; // Set default price to 0 on enabling
            newPrices.set(testId, priceToUpdate);
        } else {
            priceToUpdate = originalPrices.get(testId) ?? null;
            newPrices.delete(testId);
        }
        
        setLabPrices(newPrices); // Optimistic update

        try {
            // Use the centralized API service to update data
            const orgId = localStorage.getItem('organizationId');
            if (!orgId) {
                throw new Error('Organization ID not found');
            }
            await enableTestForLab(orgId, { testId: parseInt(testId, 10), isEnabled: isEnabled, price: priceToUpdate });
        } catch (e) {
            setLabPrices(originalPrices); // Revert on failure
            alert((e as Error).message);
        } finally {
            setUpdatingTests(prev => {
                const newUpdating = new Set(prev);
                newUpdating.delete(testId);
                return newUpdating;
            });
        }
    };

    const handlePriceChange = (testId: string, newPriceStr: string) => {
        const newPrice = Number(newPriceStr);
        if (isNaN(newPrice) || newPrice < 0) return;
        
        const newPrices = new Map(labPrices);
        newPrices.set(testId, newPrice);
        setLabPrices(newPrices);
    };

    const handlePriceUpdate = async (testId: string) => {
        const price = labPrices.get(testId);
        if (price === undefined) return;

        setUpdatingTests(prev => new Set(prev).add(testId));

        try {
            // Use the centralized API service to update data
            const orgId = localStorage.getItem('organizationId');
            if (!orgId) {
                throw new Error('Organization ID not found');
            }
            await enableTestForLab(orgId, { testId: parseInt(testId, 10), isEnabled: true, price });
        } catch (e) {
            alert((e as Error).message);
            // Optionally revert price change here by refetching data
        } finally {
             setUpdatingTests(prev => {
                const newUpdating = new Set(prev);
                newUpdating.delete(testId);
                return newUpdating;
            });
        }
    };
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Lab Test Configuration</h2>
                <p className="text-gray-500 mt-1">Select which tests your laboratory will perform and set the price for each.</p>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64"><p>Loading test configuration...</p></div>
            ) : error ? (
                <div className="text-red-500 bg-red-100 p-4 rounded-md">{error}</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test Name</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lab Price</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Perform Test</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {allTests.map(test => {
                                const isTestEnabled = labPrices.has(test.id);
                                const isUpdating = updatingTests.has(test.id);
                                const labPrice = labPrices.get(test.id) ?? '';

                                return (
                                    <tr key={test.id} className={`hover:bg-gray-50 transition-opacity ${isUpdating ? 'opacity-50' : 'opacity-100'}`}>
                                        <td className="px-4 py-4 whitespace-nowrap font-medium text-gray-900">{test.testName}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-gray-500">{test.department}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-gray-500">{test.method}</td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            {isTestEnabled ? (
                                                <div className="relative">
                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                                                    <input
                                                        type="number"
                                                        value={labPrice}
                                                        onChange={(e) => handlePriceChange(test.id, e.target.value)}
                                                        onBlur={() => handlePriceUpdate(test.id)}
                                                        disabled={isUpdating}
                                                        className="w-32 pl-7 pr-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                                        aria-label={`Price for ${test.test_name}`}
                                                    />
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 px-2.5">N/A</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            <ToggleSwitch 
                                                checked={isTestEnabled}
                                                onChange={(isEnabled) => handleToggleTest(test.id, isEnabled)}
                                                disabled={isUpdating}
                                                testId={test.id}
                                            />
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            <button
                                                onClick={() => setSelectedTest(test)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                                disabled={!isTestEnabled}
                                            >
                                                Manage Rules
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            {selectedTest && (
                <InterpretationRuleModal
                    test={selectedTest}
                    organizationId={localStorage.getItem('organizationId')!}
                    onClose={() => setSelectedTest(null)}
                />
            )}
        </div>
    );
};

export default LabManagement;