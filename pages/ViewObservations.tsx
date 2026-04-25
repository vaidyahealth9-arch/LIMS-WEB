import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getObservationsForServiceRequest, getHistoricalObservationSeriesForServiceRequest, updateObservation, getEncounterById, getOrganizationById, getReportApprovalStatus, sendObservationsForVerification, approveObservations, downloadReport } from '../services/api';
import { useNotifications } from '../services/NotificationContext';
import type { Encounter, Organization, ReportApprovalStatus } from '../types';
import { WorkflowStepper } from '../components/WorkflowStepper';

const parseObservationId = (observationId: string): number => {
    const match = String(observationId || '').match(/(\d+)$/);
    return match ? Number(match[1]) : 0;
};

const parseAnalyteId = (analyteId: unknown): number | null => {
    const match = String(analyteId ?? '').match(/(\d+)$/);
    if (!match) return null;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
};

const normalizeKeyToken = (value: unknown): string => String(value ?? '').trim().toLowerCase();

const getObservationCompositeKey = (obs: any): string => {
    const analyteId = parseAnalyteId(obs?.analyteId);
    if (analyteId !== null) {
        return `analyte-id::${analyteId}`;
    }

    const analyteName = normalizeKeyToken(obs?.analyteName || 'unknown-analyte');
    const unit = normalizeKeyToken(obs?.unit || 'na');
    return `analyte-name::${analyteName}::unit::${unit}`;
};

const pickLatestObservation = (existingObs: any, candidateObs: any): any => {
    const existingTime = existingObs?.effectiveDateTime ? new Date(existingObs.effectiveDateTime).getTime() : 0;
    const candidateTime = candidateObs?.effectiveDateTime ? new Date(candidateObs.effectiveDateTime).getTime() : 0;

    if (candidateTime !== existingTime) {
        return candidateTime > existingTime ? candidateObs : existingObs;
    }

    return parseObservationId(candidateObs?.id) > parseObservationId(existingObs?.id) ? candidateObs : existingObs;
};

type NumericHistoryPoint = {
    value: number;
    effectiveDateTime: string;
    observationId: number;
};

const inferResultType = (obs: any): 'numeric' | 'text' | 'coded' => {
    if (obs?.valueNumeric !== null && obs?.valueNumeric !== undefined) return 'numeric';
    if (obs?.valueCode) return 'coded';
    return 'text';
};

const getObservationDisplayValue = (obs: any): string => {
    if (obs?.valueNumeric !== null && obs?.valueNumeric !== undefined) {
        const unit = obs?.unit ? ` ${obs.unit}` : '';
        return `${obs.valueNumeric}${unit}`;
    }
    if (obs?.valueString) return obs.valueString;
    if (obs?.valueCode) return obs.valueCode;
    return 'No value';
};

const getErrorMessage = (error: unknown, fallbackMessage: string): string => {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return fallbackMessage;
};

const sanitizeFileNamePart = (value: string | null | undefined): string => {
    const normalized = String(value ?? '').trim();
    if (!normalized) return 'na';
    return normalized
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '') || 'na';
};

const buildReportDownloadName = (
    organizationName: string | null | undefined,
    patientName: string | null | undefined,
    registrationId: string | null | undefined,
    reportType: 'regular' | 'smart'
): string => {
    return `${sanitizeFileNamePart(organizationName)}_${sanitizeFileNamePart(patientName)}_${sanitizeFileNamePart(registrationId)}_${reportType}.pdf`;
};

const isAccessDeniedError = (message: string): boolean => {
    return /access denied|forbidden|\b403\b/i.test(message);
};

const URINALYSIS_CODED_OPTIONS = ['Negative', 'Trace', '1+', '2+', '3+', '4+', 'Positive'];

const isUrinalysisCodedObservation = (obs: any): boolean => {
    const resultType = String(obs?.resultType || '').toLowerCase();
    if (resultType !== 'coded') return false;

    const searchable = `${obs?.testName || ''} ${obs?.analyteName || ''}`.toLowerCase();
    return searchable.includes('urine') || searchable.includes('urinalysis');
};

