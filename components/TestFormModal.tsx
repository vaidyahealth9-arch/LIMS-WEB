import React, { useState, useEffect } from 'react';
import type { MasterTest, OrganizationTest, SpecimenType, Analyte } from '../types';

interface TestFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (testData: any, analyteIds?: number[]) => void;
    test: OrganizationTest | null;
    availableTests?: MasterTest[];
    specimenTypes?: SpecimenType[];
    allAnalytes?: Analyte[];
}

const TestFormModal: React.FC<TestFormModalProps> = ({ 
    isOpen, 
    onClose, 
    onSave, 
    test, 
    availableTests = [], 
    specimenTypes = [], 
    allAnalytes = [] 
}) => {
    const isEditMode = !!test;
    const [currentStep, setCurrentStep] = useState(1);
    
    // Step 1: Test Details State
    const [formState, setFormState] = useState({
        testId: '',
        price: '',
        isEnabled: true,
        specimenTypeId: '',
        defaultNumberOfSpecimens: '1',
    });
    const [searchQuery, setSearchQuery] = useState('');
    
    // Step 2 / Tab 2: Analyte Selection State
    const [selectedAnalyteIds, setSelectedAnalyteIds] = useState<Set<number>>(new Set());
    const [analyteSearchTerm, setAnalyteSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (test) {
                setFormState({
                    testId: test.testId.toString(),
                    price: test.price != null ? test.price.toString() : '',
                    isEnabled: test.isEnabled,
                    specimenTypeId: test.specimenTypeId?.toString() || '',
                    defaultNumberOfSpecimens: test.defaultNumberOfSpecimens?.toString() || '1',
                });
                
                // Pre-populate analytes
                const preselectedFromTest = Array.isArray(test.analyteIds) ? test.analyteIds : [];
                const preselectedFromMappings = allAnalytes
                    .filter(a => a.testId === test.testId || a.associatedTest === test.testName)
                    .map(a => Number(a.id));
                    
                setSelectedAnalyteIds(new Set(preselectedFromTest.length > 0 ? preselectedFromTest : preselectedFromMappings));
                
                // Set initial search query for the picker display
                const matchedTest = availableTests.find(mt => mt.id === test.testId);
                if (matchedTest) setSearchQuery(matchedTest.testName);
                
            } else {
                setFormState({
                    testId: '',
                    price: '',
                    isEnabled: true,
                    specimenTypeId: '',
                    defaultNumberOfSpecimens: '1',
                });
                setSelectedAnalyteIds(new Set());
                setSearchQuery('');
                setCurrentStep(1);
            }
            setAnalyteSearchTerm('');
        }
    }, [test, isOpen, allAnalytes, availableTests]);

    if (!isOpen) return null;

    // ----- Handlers for Step 1 -----
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
        setFormState(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSelectTest = (mt: MasterTest) => {
        setFormState(prev => ({ ...prev, testId: mt.id.toString() }));
        setSearchQuery(mt.testName);
    };
    
    // Filter master tests
    const filteredMasterTests = availableTests.filter(mt => 
        mt.testName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        mt.localCode.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ----- Handlers for Step 2 -----
    const currentTestName = test?.testName || (availableTests.find(t => t.id.toString() === formState.testId)?.testName || '');
    
    const analytesForTest = allAnalytes.filter((analyte) => {
        if (analyte.testId != null) {
            return analyte.testId.toString() === formState.testId;
        }
        return analyte.associatedTest === currentTestName;
    });

    const analytePool = analytesForTest.length > 0 ? analytesForTest : allAnalytes;
    const normalizedAnalyteSearch = analyteSearchTerm.trim().toLowerCase();
    
    const filteredAnalytes = analytePool.filter(a => {
        if (!normalizedAnalyteSearch) return true;
        return `${a.name} ${a.code} ${a.bioReference}`.toLowerCase().includes(normalizedAnalyteSearch);
    });

    const handleAnalyteToggle = (analyteId: number) => {
        setSelectedAnalyteIds(prev => {
            const next = new Set(prev);
            if (next.has(analyteId)) next.delete(analyteId);
            else next.add(analyteId);
            return next;
        });
    };

    // ----- Submission -----
    const handleNext = () => setCurrentStep(2);
    
    const handleSave = () => {
        if (!formState.testId) {
            alert('Please select a test first.');
            return;
        }
        
        const payload = {
            ...formState,
            price: formState.price ? parseFloat(formState.price) : null,
            testId: parseInt(formState.testId),
            specimenTypeId: formState.specimenTypeId ? parseInt(formState.specimenTypeId) : null,
            defaultNumberOfSpecimens: parseInt(formState.defaultNumberOfSpecimens || '1'),
        };
        
        onSave(payload, Array.from(selectedAnalyteIds));
    };

    // ----- UI Classes -----
    const inputClass = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm";
    const labelClass = "block text-sm font-semibold text-gray-700";
    const buttonClass = "px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500";
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-800">
                        {isEditMode ? 'Edit Organization Test' : 'Add New Organization Test'}
                    </h2>
                    
                    {/* Tabs / Wizard Progress */}
                    <div className="flex border-b border-gray-200 mt-6">
                        <button 
                            className={`px-4 py-2 text-sm font-medium border-b-2 focus:outline-none ${currentStep === 1 ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                            onClick={() => setCurrentStep(1)}
                        >
                            {isEditMode ? '1. Test Details' : 'Step 1: Test Details'}
                        </button>
                        <button 
                            className={`px-4 py-2 text-sm font-medium border-b-2 focus:outline-none ${currentStep === 2 ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} ${(isEditMode || formState.testId) ? '' : 'opacity-50 cursor-not-allowed'}`}
                            onClick={() => {
                                if (isEditMode || formState.testId) setCurrentStep(2);
                            }}
                            disabled={!isEditMode && !formState.testId}
                        >
                            {isEditMode ? '2. Assign Analytes' : 'Step 2: Assign Analytes'}
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left Col */}
                                <div className="space-y-4">
                                    <div>
                                        <label className={labelClass}>Master Test</label>
                                        <div className="relative mt-1">
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => {
                                                    setSearchQuery(e.target.value);
                                                    if (e.target.value === '') setFormState(prev => ({ ...prev, testId: '' }));
                                                }}
                                                placeholder="Search by test name or code..."
                                                className={inputClass}
                                                disabled={isEditMode}
                                            />
                                            {!isEditMode && searchQuery && !formState.testId && (
                                                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                                    {filteredMasterTests.length > 0 ? (
                                                        filteredMasterTests.map(mt => (
                                                            <div 
                                                                key={mt.id} 
                                                                className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                                                                onClick={() => handleSelectTest(mt)}
                                                            >
                                                                <div className="font-semibold">{mt.testName}</div>
                                                                <div className="text-xs text-gray-500">Code: {mt.localCode}</div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="px-3 py-2 text-sm text-gray-500">No tests found</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label htmlFor="price" className={labelClass}>Organization Price (₹)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="price"
                                            id="price"
                                            value={formState.price}
                                            onChange={handleInputChange}
                                            className={inputClass}
                                            placeholder="Optional (e.g., 150.00)"
                                        />
                                    </div>
                                    
                                    <div className="flex items-center pt-2">
                                        <input
                                            type="checkbox"
                                            name="isEnabled"
                                            id="isEnabled"
                                            checked={formState.isEnabled}
                                            onChange={handleInputChange}
                                            className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                                        />
                                        <label htmlFor="isEnabled" className="ml-2 block text-sm font-semibold text-gray-900">
                                            Enable test in organization catalog
                                        </label>
                                    </div>
                                </div>
                                
                                {/* Right Col */}
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="specimenTypeId" className={labelClass}>Default Specimen Type</label>
                                        <select
                                            name="specimenTypeId"
                                            id="specimenTypeId"
                                            value={formState.specimenTypeId}
                                            onChange={handleInputChange}
                                            className={inputClass}
                                        >
                                            <option value="">-- None Selected --</option>
                                            {specimenTypes.map(st => (
                                                <option key={st.id} value={st.id}>{st.name} ({st.snomedCode})</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label htmlFor="defaultNumberOfSpecimens" className={labelClass}>Number of Specimens Required</label>
                                        <input
                                            type="number"
                                            min="1"
                                            name="defaultNumberOfSpecimens"
                                            id="defaultNumberOfSpecimens"
                                            value={formState.defaultNumberOfSpecimens}
                                            onChange={handleInputChange}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {currentStep === 2 && (
                        <div className="flex flex-col h-full">
                            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3 items-end shrink-0">
                                <div>
                                    <label htmlFor="analyte-search" className="block text-xs font-semibold text-gray-600 mb-1">Search analyte</label>
                                    <input
                                        id="analyte-search"
                                        type="text"
                                        placeholder="Search by name, code, or reference"
                                        value={analyteSearchTerm}
                                        onChange={(e) => setAnalyteSearchTerm(e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                                <div className="flex md:justify-end gap-2 text-sm">
                                    <span className="px-2.5 py-2 rounded-md bg-cyan-50 text-cyan-700 font-semibold border border-cyan-100">
                                        Selected: {selectedAnalyteIds.size}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-md">
                                {filteredAnalytes.map(analyte => (
                                    <div key={analyte.id} className="flex items-center justify-between p-3 border-b hover:bg-gray-50 transition-colors">
                                        <label htmlFor={`analyte-${analyte.id}`} className="flex-1 cursor-pointer">
                                            <div className="font-medium text-sm text-gray-800">{analyte.name}</div>
                                            <div className="text-xs text-gray-500">Code: {analyte.code}</div>
                                        </label>
                                        <input
                                            type="checkbox"
                                            id={`analyte-${analyte.id}`}
                                            checked={selectedAnalyteIds.has(Number(analyte.id))}
                                            onChange={() => handleAnalyteToggle(Number(analyte.id))}
                                            className="h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                                        />
                                    </div>
                                ))}
                                {filteredAnalytes.length === 0 && (
                                    <div className="p-6 text-center text-sm text-gray-500">No analytes match your search.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-between items-center">
                    <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-semibold rounded-lg text-gray-600 hover:bg-gray-200">
                        Cancel
                    </button>
                    <div className="flex gap-3">
                        {currentStep === 1 && !isEditMode ? (
                            <button 
                                type="button" 
                                onClick={handleNext} 
                                className={buttonClass}
                                disabled={!formState.testId}
                            >
                                Next: Assign Analytes →
                            </button>
                        ) : (
                            <button 
                                type="button" 
                                onClick={handleSave} 
                                className={buttonClass}
                            >
                                {isEditMode ? 'Save Changes' : 'Create Test'}
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default TestFormModal;
