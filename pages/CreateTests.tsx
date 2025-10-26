import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getEnabledTestsForLab, createServiceRequest } from '../services/api';
import type { OrganizationTest } from '../types';
import { useNotifications } from '../services/NotificationContext';

const CreateTests: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const encounter = location.state?.encounter;
    const { addNotification } = useNotifications();

    const [availableTests, setAvailableTests] = useState<OrganizationTest[]>([]);
    const [selectedTests, setSelectedTests] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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

        if (selectedTests.length === 0) {
            addNotification({
                type: 'error',
                title: 'No Tests Selected',
                message: 'Please select at least one test',
                persist: false
            });
            return;
        }

        setIsLoading(true);

        const userId = localStorage.getItem('userId');

        if (!userId) {
            addNotification({
                type: 'error',
                title: 'Authentication Error',
                message: 'User ID not found. Please log in again.',
                persist: false
            });
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
            addNotification({
                type: 'success',
                title: 'Tests Added Successfully',
                message: `${selectedTests.length} test(s) added to service request`,
                persist: true
            });
            navigate('/patient-list');
        } catch (error) {
            console.error('Failed to create service request:', error);
            addNotification({
                type: 'error',
                title: 'Failed to Add Tests',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
                persist: true
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!encounter) {
        return (
            <div className="container mx-auto px-4 py-6">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl mx-auto text-center">
                    <div className="mb-6">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">No Encounter Selected</h2>
                        <p className="text-gray-600">Please select an encounter before creating tests.</p>
                    </div>
                    <button
                        onClick={() => navigate('/patient-list')}
                        className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-cyan-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all duration-200"
                    >
                        Go to Patient List
                    </button>
                </div>
            </div>
        );
    }

    const toggleTestSelection = (testId: string) => {
        setSelectedTests(prev => 
            prev.includes(testId) 
                ? prev.filter(id => id !== testId)
                : [...prev, testId]
        );
    };

    const filteredTests = availableTests.filter(test =>
        test.testName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="container mx-auto px-4 py-6">
            {/* Header */}
            <div className="mb-6 p-6 rounded-xl" style={{ background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)' }}>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-1">Add Laboratory Tests</h2>
                        <p className="text-cyan-100 text-sm">Select tests for {encounter.patientName}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg max-w-6xl mx-auto">
                {/* Encounter Details Card */}
                <div className="mb-8 p-6 border-2 border-gray-200 rounded-xl bg-gradient-to-br from-gray-50 to-white">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-teal-500 rounded-full"></div>
                        <h3 className="text-lg font-bold text-gray-800">Encounter Details</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                            <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-medium">Patient Name</p>
                                <p className="text-sm font-bold text-gray-800">{encounter.patientName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-medium">MRN</p>
                                <p className="text-sm font-bold text-gray-800">{encounter.mrnId}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-medium">Encounter Date</p>
                                <p className="text-sm font-bold text-gray-800">{new Date(encounter.date).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit}> 
                    {/* Search and Filter */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-teal-500 rounded-full"></div>
                            <h3 className="text-lg font-bold text-gray-800">Available Tests</h3>
                            <span className="ml-auto text-sm text-gray-500">
                                {selectedTests.length} test(s) selected
                            </span>
                        </div>

                        {/* Search Bar */}
                        <div className="relative mb-4">
                            <input
                                type="text"
                                placeholder="Search tests..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-3 pl-11 border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                            />
                            <svg className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-2 mb-4">
                            <button
                                type="button"
                                onClick={() => setSelectedTests(availableTests.map(t => String(t.testId)))}
                                className="text-xs px-3 py-1.5 bg-cyan-100 text-cyan-700 font-semibold rounded-lg hover:bg-cyan-200 transition-colors"
                            >
                                Select All
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedTests([])}
                                className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Clear All
                            </button>
                        </div>

                        {/* Test List */}
                        <div className="border-2 border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                            {filteredTests.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <svg className="w-16 h-16 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="font-medium">No tests found</p>
                                    <p className="text-sm mt-1">Try adjusting your search</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {filteredTests.map(test => (
                                        <label
                                            key={test.testId}
                                            className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-cyan-50 transition-colors ${
                                                selectedTests.includes(String(test.testId)) ? 'bg-cyan-50/50' : ''
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedTests.includes(String(test.testId))}
                                                onChange={() => toggleTestSelection(String(test.testId))}
                                                className="w-5 h-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500 focus:ring-2"
                                            />
                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-800">{test.testName}</p>
                                                {test.testCode && (
                                                    <p className="text-xs text-gray-500 mt-0.5">Code: {test.testCode}</p>
                                                )}
                                            </div>
                                            {selectedTests.includes(String(test.testId)) && (
                                                <svg className="w-5 h-5 text-cyan-600" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-8 pt-6 border-t-2 border-gray-100 flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                            <span className="font-semibold">{selectedTests.length}</span> test(s) selected
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="px-6 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || selectedTests.length === 0}
                                className="px-8 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-cyan-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Adding Tests...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Add Tests
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTests;
