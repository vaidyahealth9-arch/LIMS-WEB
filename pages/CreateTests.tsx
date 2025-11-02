import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getEnabledTestsForLab, createServiceRequest, getEncounterById } from '../services/api';
import type { OrganizationTest, Encounter } from '../types';
import { useNotifications } from '../services/NotificationContext';
import Barcode from 'react-barcode';

const CreateTests: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const encounterFromState = location.state?.encounter;
    const { addNotification } = useNotifications();

    const [availableTests, setAvailableTests] = useState<OrganizationTest[]>([]);
    const [selectedTests, setSelectedTests] = useState<Record<string, { numberOfSpecimens: number; specimenTypeId: number; testName: string; }>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [createdServiceRequest, setCreatedServiceRequest] = useState<any>(null);
    const [generatedBarcodes, setGeneratedBarcodes] = useState<Array<{ testName: string; barcode: string }>>([]);
    const barcodeRef = useRef<HTMLDivElement>(null);
    const [isLoadingTests, setIsLoadingTests] = useState(true);
    const [encounter, setEncounter] = useState<Encounter | null>(encounterFromState);
    const [isLoadingEncounter, setIsLoadingEncounter] = useState(false);

    const handlePrint = () => {
        const node = barcodeRef.current;
        if (node) {
            const printWindow = window.open('', '', 'height=600,width=800');
            if (printWindow) {
                const newDocument = printWindow.document;
                newDocument.write('<html><head><title>Print Barcodes</title>');

                // Copy styles
                const links = document.getElementsByTagName('link');
                for (let i = 0; i < links.length; i++) {
                    newDocument.write(links[i].outerHTML);
                }
                const styles = document.getElementsByTagName('style');
                for (let i = 0; i < styles.length; i++) {
                    newDocument.write(styles[i].outerHTML);
                }

                newDocument.write('</head><body>');
                newDocument.write(node.innerHTML);
                newDocument.write('</body></html>');
                newDocument.close();

                printWindow.focus();
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 1000); // Wait for styles to load
            }
        }
    };

    // Fetch full encounter details to ensure we have patientId
    useEffect(() => {
        const fetchEncounterDetails = async () => {
            if (encounterFromState && encounterFromState.id) {
                try {
                    setIsLoadingEncounter(true);
                    const fullEncounter = await getEncounterById(encounterFromState.id.toString());
                    console.log('Full encounter details:', fullEncounter);
                    setEncounter(fullEncounter);
                } catch (error) {
                    console.error('Failed to fetch encounter details:', error);
                    // Fallback to state encounter if fetch fails
                    setEncounter(encounterFromState);
                } finally {
                    setIsLoadingEncounter(false);
                }
            }
        };
        fetchEncounterDetails();
    }, [encounterFromState]);

    useEffect(() => {
        const fetchTests = async () => {
            const orgId = localStorage.getItem('organizationId');
            console.log('Fetching tests for org:', orgId);
            if (orgId) {
                try {
                    setIsLoadingTests(true);
                    const tests = await getEnabledTestsForLab(orgId);
                    console.log('Available tests loaded:', tests);
                    setAvailableTests(tests);
                } catch (error) {
                    console.error('Failed to fetch tests:', error);
                    addNotification({
                        type: 'error',
                        title: 'Failed to Load Tests',
                        message: 'Could not load available tests',
                        persist: false
                    });
                } finally {
                    setIsLoadingTests(false);
                }
            } else {
                console.error('No organization ID found');
                setIsLoadingTests(false);
            }
        };
        fetchTests();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const selectedTestIds = Object.keys(selectedTests);
        console.log('Submit clicked, selected tests:', selectedTests);

        if (selectedTestIds.length === 0) {
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

        // Validate encounter data
        if (!encounter.patientId || !encounter.id) {
            addNotification({
                type: 'error',
                title: 'Invalid Encounter',
                message: 'Encounter is missing patient or encounter ID',
                persist: false
            });
            setIsLoading(false);
            return;
        }

        const serviceRequestData = {
            patientId: encounter.patientId,
            requesterId: parseInt(userId, 10),
            encounterId: encounter.id,
            status: 'active',
            priority: 'routine',
            tests: Object.entries(selectedTests).map(([testId, testInfo]) => ({
                testId: parseInt(testId, 10),
                specimenTypeId: testInfo?.specimenTypeId,
                numberOfSpecimens: testInfo?.numberOfSpecimens,
            })),
        };

        console.log("Service request data:", serviceRequestData);

        try {
            console.log('Calling createServiceRequest API...');
            const result = await createServiceRequest(serviceRequestData);
            console.log('API response:', result);
            setCreatedServiceRequest(result);
            
            // Generate barcodes for each test
            const barcodes = result?.requestedTests.flatMap(test => {
                return test.specimenBarcodes.map(specimenBarcode => ({
                    testName: test?.testName || 'Unknown Test',
                    barcode: specimenBarcode
                }));
            });
            setGeneratedBarcodes(barcodes);
            
            addNotification({
                type: 'success',
                title: 'Tests Added Successfully',
                message: `${selectedTestIds.length} test(s) added with barcodes generated`,
                persist: true
            });
            
        } catch (error) {
            console.error('Failed to create service request:', error);
            
            let errorMessage = 'Unknown error occurred';
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            }
            
            console.error('Error details:', { error, errorMessage, type: typeof error });
            
            addNotification({
                type: 'error',
                title: 'Failed to Add Tests',
                message: errorMessage,
                persist: true
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!encounter || isLoadingEncounter) {
        return (
            <div className="container mx-auto px-4 py-6">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl mx-auto text-center">
                    {isLoadingEncounter ? (
                        <div className="mb-6">
                            <div className="w-20 h-20 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="animate-spin h-10 w-10 text-cyan-600" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading Encounter Details...</h2>
                            <p className="text-gray-600">Please wait while we fetch the encounter information.</p>
                        </div>
                    ) : (
                        <>
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
                        </>
                    )}
                </div>
            </div>
        );
    }

    const toggleTest = (testId: string) => {
        const test = availableTests.find(t => String(t.testId) === testId);
        if (!test) return;

        setSelectedTests(prev => {
            const newSelection = { ...prev };
            if (newSelection[testId]) {
                delete newSelection[testId];
            } else {
                newSelection[testId] = {
                    testName: test.testName,
                    specimenTypeId: test.specimenTypeId,
                    numberOfSpecimens: test.defaultNumberOfSpecimens || 1,
                };
            }
            return newSelection;
        });
    };

    const handleSpecimenCountChange = (testId: string, count: number) => {
        if (count < 1) return; // Or some other validation

        setSelectedTests(prev => ({
            ...prev,
            [testId]: {
                ...prev[testId],
                numberOfSpecimens: count,
            },
        }));
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
                {/* Barcode Display Section */}
                {generatedBarcodes.length > 0 && (
                    <div className="mb-8 p-6 border-2 border-emerald-300 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 shadow-sm">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-emerald-800">Tests Added Successfully!</h3>
                                    <p className="text-sm text-emerald-600 mt-1">Barcodes generated for specimen collection</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handlePrint}
                                    className="px-4 py-2 bg-white border-2 border-emerald-500 text-emerald-700 font-semibold rounded-lg hover:bg-emerald-50 transition-colors flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                    Print Barcodes
                                </button>
                                <button
                                    onClick={() => navigate('/patient-list')}
                                    className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                                >
                                    Continue
                                </button>
                            </div>
                        </div>
                        
                        {/* Barcodes Grid */}
                        <div ref={barcodeRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                            {generatedBarcodes.map((item, index) => (
                                <div key={index} className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-sm print-barcode">
                                    <div className="text-center mb-2">
                                        <p className="text-xs font-semibold text-gray-600 mb-1">Patient: {encounter.patientName}</p>
                                        <p className="text-xs text-gray-500">MRN: {encounter.mrnId}</p>
                                        <p className="font-bold text-sm text-gray-800 mt-2">{item.testName}</p>
                                    </div>
                                    <div className="flex justify-center bg-white p-2 rounded">
                                    <img src={`data:image/png;base64,${item.barcode}`} alt={`Barcode for ${item.testName}`} className="max-w-full h-auto" />
                                    </div>
                                    <p className="text-xs text-center text-gray-500 mt-2">
                                        {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Encounter Details Card */}
                {generatedBarcodes.length === 0 && (
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
                )}

                {generatedBarcodes.length === 0 && (
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Available Tests Section */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-teal-500 rounded-full"></div>
                                <h3 className="text-lg font-bold text-gray-800">Available Tests</h3>
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
                                    onClick={() => {
                                        const allTests = availableTests.reduce((acc, test) => {
                                            acc[test.testId] = {
                                                testName: test.testName,
                                                specimenTypeId: test.specimenTypeId,
                                                numberOfSpecimens: test.defaultNumberOfSpecimens || 1,
                                            };
                                            return acc;
                                        }, {} as Record<string, { numberOfSpecimens: number; specimenTypeId: number; testName: string; }>);
                                        setSelectedTests(allTests);
                                    }}
                                    className="text-xs px-3 py-1.5 bg-cyan-100 text-cyan-700 font-semibold rounded-lg hover:bg-cyan-200 transition-colors"
                                >
                                    Select All
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedTests({})}
                                    className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Clear All
                                </button>
                            </div>

                            {/* Test List */}
                            <div className="border-2 border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                                {isLoadingTests ? (
                                    <div className="text-center py-12">...</div> // Loading spinner
                                ) : filteredTests.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">...</div> // No tests found
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {filteredTests.map(test => (
                                            <label
                                                key={test.testId}
                                                className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-cyan-50 transition-colors ${
                                                    Object.keys(selectedTests).includes(String(test.testId)) ? 'bg-cyan-50/50' : ''
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={Object.keys(selectedTests).includes(String(test.testId))}
                                                    onChange={() => toggleTest(String(test.testId))}
                                                    className="w-5 h-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500 focus:ring-2"
                                                />
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-800">{test.testName}</p>
                                                    {test.testCode && (
                                                        <p className="text-xs text-gray-500 mt-0.5">Code: {test.testCode}</p>
                                                    )}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Selected Tests Section */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-1 h-6 bg-gradient-to-b from-emerald-500 to-green-500 rounded-full"></div>
                                <h3 className="text-lg font-bold text-gray-800">Selected Tests</h3>
                                <span className="ml-auto text-sm text-gray-500">
                                    {Object.keys(selectedTests).length} test(s) selected
                                </span>
                            </div>

                            <div className="border-2 border-gray-200 rounded-lg max-h-[28rem] overflow-y-auto p-2 space-y-2 bg-gray-50/50">
                                {Object.keys(selectedTests).length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <p>No tests selected yet.</p>
                                    </div>
                                ) : (
                                    Object.entries(selectedTests).map(([testId, testInfo]) => (
                                        <div key={testId} className="flex items-center gap-4 p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-800">{testInfo.testName}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <label htmlFor={`specimen-count-${testId}`} className="text-sm font-medium text-gray-600">Specimens:</label>
                                                <input
                                                    type="number"
                                                    id={`specimen-count-${testId}`}
                                                    min="1"
                                                    value={testInfo.numberOfSpecimens}
                                                    onChange={(e) => handleSpecimenCountChange(testId, parseInt(e.target.value, 10))}
                                                    className="w-20 px-2 py-1 border-2 border-gray-200 rounded-md shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                                                />
                                            </div>
                                            <button type="button" onClick={() => toggleTest(testId)} className="text-red-500 hover:text-red-700">
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-8 pt-6 border-t-2 border-gray-100">
                        
                        <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-600">
                                <span className="font-semibold">{Object.keys(selectedTests).length}</span> test(s) selected
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
                                    disabled={isLoading || Object.keys(selectedTests).length === 0}
                                    className="px-8 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-cyan-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">...</svg>
                                            Adding Tests...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">...</svg>
                                            Add Tests {Object.keys(selectedTests).length > 0 && `(${Object.keys(selectedTests).length})`}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
                )}
            </div>
        </div>
    );
};

export default CreateTests;
