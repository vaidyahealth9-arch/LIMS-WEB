import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getEnabledTestsForLab, createServiceRequest } from '../services/api';
import type { OrganizationTest } from '../types';

const CreateTests: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const encounter = location.state?.encounter;

    const [availableTests, setAvailableTests] = useState<OrganizationTest[]>([]);
    const [selectedTests, setSelectedTests] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchTests = async () => {
            const orgId = localStorage.getItem('organizationId');
            if (orgId) {
                try {
                    const tests = await getEnabledTestsForLab(orgId);
                    setAvailableTests(tests);
                } catch (error) {
                    console.error('Failed to fetch tests:', error);
                }
            }
        };
        fetchTests();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const userId = localStorage.getItem('userId');

        if (!userId) {
            alert('User ID not found. Please log in again.');
            setIsLoading(false);
            return;
        }

        console.log("XXX", encounter)

        const serviceRequestData = {
            patientId: encounter.patientId,
            requesterId: parseInt(userId, 10),
            encounterId: encounter.id,
            status: 'ACTIVE',
            priority: 'routine',
            testIds: selectedTests.map(id => parseInt(id, 10)),
        };

        try {
            await createServiceRequest(serviceRequestData);
            alert('Service request created successfully!');
            navigate('/patient-list');
        } catch (error) {
            console.error('Failed to create service request:', error);
            alert(`Failed to create service request: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (!encounter) {
        return (
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto text-center">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Error: No Encounter Selected</h2>
                <p className="text-gray-700">Please select an encounter before creating tests.</p>
                <button
                    onClick={() => navigate('/patient-list')}
                    className="mt-6 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75"
                >
                    Go to Patient List
                </button>
            </div>
        );
    }

    const handleTestSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { options } = e.target;
        const value: string[] = [];
        for (let i = 0, l = options.length; i < l; i += 1) {
            if (options[i].selected) {
                value.push(options[i].value);
            }
        }
        setSelectedTests(value);
    }

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Add Tests for {encounter.patientName}</h2>
            
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-800">Encounter Details</h3>
                <p className="text-gray-600 mt-2"><strong>MRN:</strong> {encounter.mrnId}</p>
                <p className="text-gray-600"><strong>Date:</strong> {new Date(encounter.date).toLocaleString()}</p>
            </div>

            <form onSubmit={handleSubmit}> 
                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label htmlFor="tests" className="block text-sm font-medium text-gray-700">Available Tests</label>
                        <select
                            multiple
                            id="tests"
                            value={selectedTests}
                            onChange={handleTestSelection}
                            className="mt-1 block w-full h-60 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            {availableTests.map(test => (
                                <option key={test.testId} value={test.testId}>{test.testName}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="mt-8 flex justify-end">
                    <button
                        type="submit"
                        className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Adding...' : 'Add Tests'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateTests;