const getCodedDropdownOptions = (obs: any): string[] => {
    const currentValue = String(obs?.valueCode || '').trim();
    if (!currentValue) return URINALYSIS_CODED_OPTIONS;
    if (URINALYSIS_CODED_OPTIONS.includes(currentValue)) return URINALYSIS_CODED_OPTIONS;
    return [currentValue, ...URINALYSIS_CODED_OPTIONS];
};

const ViewObservations: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { addNotification } = useNotifications();
    const serviceRequest = location.state?.serviceRequest;

    const [observations, setObservations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [encounter, setEncounter] = useState<Encounter | null>(null);
    const [reportType, setReportType] = useState<'regular' | 'smart'>('regular');
    const [organizationBranding, setOrganizationBranding] = useState<Organization | null>(null);
    const [isBrandingLoading, setIsBrandingLoading] = useState(false);
    const [reportApprovalStatus, setReportApprovalStatus] = useState<ReportApprovalStatus | null>(null);
    const [isApprovalChecking, setIsApprovalChecking] = useState(false);
    const [isSubmittingForVerification, setIsSubmittingForVerification] = useState(false);
    const [isApprovingAsDoctor, setIsApprovingAsDoctor] = useState(false);
    const [historicalObservationSeries, setHistoricalObservationSeries] = useState<Record<string, NumericHistoryPoint[]>>({});
    const encounterErrorNotifiedRef = useRef(false);

    const currentRoles: string[] = (() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) return [] as string[];
        try {
            const parsed = JSON.parse(storedUser);
            return Array.isArray(parsed?.roles) ? parsed.roles.map((role: unknown) => String(role)) : [];
        } catch {
            return [] as string[];
        }
    })();

    const hasRole = (role: string) => {
        const normalizedTarget = role.toUpperCase();
        return currentRoles.some((currentRole) => String(currentRole || '').toUpperCase().replace(/^ROLE_/, '') === normalizedTarget);
    };

    const canSendForVerification = hasRole('ADMIN') || hasRole('TECHNICIAN');
    const canApproveAsDoctor = hasRole('PATHOLOGIST') || hasRole('DOCTOR');
    const isReportDownloadReady = Boolean(reportApprovalStatus?.reportStorageReference) || Boolean(reportApprovalStatus?.reportPdfPath);

    const groupedObservations = useMemo(() => {
        const grouped = observations.reduce((acc, obs, index) => {
            const testName = obs?.testName || 'Other Tests';
            if (!acc[testName]) {
                acc[testName] = [];
            }
            acc[testName].push({ obs, index });
            return acc;
        }, {} as Record<string, Array<{ obs: any; index: number }>>);

        return Object.entries(grouped) as Array<[string, Array<{ obs: any; index: number }>]>;
    }, [observations]);

    const resolveOrganizationId = (): string | null => {
        const orgId = localStorage.getItem('organizationId');
        if (orgId && /^\d+$/.test(orgId)) {
            return orgId;
        }

        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                const fallbackOrgId = String(parsedUser?.organizationId ?? '').trim();
                if (/^\d+$/.test(fallbackOrgId)) {
                    return fallbackOrgId;
                }
            } catch (error) {
                console.error('Failed to parse stored user for organization ID', error);
            }
        }

        return null;
    };

    const loadOrganizationBranding = async (): Promise<Organization | null> => {
        const orgId = resolveOrganizationId();
        if (!orgId) {
            return null;
        }

        try {
            setIsBrandingLoading(true);
            const org = await getOrganizationById(orgId);
            setOrganizationBranding(org);
            return org;
        } catch (error) {
            console.error('Failed to fetch organization branding', error);
            return null;
        } finally {
            setIsBrandingLoading(false);
        }
    };

    const loadObservations = async () => {
        if (!serviceRequest || !serviceRequest.id) {
            return;
        }

        setObservations([]); // Clear existing to prevent flicker
        setIsLoading(true);
        try {
            const [fetchedObservations, historicalSeries] = await Promise.all([
                getObservationsForServiceRequest(serviceRequest.id.toString()),
                getHistoricalObservationSeriesForServiceRequest(serviceRequest.id.toString(), 6).catch(() => ({} as Record<string, NumericHistoryPoint[]>)),
            ]);

            const historyMap = new Map<string, NumericHistoryPoint[]>();
            Object.entries(historicalSeries || {}).forEach(([rawKey, rawPoints]) => {
                const normalizedKey = String(rawKey || '').trim();
                if (!normalizedKey) return;

                const points = (Array.isArray(rawPoints) ? rawPoints : [])
                    .filter((point) => Number.isFinite(Number(point?.value)) && !!point?.effectiveDateTime)
                    .map((point) => ({
                        value: Number(point.value),
                        effectiveDateTime: String(point.effectiveDateTime),
                        observationId: Number(point.observationId || 0),
                    }));

                historyMap.set(normalizedKey, points);
            });

            const normalizedHistory = Array.from(historyMap.entries()).reduce((acc, [key, points]) => {
                const orderedPoints = [...points].sort((a, b) => {
                    const timeDelta = new Date(a.effectiveDateTime).getTime() - new Date(b.effectiveDateTime).getTime();
                    if (timeDelta !== 0) {
                        return timeDelta;
                    }
                    return a.observationId - b.observationId;
                });

                const uniquePoints: NumericHistoryPoint[] = [];
                orderedPoints.forEach((point) => {
                    const last = uniquePoints[uniquePoints.length - 1];
                    if (!last || last.effectiveDateTime !== point.effectiveDateTime || last.value !== point.value) {
                        uniquePoints.push(point);
                    }
                });

                acc[key] = uniquePoints;
                return acc;
            }, {} as Record<string, NumericHistoryPoint[]>);

            setHistoricalObservationSeries(normalizedHistory);

            const dedupedMap = new Map<string, any>();
            fetchedObservations.forEach((obs: any) => {
                const compositeKey = getObservationCompositeKey(obs);
                if (!dedupedMap.has(compositeKey)) {
                    dedupedMap.set(compositeKey, obs);
                } else {
                    const current = dedupedMap.get(compositeKey);
                    dedupedMap.set(compositeKey, pickLatestObservation(current, obs));
                }
            });

            const formattedObservations = Array.from(dedupedMap.values()).map((obs: any) => ({
                ...obs,
                resultType: inferResultType(obs),
                isEditing: false,
            }));

            setObservations(formattedObservations);
        } catch (error) {
            addNotification({
                type: 'error',
                title: 'Failed to Fetch Observations',
                message: 'Could not load observations for this service request.',
                persist: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadObservations();
    }, [serviceRequest, addNotification]);

    useEffect(() => {
        const fetchEncounterDetails = async () => {
            if (serviceRequest && serviceRequest.encounterId) {
                setEncounter(null); // Clear existing
                try {
                    const enc = await getEncounterById(serviceRequest.encounterId.toString());
                    setEncounter(enc);
                    encounterErrorNotifiedRef.current = false;
                } catch (error) {
                    console.error("Failed to fetch encounter details", error);
                    const message = getErrorMessage(error, 'Could not load encounter details for printing.');
                    const uiMessage = isAccessDeniedError(message)
                        ? 'Encounter details access is restricted for this login. You can still review/approve observations, but printing is disabled until encounter access is granted.'
                        : message;

                    if (!encounterErrorNotifiedRef.current) {
                        encounterErrorNotifiedRef.current = true;
                        addNotification({
                            type: 'error',
                            title: 'Failed to Fetch Encounter Details',
                            message: uiMessage,
                            persist: true,
                        });
                    }

                    setEncounter(null);
                }
            }
        };
        fetchEncounterDetails();
    }, [serviceRequest, addNotification]);

    useEffect(() => {
        loadOrganizationBranding();
    }, []);

    const refreshReportApprovalStatus = async (silent: boolean = false): Promise<ReportApprovalStatus | null> => {
        if (!serviceRequest?.id) {
            return null;
        }

        if (!silent) {
            setIsApprovalChecking(true);
        }

        try {
            const status = await getReportApprovalStatus(String(serviceRequest.id));
            setReportApprovalStatus(status);
            return status;
        } catch (error) {
            if (!silent) {
                addNotification({
                    type: 'error',
                    title: 'Approval Status Unavailable',
                    message: error instanceof Error ? error.message : 'Could not fetch doctor approval status.',
                    persist: true,
                });
            }
            return null;
        } finally {
            if (!silent) {
                setIsApprovalChecking(false);
            }
        }
    };

    useEffect(() => {
        if (serviceRequest?.id) {
            refreshReportApprovalStatus(true);
        }
    }, [serviceRequest?.id]);

    const ensureApprovalReady = async (): Promise<ReportApprovalStatus | null> => {
        if (!serviceRequest?.id) {
            addNotification({
                type: 'error',
                title: 'Service Request Missing',
                message: 'Unable to verify report approval status.',
                persist: true,
            });
            return null;
        }

        try {
            setIsApprovalChecking(true);
            const latestStatus = await getReportApprovalStatus(String(serviceRequest.id));
            setReportApprovalStatus(latestStatus);

            if (!latestStatus.ready) {
                addNotification({
                    type: 'error',
                    title: 'Report Not Approved',
                    message: latestStatus.message || 'Doctor verification and approval is required before report generation.',
                    persist: true,
                });
                return null;
            }

            return latestStatus;
        } catch (error) {
            addNotification({
                type: 'error',
                title: 'Approval Check Failed',
                message: error instanceof Error ? error.message : 'Could not validate doctor approval before report generation.',
                persist: true,
            });
            return null;
        } finally {
            setIsApprovalChecking(false);
        }
    };


    const handleValueChange = (index: number, value: string) => {
        const newObservations = [...observations];
        const target = newObservations[index];
        const resultType = target.resultType || inferResultType(target);

        if (resultType === 'numeric') {
            const parsed = value === '' ? null : Number(value);
            target.valueNumeric = Number.isFinite(parsed as number) ? parsed : null;
            target.valueString = null;
            target.valueCode = null;
        } else if (resultType === 'coded') {
            target.valueCode = value;
            target.valueString = null;
            target.valueNumeric = null;
        } else {
            target.valueString = value;
            target.valueNumeric = null;
            target.valueCode = null;
        }

        setObservations(newObservations);
    };

    const handleCommentsChange = (index: number, value: string) => {
        const newObservations = [...observations];
        newObservations[index].comments = value;
        setObservations(newObservations);
    };

    const toggleEditMode = (index: number) => {
        const newObservations = [...observations];
        newObservations[index].isEditing = !newObservations[index].isEditing;
        setObservations(newObservations);
    };

    const handlePrint = async (withHeader: boolean) => {
        if (observations.length === 0) {
            addNotification({
                type: 'info',
                title: 'No Data',
                message: 'No observations available to print.',
            });
            return;
        }

        if (!encounter) {
            addNotification({
                type: 'error',
                title: 'Printing Unavailable',
                message: 'Encounter details are unavailable for this request. Please refresh, reopen this request, or contact admin to grant encounter access.',
                persist: true,
            });
            return;
        }

        try {
            const approvalStatus = await ensureApprovalReady();
            if (!approvalStatus) {
                return;
            }

            if (withHeader) {
                const latestBranding = await loadOrganizationBranding();
                if (!latestBranding) {
                    addNotification({
                        type: 'error',
                        title: 'Branding Unavailable',
                        message: 'Could not load organization header/footer. Please try again in a moment.',
                        persist: true,
                    });
                    return;
                }
            }

            const pdfBlob = await downloadReport(String(serviceRequest.id), withHeader, reportType);
            const objectUrl = URL.createObjectURL(pdfBlob);
            const printWindow = window.open(objectUrl, '_blank');

            if (printWindow) {
                addNotification({
                    type: 'success',
                    title: 'PDF Ready',
                    message: 'Report PDF generated on the backend and opened. You can print or save it.',
                });
                window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
            } else {
                const link = document.createElement('a');
                link.href = objectUrl;
                const fallbackFileName = buildReportDownloadName(
                    organizationBranding?.organizationName,
                    encounter?.patientName || serviceRequest.patientName,
                    encounter?.mrnId || serviceRequest.patientMrn || String(serviceRequest.id),
                    reportType
                );
                link.download = fallbackFileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(objectUrl);

                addNotification({
                    type: 'success',
                    title: 'PDF Downloaded',
                    message: 'Popup was blocked, so the report was downloaded instead.',
                });
            }
        } catch (error) {
            addNotification({
                type: 'error',
                title: 'Report Generation Failed',
                message: error instanceof Error ? error.message : 'Unable to generate report PDF at the moment.',
                persist: true,
            });
        }
    };

    const handleSave = async (index: number) => {
        const observation = observations[index];
        setIsLoading(true);
        try {
            const observationData = {
                valueNumeric: observation.valueNumeric,
                valueString: observation.valueString,
                comments: observation.comments ?? '',
                valueCode: observation.valueCode,
                valueCodeSystem: observation.valueCodeSystem,
                interpretationCode: observation.interpretationCode,
                interpretationSystem: observation.interpretationSystem,
                effectiveDateTime: observation.effectiveDateTime,
            };
            await updateObservation(observation.id, observationData);

            addNotification({
                type: 'success',
                title: 'Observation Updated',
                message: `${observation.analyteName} for ${observation.testName} updated successfully.`,
                persist: false,
            });
            await refreshReportApprovalStatus(true);
            toggleEditMode(index);
        } catch (error) {
            addNotification({
                type: 'error',
                title: 'Update Failed',
                message: 'Failed to update observation.',
                persist: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getObservationNumericIds = (): number[] => {
        return observations
            .map((observation) => parseObservationId(observation.id))
            .filter((id) => Number.isInteger(id) && id > 0);
    };

    const handleSendForDoctorVerification = async () => {
        const observationIds = getObservationNumericIds();
        if (observationIds.length === 0) {
            addNotification({
                type: 'info',
                title: 'No Observations',
                message: 'No observations found to send for verification.',
            });
            return;
        }

        try {
            setIsSubmittingForVerification(true);
            await sendObservationsForVerification(observationIds);
            await loadObservations();
            await refreshReportApprovalStatus(true);
            addNotification({
                type: 'success',
                title: 'Sent for Verification',
                message: 'Observations sent to doctor/pathologist for verification.',
            });
        } catch (error) {
            addNotification({
                type: 'error',
                title: 'Verification Submission Failed',
                message: error instanceof Error ? error.message : 'Could not send observations for doctor verification.',
                persist: true,
            });
        } finally {
            setIsSubmittingForVerification(false);
        }
    };

    const handleDoctorApprove = async () => {
        const observationIds = getObservationNumericIds();
        if (observationIds.length === 0) {
            addNotification({
                type: 'info',
                title: 'No Observations',
                message: 'No observations found to approve.',
            });
            return;
        }

        try {
            setIsApprovingAsDoctor(true);
            await approveObservations(observationIds);
            await loadObservations();
            await refreshReportApprovalStatus(true);
            addNotification({
                type: 'success',
                title: 'Approved by Doctor',
                message: 'Observations finalized successfully. Result editing is now locked.',
            });
        } catch (error) {
            const errorMessage = getErrorMessage(error, 'Could not approve observations.');
            const latestStatus = await refreshReportApprovalStatus(true);

            if (latestStatus?.ready) {
                await loadObservations();
                addNotification({
                    type: 'info',
                    title: 'Approval Saved with Warning',
                    message: 'Doctor approval is saved, but a post-processing step failed. You can retry print/report generation shortly.',
                    persist: true,
                });
                return;
            }

            addNotification({
                type: 'error',
                title: 'Doctor Approval Failed',
                message: errorMessage,
                persist: true,
            });
        } finally {
            setIsApprovingAsDoctor(false);
        }
    };

    if (!serviceRequest) {
        return (
            <div className="container mx-auto px-4 py-6">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl mx-auto text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">No Service Request Found</h2>
                    <p className="text-gray-600">Please go back and select a service request to view observations.</p>
                    <button
                        onClick={() => navigate('/patient-list')}
                        className="mt-4 px-8 py-3 bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg"
                    >
                        Go to Patient List
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">View/Edit Observations for {serviceRequest.patientName}</h2>
                {encounter && (
                    <div className="mb-6">
                        <WorkflowStepper
                            status={
                                reportApprovalStatus?.ready ? 'APPROVED' : (encounter?.status || 'IN_PROGRESS')
                            }
                            hasTests={true}
                        />
                    </div>
                )}
                <div className="space-y-6">
                    {groupedObservations.map(([testName, testObservations]: [string, Array<{ obs: any; index: number }>]) => (
                        <div key={testName} className="overflow-x-auto border border-gray-200 rounded-lg">
                            <div className="bg-gradient-to-r from-cyan-50 to-teal-50 px-4 py-3 border-b border-gray-200">
                                <h4 className="text-lg font-bold text-cyan-900 flex items-center gap-2">
                                    <span className="w-1 h-6 bg-cyan-600 rounded-full"></span>
                                    {testName}
                                </h4>
                            </div>
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Analyte</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reference Range</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {testObservations.map(({ obs, index }) => {
                                        const isUrineCoded = isUrinalysisCodedObservation(obs);
                                        const codedOptions = isUrineCoded ? getCodedDropdownOptions(obs) : [];

                                        return (
                                            <tr key={obs.id || `${getObservationCompositeKey(obs)}-${index}`} className={obs.isEditing ? 'bg-cyan-50/40' : ''}>
                                                <td className="px-4 py-2 font-medium text-gray-800">{obs.analyteName || '-'}</td>
                                                <td className="px-4 py-2">
                                                    {obs.isEditing ? (
                                                        isUrineCoded ? (
                                                            <div className="flex flex-col gap-1">
                                                                <input
                                                                    type="text"
                                                                    list={`urine-coded-options-${index}`}
                                                                    value={obs.valueCode ?? ''}
                                                                    onChange={(e) => handleValueChange(index, e.target.value)}
                                                                    placeholder="Select or type value"
                                                                    className="w-40 px-2 py-1 border-2 border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-cyan-500"
                                                                />
                                                                <datalist id={`urine-coded-options-${index}`}>
                                                                    {codedOptions.map((option) => (
                                                                        <option key={option} value={option} />
                                                                    ))}
                                                                </datalist>
                                                                <p className="text-[11px] text-gray-500">Suggested values shown - you can also type a custom value.</p>
                                                            </div>
                                                        ) : (
                                                            <input
                                                                type={obs.resultType === 'numeric' ? 'number' : 'text'}
                                                                value={obs.resultType === 'numeric' ? (obs.valueNumeric ?? '') : (obs.valueString ?? obs.valueCode ?? '')}
                                                                onChange={(e) => handleValueChange(index, e.target.value)}
                                                                step={obs.resultType === 'numeric' ? 'any' : undefined}
                                                                className="w-40 px-2 py-1 border-2 border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-cyan-500"
                                                            />
                                                        )
                                                    ) : (
                                                        <span className="text-gray-800">{getObservationDisplayValue(obs)}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-700">{obs.unit || '-'}</td>
                                                <td className="px-4 py-2 text-sm text-gray-600">{obs.referenceRange || '-'}</td>
                                                <td className="px-4 py-2">
                                                    {obs.isEditing ? (
                                                        <textarea
                                                            value={obs.comments || ''}
                                                            onChange={(e) => handleCommentsChange(index, e.target.value)}
                                                            rows={2}
                                                            placeholder="Add comments..."
                                                            className="w-full min-w-[220px] px-2 py-1 border-2 border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-cyan-500 text-sm"
                                                        />
                                                    ) : (
                                                        <span className="text-sm text-gray-700 italic">{obs.comments || '-'}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2">
                                                    {obs.isEditing ? (
                                                        <button
                                                            onClick={() => handleSave(index)}
                                                            disabled={isLoading || reportApprovalStatus?.ready}
                                                            className="px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600 disabled:opacity-50"
                                                        >
                                                            {isLoading ? 'Saving...' : 'Save'}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => toggleEditMode(index)}
                                                            disabled={reportApprovalStatus?.ready}
                                                            className="px-3 py-1 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:bg-gray-400"
                                                        >
                                                            {reportApprovalStatus?.ready ? 'Locked' : 'Edit'}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
                <div className="mt-8 space-y-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-gray-800">Doctor Approval Status</p>
                                <p className="text-xs text-gray-600 mt-1">Report generation is allowed only after doctor verification and approval.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => refreshReportApprovalStatus(false)}
                                disabled={isApprovalChecking}
                                className="px-3 py-1.5 text-xs rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-60"
                            >
                                {isApprovalChecking ? 'Checking...' : 'Refresh'}
                            </button>
                        </div>
                        <div className="mt-3">
                            {reportApprovalStatus ? (
                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${reportApprovalStatus.ready ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                                    {reportApprovalStatus.ready ? 'Clinically Locked (Approved)' : 'Approval Pending'}
                                </div>
                            ) : (
                                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                                    Status unavailable
                                </div>
                            )}
                            <p className="text-xs text-gray-600 mt-2">{reportApprovalStatus?.message || 'Approval check has not been run yet.'}</p>
                            {reportApprovalStatus?.approvedDoctorName && (
                                <p className="text-xs text-gray-700 mt-1">
                                    Approved by: <span className="font-semibold">{reportApprovalStatus.approvedDoctorName}</span>
                                    {reportApprovalStatus.approvedAt ? ` on ${new Date(reportApprovalStatus.approvedAt).toLocaleString()}` : ''}
                                </p>
                            )}
                            <div className="mt-3 flex flex-wrap gap-2">
                                {canSendForVerification && (
                                    <button
                                        type="button"
                                        onClick={handleSendForDoctorVerification}
                                        disabled={isSubmittingForVerification || observations.length === 0}
                                        className="px-3 py-1.5 text-xs rounded-md bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-60"
                                    >
                                        {isSubmittingForVerification ? 'Sending...' : 'Send for Doctor Verification'}
                                    </button>
                                )}
                                {canApproveAsDoctor && (
                                    <button
                                        type="button"
                                        onClick={handleDoctorApprove}
                                        disabled={isApprovingAsDoctor || observations.length === 0}
                                        className="px-3 py-1.5 text-xs rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                                    >
                                        {isApprovingAsDoctor ? 'Approving...' : 'Approve as Doctor'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-sm font-semibold text-gray-800 mb-3">Report Style</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setReportType('regular')}
                                className={`text-left rounded-lg border px-4 py-3 transition ${reportType === 'regular'
                                    ? 'border-cyan-500 bg-cyan-50 shadow-sm'
                                    : 'border-gray-200 bg-white hover:border-cyan-300'
                                    }`}
                            >
                                <p className="font-semibold text-gray-900">Regular Report</p>
                                <p className="text-xs text-gray-600 mt-1">Text-intensive classic format for detailed reading.</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setReportType('smart')}
                                className={`text-left rounded-lg border px-4 py-3 transition ${reportType === 'smart'
                                    ? 'border-teal-500 bg-teal-50 shadow-sm'
                                    : 'border-gray-200 bg-white hover:border-teal-300'
                                    }`}
                            >
                                <p className="font-semibold text-gray-900">Smart Report</p>
                                <p className="text-xs text-gray-600 mt-1">Modern cards, highlights, status badges and dashboard-like summary.</p>
                            </button>
                        </div>
                    </div>

                    <div className="text-center space-y-3">
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => navigate(-1)}
                            className="px-8 py-3 bg-gray-500 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 transition-all hover:shadow-lg"
                        >
                            Back
                        </button>
                        <button
                            onClick={() => handlePrint(true)}
                            disabled={isBrandingLoading || !encounter || isApprovalChecking}
                            title={!encounter ? 'Encounter details are required for printing' : undefined}
                            className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:from-cyan-600 hover:to-teal-700"
                        >
                            {isBrandingLoading ? 'Preparing...' : `${isReportDownloadReady ? 'Download' : 'Generate'} ${reportType === 'smart' ? 'Smart' : 'Regular'} PDF with Header`}
                        </button>
                        <button
                            onClick={() => handlePrint(false)}
                            disabled={!encounter || isApprovalChecking}
                            title={!encounter ? 'Encounter details are required for printing' : undefined}
                            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:from-purple-600 hover:to-indigo-700"
                        >
                            {`${isReportDownloadReady ? 'Download' : 'Generate'} ${reportType === 'smart' ? 'Smart' : 'Regular'} PDF without Header`}
                        </button>
                    </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewObservations;


