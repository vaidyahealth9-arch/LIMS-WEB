import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkflowStepper } from '../components/WorkflowStepper';
import type { ServiceRequest, GroupedAnalyte, ResultEntry } from '../types';
import { searchServiceRequests, createObservationForServiceRequest, getServiceRequestAnalytes, getObservationsForServiceRequest, updateObservation, getEncounterById, updateEncounterWorkflowStatus, sendObservationsForVerification, approveObservations } from '../services/api';

const getDefaultDateRange = () => {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    return {
        startDate: sevenDaysAgo.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
    };
};

const isEncounterUnlockedForProcessing = (encounterStatus?: string) => {
    if (!encounterStatus) return false;
    const normalized = String(encounterStatus).toUpperCase().replace(/[-\s]/g, '_');
    return normalized === 'IN_PROGRESS' || normalized === 'COMPLETED' || normalized === 'PENDING_VERIFICATION' || normalized === 'APPROVED';
};

const hasKnownEncounterStatus = (encounterStatus?: string) => {
    return typeof encounterStatus === 'string' && encounterStatus.trim().length > 0;
};

const isClosedServiceRequestStatus = (status?: string) => {
    const normalized = String(status || '').toUpperCase().replace(/[-_]/g, '');
    return normalized === 'COMPLETED' || normalized === 'CANCELLED' || normalized === 'REVOKED' || normalized === 'ENTEREDINERROR';
};

const getObservationIds = (observations: Array<{ id: string | number }>): number[] => {
    return observations
        .map((observation) => {
            const match = String(observation?.id || '').match(/(\d+)$/);
            return match ? Number(match[1]) : NaN;
        })
        .filter((id) => Number.isInteger(id) && id > 0);
};

const DEFAULT_CODED_OPTIONS = ['Negative', 'Positive', 'Trace', 'Present', 'Absent', 'Normal', 'Abnormal', 'Nil', '1+', '2+', '3+', '4+'];
const URINALYSIS_CODED_OPTIONS = ['Negative', 'Trace', '1+', '2+', '3+', '4+', 'Positive'];

const getCodedOptionsForResult = (result: ResultEntry): string[] => {
    const searchableText = `${result.testName || ''} ${result.id || ''}`.toLowerCase();
    const isUrinalysis = searchableText.includes('urine') || searchableText.includes('urinalysis');
    const baseOptions = isUrinalysis ? URINALYSIS_CODED_OPTIONS : DEFAULT_CODED_OPTIONS;

    const currentValue = String(result.observedValue || '').trim();
    if (!currentValue || baseOptions.includes(currentValue)) {
        return baseOptions;
    }
    return [currentValue, ...baseOptions];
};

const TestEntry: React.FC = () => {
    const navigate = useNavigate();
    const defaultDateRange = getDefaultDateRange();
    const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
    const [analytes, setAnalytes] = useState<GroupedAnalyte[]>([]);
    const [results, setResults] = useState<{ [key: string]: ResultEntry }>({});
    
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState(defaultDateRange.startDate);
    const [endDate, setEndDate] = useState(defaultDateRange.endDate);
    const [requestView, setRequestView] = useState<'open' | 'closed' | 'all' | 'pending_verification' | 'approved'>('open');
    const [isSaving, setIsSaving] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const pageSize = 10;

    const roles = useMemo(() => {
        const token = localStorage.getItem('token');
        if (!token) return [];
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.roles || [];
        } catch (e) {
            console.error('Failed to parse token:', e);
            return [];
        }
    }, []);

    const isDoctorReviewRole = useMemo(() => {
        return roles.some((role: string) => {
            const normalized = String(role || '').toUpperCase().replace(/^ROLE_/, '');
            return normalized === 'PATHOLOGIST' || normalized === 'DOCTOR' || normalized === 'RADIOLOGIST';
        });
    }, [roles]);

    const fetchServiceRequests = async (query: string, startDate: string, endDate: string, page: number) => {
        setIsLoading(true);
        try {
            const orgId = localStorage.getItem('organizationId');
            if (!orgId) {
                throw new Error('Organization ID not found');
            }
            const includeClosed = requestView !== 'open';
            // Assuming testIds filter is not needed for now, passing empty array
            const response = await searchServiceRequests(orgId, startDate, endDate, query, [], page - 1, pageSize, includeClosed);
            
            const filteredRequests = (response.content || []).filter((req) => {
                const closed = isClosedServiceRequestStatus(req.status);
                const encounterStatus = String((req as any).encounterStatus || '').toUpperCase().replace(/[-\s]/g, '_');
                
                if (requestView === 'pending_verification') return encounterStatus === 'PENDING_VERIFICATION';
                if (requestView === 'approved') return encounterStatus === 'APPROVED';
                if (requestView === 'closed') return closed || encounterStatus === 'COMPLETED';
                if (requestView === 'open') return !closed && encounterStatus !== 'PENDING_VERIFICATION' && encounterStatus !== 'APPROVED' && encounterStatus !== 'COMPLETED';
                return true;
            });

            setServiceRequests(filteredRequests);
            setTotalPages(response.totalPages);
            setCurrentPage(page);
        } catch (error) {
            console.error('Failed to fetch service requests:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchServiceRequests(searchQuery, startDate, endDate, 1);
        }, 300); // 300ms debounce
        return () => clearTimeout(timer);
    }, [searchQuery, startDate, endDate, requestView]);

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            fetchServiceRequests(searchQuery, startDate, endDate, currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            fetchServiceRequests(searchQuery, startDate, endDate, currentPage + 1);
        }
    };

    const handleDatePreset = (preset: '7d' | '1m' | '3m') => {
        const today = new Date();
        let pastDate = new Date();

        switch (preset) {
            case '7d':
                pastDate.setDate(today.getDate() - 7);
                break;
            case '1m':
                pastDate.setMonth(today.getMonth() - 1);
                break;
            case '3m':
                pastDate.setMonth(today.getMonth() - 3);
                break;
        }

        setStartDate(pastDate.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
    };

    const ensureEncounterUnlocked = async (request: ServiceRequest): Promise<boolean> => {
        const rowEncounterStatus = (request as any).encounterStatus as string | undefined;

        if (hasKnownEncounterStatus(rowEncounterStatus)) {
            return isEncounterUnlockedForProcessing(rowEncounterStatus);
        }

        try {
            const encounter = await getEncounterById(String(request.encounterId));
            return isEncounterUnlockedForProcessing(encounter?.status);
        } catch (error) {
            console.error('Failed to verify encounter status for service request:', request.id, error);
            return false;
        }
    };

    const handleSelectRequest = async (request: ServiceRequest) => {
        const canProcess = await ensureEncounterUnlocked(request);
        if (!canProcess) {
            alert('Please start progress for this encounter after billing/payment before selecting this request.');
            return;
        }
        setSelectedRequest(request);
    };

    const handleViewObservations = async (request: ServiceRequest) => {
        const canProcess = await ensureEncounterUnlocked(request);
        if (!canProcess) {
            alert('Please start progress for this encounter after billing/payment before viewing observations.');
            return;
        }
        navigate('/view-observations', { state: { serviceRequest: request } });
    };

    useEffect(() => {
        if (!selectedRequest) {
            setAnalytes([]);
            setResults({});
            return;
        }

        const fetchAnalytes = async () => {
            try {
                const [fetchedAnalytes, existingObservations] = await Promise.all([
                    getServiceRequestAnalytes(selectedRequest.id),
                    getObservationsForServiceRequest(selectedRequest.id.toString()),
                ]);
                setAnalytes(fetchedAnalytes);

                // Build a map: numeric analyteId -> existing observation
                // obs.analyteId arrives as "an-{id}" from the backend
                const obsMap: { [key: number]: any } = {};
                existingObservations.forEach(obs => {
                    const match = String(obs.analyteId).match(/(\d+)$/);
                    if (match) {
                        obsMap[Number(match[1])] = obs;
                    }
                });

                const initialResults: { [key: string]: ResultEntry } = {};
                fetchedAnalytes.forEach(group => {
                    group.analytes.forEach(analyte => {
                        const existingObs = obsMap[analyte.analyteId];
                        const analyteResultType = (analyte.resultType || '').toLowerCase();
                        initialResults[analyte.analyteId] = {
                            id: analyte.analyteId.toString(),
                            testName: group.testName,
                            observedValue: existingObs
                                ? (existingObs.valueNumeric != null ? String(existingObs.valueNumeric) : existingObs.valueString || existingObs.valueCode || '')
                                : '',
                            machineValue: '',
                            units: analyte.unit,
                            resultType: analyteResultType || (existingObs?.valueNumeric != null ? 'numeric' : existingObs?.valueCode ? 'coded' : 'text'),
                            normalRange: existingObs?.referenceRange || analyte.referenceRange || analyte.biologicalRefInterval || 'N/A',
                            comments: existingObs?.comments || '',
                            specimenId: null,
                            analyteId: analyte.analyteId,
                            existingObservationId: existingObs?.id || null,
                            interpretationRule: analyte.interpretationRule,
                        };
                    });
                });
                setResults(initialResults);
            } catch (error) {
                console.error('Failed to fetch analytes:', error);
                setAnalytes([]);
                setResults({});
            }
        };

        fetchAnalytes();
    }, [selectedRequest]);

    const handleResultChange = (id: string, field: string, value: string) => {
        setResults(prevResults => ({
            ...prevResults,
            [id]: {
                ...prevResults[id],
                [field]: value,
            },
        }));
    };

    const saveObservations = async () => {
        const observationPromises = (Object.values(results) as ResultEntry[])
            .filter(result => String(result.observedValue || '').trim().length > 0)
            .map((result: ResultEntry) => {
                const resultType = (result.resultType || '').toLowerCase();
                const trimmedValue = String(result.observedValue).trim();

                let value: { valueNumeric?: number; valueString?: string; valueCode?: string; valueCodeSystem?: string };

                if (resultType === 'numeric') {
                    const numericValue = Number(trimmedValue);
                    if (!Number.isFinite(numericValue)) {
                        throw new Error(`Numeric value required for ${result.testName}.`);
                    }
                    value = { valueNumeric: numericValue };
                } else if (resultType === 'coded') {
                    value = {
                        valueCode: trimmedValue,
                        valueCodeSystem: 'http://lims.com/codesystem/local',
                    };
                } else {
                    // default to text for text/unknown analytes
                    value = { valueString: trimmedValue };
                }

                const observationData: {
                    specimenId?: number;
                    analyteId: number;
                    valueNumeric?: number;
                    valueString?: string;
                    valueCode?: string;
                    valueCodeSystem?: string;
                    comments: string;
                    effectiveDateTime: string;
                } = {
                    analyteId: result.analyteId,
                    ...value,
                    comments: result.comments ?? '',
                    effectiveDateTime: new Date().toISOString(),
                };

                if (typeof result.specimenId === 'number' && Number.isInteger(result.specimenId) && result.specimenId > 0) {
                    observationData.specimenId = result.specimenId;
                }

                if (result.existingObservationId) {
                    return updateObservation(result.existingObservationId, observationData);
                }
                return createObservationForServiceRequest(selectedRequest.id, observationData);
            });

        await Promise.all(observationPromises);
    };

    const loadCurrentObservationIds = async (serviceRequestId: number): Promise<number[]> => {
        const latestObservations = await getObservationsForServiceRequest(serviceRequestId.toString());
        return getObservationIds(latestObservations);
    };

    const handleSaveAndRequestVerification = async () => {
        if (!selectedRequest) return;
        setIsSaving(true);
        try {
            await saveObservations();
            const observationIds = await loadCurrentObservationIds(selectedRequest.id);
            if (observationIds.length === 0) {
                throw new Error('No observations found to send for verification.');
            }

            await sendObservationsForVerification(observationIds);
            await updateEncounterWorkflowStatus(selectedRequest.encounterId.toString(), 'PENDING_VERIFICATION');

            alert('Observations saved and sent for verification successfully.');
            setSelectedRequest(null);
            setResults({});
            fetchServiceRequests(searchQuery, startDate, endDate, currentPage);

        } catch (error: any) {
            console.error("Failed to save observations:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDoctorApprove = async () => {
        if (!selectedRequest) return;
        setIsApproving(true);
        try {
            await saveObservations();
            const observationIds = await loadCurrentObservationIds(selectedRequest.id);
            if (observationIds.length === 0) {
                throw new Error('No observations found to approve.');
            }

            await approveObservations(observationIds);

            alert('Results Approved and Finalized successfully!');
            setSelectedRequest(null);
            setResults({});
            fetchServiceRequests(searchQuery, startDate, endDate, currentPage);

        } catch (error: any) {
            console.error("Failed to save observations:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsApproving(false);
        }
    };

    const handlePrint = () => {
        if (selectedRequest) {
            navigate('/view-observations', { state: { serviceRequest: selectedRequest } });
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-white to-cyan-50 p-6 rounded-xl shadow-lg border border-cyan-100">
                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent mb-2">
                        Entry & Verify
                    </h2>
                    <p className="text-sm text-gray-600">Patient worklist for test data entry and verification</p>
                </div>
                
                {selectedRequest && (
                    <div className="mt-4 bg-white/10 rounded-lg p-2 backdrop-blur-sm border border-white/20">
                        <WorkflowStepper 
                            status={(selectedRequest as any).encounterStatus || 'IN_PROGRESS'} 
                            hasTests={true}
                        />
                    </div>
                )}
                
                {/* Filters */}
                <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="mb-3 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setRequestView('open')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${requestView === 'open' ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-cyan-700 border-cyan-200 hover:bg-cyan-50'}`}
                        >
                            Open
                        </button>
                        <button
                            type="button"
                            onClick={() => setRequestView('closed')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${requestView === 'closed' ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-cyan-700 border-cyan-200 hover:bg-cyan-50'}`}
                        >
                            Closed
                        </button>
                        <button
                            type="button"
                            onClick={() => setRequestView('pending_verification')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${requestView === 'pending_verification' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'}`}
                        >
                            Pending Verification
                        </button>
                        <button
                            type="button"
                            onClick={() => setRequestView('approved')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${requestView === 'approved' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-green-700 border-green-200 hover:bg-green-50'}`}
                        >
                            Approved
                        </button>
                        <button
                            type="button"
                            onClick={() => setRequestView('all')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${requestView === 'all' ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-cyan-700 border-cyan-200 hover:bg-cyan-50'}`}
                        >
                            All
                        </button>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex-1 min-w-[250px]">
                            <input 
                                type="text" 
                                placeholder="Search by name, MRN, Lab ID..." 
                                className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input 
                                type="date" 
                                className="px-3 py-2 text-sm border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all" 
                                value={startDate} 
                                onChange={e => setStartDate(e.target.value)} 
                            />
                            <span className="text-gray-400 font-bold text-sm">→</span>
                            <input 
                                type="date" 
                                className="px-3 py-2 text-sm border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all" 
                                value={endDate} 
                                onChange={e => setEndDate(e.target.value)} 
                            />
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button onClick={() => handleDatePreset('7d')} className="px-2.5 py-1.5 text-xs text-cyan-700 bg-cyan-50 rounded-md hover:bg-cyan-100 hover:text-cyan-800 border border-cyan-200 font-medium transition-colors whitespace-nowrap">7 days</button>
                            <button onClick={() => handleDatePreset('1m')} className="px-2.5 py-1.5 text-xs text-cyan-700 bg-cyan-50 rounded-md hover:bg-cyan-100 hover:text-cyan-800 border border-cyan-200 font-medium transition-colors whitespace-nowrap">1 month</button>
                            <button onClick={() => handleDatePreset('3m')} className="px-2.5 py-1.5 text-xs text-cyan-700 bg-cyan-50 rounded-md hover:bg-cyan-100 hover:text-cyan-800 border border-cyan-200 font-medium transition-colors whitespace-nowrap">3 months</button>
                        </div>

                        <div className="flex items-center bg-gradient-to-r from-cyan-50 to-teal-50 px-3 py-2 rounded-lg border border-cyan-200 whitespace-nowrap">
                            <span className="text-xs text-gray-600">Total:</span>
                            <span className="ml-1.5 text-sm font-bold text-cyan-700">{serviceRequests.length}</span>
                            <span className="ml-1 text-xs text-gray-600">requests</span>
                        </div>
                    </div>

                    {searchQuery && (
                        <div className="flex items-center justify-start mt-3 pt-3 border-t border-gray-200">
                            <button
                                onClick={() => setSearchQuery('')}
                                className="px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md font-medium transition-colors flex items-center"
                            >
                                <span className="mr-1">×</span>
                                Clear filters
                            </button>
                        </div>
                    )}
                </div>

                {/* Service Requests Table */}
                <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <svg className="animate-spin h-8 w-8 text-cyan-600" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                            </svg>
                            <span className="ml-3 text-gray-600">Loading requests...</span>
                        </div>
                    ) : serviceRequests.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                            </svg>
                            <p className="mt-2">No service requests found</p>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gradient-to-r from-cyan-50 to-teal-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Order ID</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Patient ID</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Patient Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Tests</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {serviceRequests.map((req) => {
                                const encounterStatus = (req as any).encounterStatus as string | undefined;
                                const canProcess = hasKnownEncounterStatus(encounterStatus)
                                    ? isEncounterUnlockedForProcessing(encounterStatus)
                                    : true;

                                return (
                                <tr
                                    key={req.id}
                                    onClick={() => handleSelectRequest(req)}
                                    className={`transition-colors ${selectedRequest?.id === req.id ? 'bg-cyan-100' : 'hover:bg-cyan-50'} ${canProcess ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                    title={canProcess ? 'Tap to select this request for entry' : 'Start progress after billing/payment to enable test entry.'}
                                >
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{req.localOrderValue}</td>
                                    <td className="px-4 py-3 text-sm font-medium text-cyan-600">{req.patientMrn}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700 font-medium">{req.patientName}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{req.requestedTests.map(t => t.testName).join(', ')}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(req.orderDate).toLocaleDateString()}</td>
                                    <td className="px-4 py-3">
                                        {selectedRequest?.id === req.id && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-cyan-100 text-cyan-800">
                                                ✓ Selected
                                            </span>
                                        )}
                                        {canProcess && (
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleViewObservations(req);
                                                }}
                                                className={`${selectedRequest?.id === req.id ? 'ml-2' : ''} px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-md hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow-md transition-all active:scale-95`}
                                            >
                                                {isDoctorReviewRole
                                                    ? 'Review & Approve'
                                                    : (req.status === 'ACTIVE' || req.status === 'PENDING')
                                                        ? 'Enter / Verify'
                                                        : 'View Observations'}
                                            </button>
                                        )}
                                        {!canProcess && (
                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800" title="Complete billing/payment and click Start Progress in encounters to unlock processing">
                                                Start Progress required
                                            </span>
                                        )}
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-6 px-4">
                        <button
                            onClick={handlePreviousPage}
                            disabled={currentPage === 1 || isLoading}
                            className="px-4 py-2 text-sm font-medium text-cyan-700 bg-white border-2 border-cyan-200 rounded-lg hover:bg-cyan-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            ← Previous
                        </button>
                        <span className="text-sm font-medium text-gray-700">
                            Page <span className="text-cyan-600 font-bold">{currentPage}</span> of <span className="text-cyan-600 font-bold">{totalPages}</span>
                        </span>
                        <button
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages || isLoading}
                            className="px-4 py-2 text-sm font-medium text-cyan-700 bg-white border-2 border-cyan-200 rounded-lg hover:bg-cyan-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Next →
                        </button>
                    </div>
                )}
            </div>

            {selectedRequest && (
                <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-600">
                    <div className="mb-6 pb-4 border-b border-gray-200">
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">
                            Test Data Entry &amp; Verification
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold">Patient</p>
                                <p className="text-gray-800 font-medium">{selectedRequest.patientName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold">MRN</p>
                                <p className="text-gray-800 font-mono font-medium">{selectedRequest.patientMrn}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold">Order ID</p>
                                <p className="text-gray-800 font-mono font-medium">{selectedRequest.localOrderValue}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold">Status</p>
                                <p className="text-gray-800 font-medium">{selectedRequest.status}</p>
                            </div>
                        </div>
                    </div>
                    {analytes.map(group => (
                        <div key={group.testId} className="overflow-x-auto mb-6 border border-gray-200 rounded-lg">
                            <div className="bg-gradient-to-r from-cyan-50 to-teal-50 px-4 py-3 border-b border-gray-200">
                                <h4 className="text-lg font-bold text-cyan-900 flex items-center gap-2">
                                    <span className="w-1 h-6 bg-cyan-600 rounded-full"></span>
                                    {group.testName}
                                </h4>
                            </div>
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Analyte</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Units</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reference Range</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {group.analytes.map(analyte => {
                                        const result = results[analyte.analyteId];
                                        if (!result) return null;
                                        return (
                                            <tr key={analyte.analyteId}>
                                                <td className="px-4 py-2 font-medium">{analyte.analyteName}</td>
                                                <td className="px-4 py-2">
                                                    {String(result.resultType || '').toLowerCase() === 'coded' ? (
                                                        <div className="flex flex-col gap-1">
                                                            <input
                                                                type="text"
                                                                list={`coded-options-${result.analyteId}`}
                                                                value={result.observedValue}
                                                                onChange={(e) => handleResultChange(result.id, 'observedValue', e.target.value)}
                                                                placeholder="Select or type value"
                                                                className={`w-40 px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 transition-all ${!result.observedValue && result.machineValue ? '' : !result.observedValue ? 'border-red-400 ring-red-300 ring-1' : 'border-gray-300'}`}
                                                            />
                                                            <datalist id={`coded-options-${result.analyteId}`}>
                                                                {getCodedOptionsForResult(result).map((option) => (
                                                                    <option key={option} value={option} />
                                                                ))}
                                                            </datalist>
                                                            <p className="text-[11px] text-gray-500">Suggested values shown — you can also type a custom value.</p>
                                                        </div>
                                                    ) : (
                                                        <input
                                                            type={result.resultType === 'numeric' ? 'number' : 'text'}
                                                            value={result.observedValue}
                                                            onChange={(e) => handleResultChange(result.id, 'observedValue', e.target.value)}
                                                            step={result.resultType === 'numeric' ? 'any' : undefined}
                                                            className={`w-28 px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 transition-all ${!result.observedValue && result.machineValue ? '' : !result.observedValue ? 'border-red-400 ring-red-300 ring-1' : 'border-gray-300'}`}
                                                        />
                                                    )}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-700">{result.units}</td>
                                                <td className="px-4 py-2 text-sm text-gray-600">{result.normalRange}</td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Notes..."
                                                        value={result.comments}
                                                        onChange={(e) => handleResultChange(result.id, 'comments', e.target.value)}
                                                        className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm transition-all"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ))}
                    <div className="mt-8 bg-gray-50 border-t border-gray-200 p-6 rounded-b-lg flex justify-between items-center">
                        <button
                            onClick={() => {
                                setSelectedRequest(null);
                                setResults({});
                                fetchServiceRequests(searchQuery, startDate, endDate, currentPage);
                            }}
                            className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-all hover:shadow-md"
                        >
                            Cancel
                        </button>
                        <div className="flex gap-3">
                            <button
                                onClick={handlePrint}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-all hover:shadow-lg hover:scale-105"
                            >
                                Preview & Print
                            </button>
                            {isDoctorReviewRole ? (
                                <button
                                    onClick={handleDoctorApprove}
                                    disabled={isApproving}
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-md transition-all hover:shadow-lg hover:scale-105"
                                >
                                    {isApproving ? 'Approving...' : 'Approve & Finalize'}
                                </button>
                            ) : (
                                <button
                                    onClick={handleSaveAndRequestVerification}
                                    disabled={isSaving}
                                    className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-md transition-all hover:shadow-lg hover:scale-105"
                                >
                                    {isSaving ? 'Saving...' : 'Save & Request Verification'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestEntry;
