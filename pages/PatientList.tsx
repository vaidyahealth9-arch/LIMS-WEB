import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Encounter, OrganizationTest } from '../types';
import { searchEncounters, getEnabledTestsForLab, updateEncounterStatus, getBillsByEncounter, getReportApprovalStatus, getEncounterById, syncBill } from '../services/api';
import Barcode from 'react-barcode';

import { Billing } from './Billing';
import { InvoiceModal } from '../components/InvoiceModal';
import { downloadReport, updateEncounterWorkflowStatus } from '../services/api';
import { useNotifications } from '../services/NotificationContext';
import { WorkflowStepper } from '../components/WorkflowStepper';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const normalizedStatus = String(status || '')
        .toUpperCase()
        .replace(/-/g, '_')
        .replace(/\s+/g, '_');

    const statusClasses: Record<string, string> = {
        PLANNED: 'bg-gray-100 text-gray-800',
        ARRIVED: 'bg-blue-100 text-blue-800',
        IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
        PENDING_VERIFICATION: 'bg-amber-100 text-amber-800 border border-amber-200',
        APPROVED: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
        FINISHED: 'bg-green-100 text-green-800',
        COMPLETED: 'bg-gray-200 text-gray-700 font-bold',
        CANCELLED: 'bg-red-100 text-red-800',
    };
    
    const formattedStatus = normalizedStatus.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    
    return (
        <span className={`px-2 inline-flex text-[10px] leading-5 font-bold rounded-full ${statusClasses[normalizedStatus] || 'bg-gray-100 text-gray-800'}`}>
            {formattedStatus}
        </span>
    );
};

const BillingWorkflowStepper: React.FC<{
    hasBill: boolean;
    hasPayment: boolean;
    isSettled: boolean;
    isWorkflowComplete: boolean;
    onCreateOrEditBill: () => void;
    onRecordPayment?: () => void;
    onViewBill?: () => void;
    onUpdateBill?: () => void;
}> = ({ hasBill, hasPayment, isSettled, isWorkflowComplete, onCreateOrEditBill, onRecordPayment, onViewBill, onUpdateBill }) => {
    const canUpdateBill = hasBill && !isSettled && !isWorkflowComplete;
    const steps = [
        { label: hasBill ? 'Bill' : 'Create', active: true, completed: hasBill, onClick: onCreateOrEditBill },
        { label: 'Payment', active: hasBill, completed: hasPayment || isSettled, onClick: onRecordPayment },
        { label: 'View', active: hasBill, completed: hasBill, onClick: onViewBill },
        { label: 'Sync', active: canUpdateBill, completed: !canUpdateBill && hasBill, onClick: onUpdateBill },
    ] as const;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mb-6">
            <div className="mb-6 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Billing Workflow Lifecycle</div>
            <div className="flex items-center w-full">
                {steps.map((step, index) => {
                    const isDisabled = !step.active || !step.onClick;
                    return (
                        <React.Fragment key={step.label}>
                            <div className="flex flex-col items-center relative group">
                                <button
                                    type="button"
                                    onClick={step.onClick}
                                    disabled={isDisabled}
                                    className={`w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold z-10 transition-all duration-300 ${
                                        step.completed
                                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100'
                                            : step.active
                                                ? 'bg-white border-2 border-cyan-500 text-cyan-600 shadow-md ring-4 ring-cyan-50'
                                                : 'bg-slate-50 border-2 border-slate-100 text-slate-300'
                                    } ${isDisabled ? 'cursor-not-allowed opacity-60' : 'hover:scale-105 active:scale-95'}`}
                                >
                                    {step.completed ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        index + 1
                                    )}
                                </button>
                                <span className={`absolute -bottom-6 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${
                                    step.active ? 'text-slate-700' : 'text-slate-300'
                                }`}>
                                    {step.label}
                                </span>
                            </div>
                            {index < steps.length - 1 && (
                                <div className={`flex-1 h-[2px] mx-2 -translate-y-3 transition-colors duration-500 ${
                                    step.completed ? 'bg-emerald-200' : 'bg-slate-100'
                                }`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

const ActionButtons: React.FC<{
    encounter: Encounter;
    onBill: (encounter: Encounter) => void;
    onStartProgress: (encounter: Encounter) => void;
    onCompleteEncounter: (encounter: Encounter) => void;
    canCompleteEncounter: boolean;
    isReportReady?: boolean;
    isReceptionDeskRole?: boolean;
    hasBill?: boolean;
    hasPayment?: boolean;
    isBillSettled?: boolean;
    onViewBarcodes?: (encounter: Encounter) => void;
    onViewBill?: (encounter: Encounter) => void;
    onRecordPayment?: (encounter: Encounter) => void;
    onUpdateBill?: (encounter: Encounter) => void;
    onApprove?: (encounter: Encounter) => void;
    isDoctorRole?: boolean;
}> = ({ encounter, onBill, onStartProgress, onCompleteEncounter, onApprove, canCompleteEncounter, isReportReady = false, isReceptionDeskRole = false, isDoctorRole = false, hasBill = false, hasPayment = false, isBillSettled = false, onViewBarcodes, onViewBill, onRecordPayment, onUpdateBill }) => {
    const navigate = useNavigate();
    const { addNotification } = useNotifications();
    const { status, tests } = encounter;

    const handleAddTests = () => {
        navigate('/create-tests', { state: { encounter } });
    };

    const handleOpenBillWorkflow = () => {
        onBill(encounter);
    };

    const handlePrintReport = async () => {
        try {
            let serviceRequestIds: number[] = Array.isArray(encounter.serviceRequestIds)
                ? encounter.serviceRequestIds
                : [];

            if (serviceRequestIds.length === 0) {
                const detailedEncounter = await getEncounterById(String(encounter.id));
                serviceRequestIds = Array.isArray(detailedEncounter?.serviceRequestIds)
                    ? detailedEncounter.serviceRequestIds
                    : [];
            }

            if (serviceRequestIds.length === 0) {
                addNotification({ type: 'error', title: 'Error', message: 'No service request ID found for this encounter.' });
                return;
            }

            const uniqueServiceRequestIds = Array.from(new Set(serviceRequestIds));
            let successCount = 0;
            let failureCount = 0;

            for (const serviceRequestId of uniqueServiceRequestIds) {
                try {
                    const reportBlob = await downloadReport(serviceRequestId.toString());
                    const url = window.URL.createObjectURL(reportBlob);
                    const fileName = uniqueServiceRequestIds.length > 1
                        ? `report-${encounter.localEncounterValue || encounter.id}-${serviceRequestId}.pdf`
                        : `report-${encounter.localEncounterValue || encounter.id}.pdf`;

                    const win = window.open(url, '_blank', 'noopener,noreferrer');
                    if (!win) {
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = fileName;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                    }

                    window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
                    successCount += 1;
                } catch (error) {
                    failureCount += 1;
                    console.error(`Failed to download report for service request ${serviceRequestId}:`, error);
                }
            }

            if (successCount === 0) {
                addNotification({ type: 'error', title: 'Download Failed', message: 'Could not download any report for this encounter.' });
                return;
            }

            if (failureCount > 0) {
                addNotification({
                    type: 'info',
                    title: 'Partial Download',
                    message: `${successCount} report(s) downloaded. ${failureCount} report(s) still need attention.`,
                });
                return;
            }

            addNotification({
                type: 'success',
                title: 'Report Ready',
                message: successCount > 1
                    ? `${successCount} reports downloaded for this encounter.`
                    : 'Report downloaded successfully.',
            });
        } catch (error) {
            addNotification({ type: 'error', title: 'Download Failed', message: 'Could not download the report.' });
            console.error('Failed to download report:', error);
        }
    };

    const hasTests = tests && tests.length > 0;
    const isWorkflowComplete = status === 'COMPLETED' || status === 'APPROVED';
    const canAddTests = status !== 'CANCELLED' && status !== 'COMPLETED';
    const canStartProgress = status === 'ARRIVED' && hasTests;
    const canComplete = (canCompleteEncounter || status === 'APPROVED' || status === 'PENDING_VERIFICATION' || isReportReady) && isBillSettled;
    const canApprove = (status === 'PENDING_VERIFICATION' || status === 'IN_PROGRESS') && isDoctorRole;
    const showBarcodes = hasTests && status !== 'CANCELLED';
    const canViewReport = status === 'COMPLETED' || status === 'APPROVED' || canCompleteEncounter || isReportReady;
    const canUpdateBill = hasBill && (!isBillSettled || !isWorkflowComplete);

    const buttonClass = "w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-white/90 border border-cyan-200 px-3 py-1 text-[11px] font-semibold text-cyan-700 shadow-sm">
                    {isReceptionDeskRole ? 'Front Desk Actions Enabled' : 'Lab Actions Focused'}
                </span>
                {hasTests && (
                    <span className="inline-flex items-center rounded-full bg-white/90 border border-emerald-200 px-3 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm">
                        {encounter.tests.length} test{encounter.tests.length > 1 ? 's' : ''} added
                    </span>
                )}
                {!hasBill && (
                    <span className="inline-flex items-center rounded-full bg-white/90 border border-amber-200 px-3 py-1 text-[11px] font-semibold text-amber-700 shadow-sm">
                        Bill not created yet
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                    <h4 className="text-sm font-bold text-slate-800 mb-3">Clinical Workflow</h4>
                    <div className="space-y-2">
                        {canAddTests && (
                            <button
                                onClick={handleAddTests}
                                title="Add tests"
                                className={`${buttonClass} border-slate-300 text-slate-700 hover:bg-slate-50`}
                            >
                                Add / Update Tests
                            </button>
                        )}

                        {canStartProgress && (
                            <button
                                onClick={() => onStartProgress(encounter)}
                                title="Start progress"
                                className={`${buttonClass} border-blue-300 text-blue-700 hover:bg-blue-50`}
                            >
                                Start Progress
                            </button>
                        )}

                        {canApprove && (
                            <button
                                onClick={() => onApprove?.(encounter)}
                                title="Verify results and approve encounter"
                                className={`${buttonClass} border-purple-300 text-purple-700 hover:bg-purple-50`}
                            >
                                Finalize & Approve
                            </button>
                        )}

                        {(status === 'APPROVED' || isReportReady) && (
                            <button
                                onClick={isBillSettled ? () => onCompleteEncounter(encounter) : () => onRecordPayment?.(encounter)}
                                title={isBillSettled ? "Complete encounter" : "Pay outstanding due to complete"}
                                className={`${buttonClass} ${isBillSettled 
                                    ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' 
                                    : 'border-amber-300 text-amber-700 hover:bg-amber-50'}`}
                            >
                                {isBillSettled ? 'Complete Encounter' : 'Pay Due to Complete'}
                            </button>
                        )}

                        {canViewReport && (
                            <button
                                onClick={handlePrintReport}
                                title="Download report"
                                className={`${buttonClass} border-indigo-300 text-indigo-700 hover:bg-indigo-50`}
                            >
                                Download Report
                            </button>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50/80 to-sky-50/70 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                    <h4 className="text-sm font-bold text-cyan-800 mb-3">Billing Workflow</h4>
                    <div className="space-y-3">
                        <BillingWorkflowStepper
                            hasBill={hasBill}
                            hasPayment={hasPayment}
                            isSettled={isBillSettled}
                            isWorkflowComplete={isWorkflowComplete}
                            onCreateOrEditBill={handleOpenBillWorkflow}
                            onRecordPayment={onRecordPayment ? () => onRecordPayment(encounter) : undefined}
                            onViewBill={onViewBill ? () => onViewBill(encounter) : undefined}
                            onUpdateBill={onUpdateBill ? () => onUpdateBill(encounter) : undefined}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export const PatientList: React.FC = () => {
    type DrawerTab = 'actions' | 'barcodes' | 'bill' | 'payment';
    type EncounterStatusFilter = 'ALL' | 'ACTIVE' | 'VERIFICATION' | 'APPROVED' | 'COMPLETED';
    const location = useLocation();
    const navigate = useNavigate();
    const [encounters, setEncounters] = useState<Encounter[]>([]);
    const [tests, setTests] = useState<OrganizationTest[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTests, setSelectedTests] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<EncounterStatusFilter>('ALL');
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 2);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const pageSize = 10;
    const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
    const [selectedEncounterForBilling, setSelectedEncounterForBilling] = useState<Encounter | null>(null);
    const [isWorkflowActionLoading, setIsWorkflowActionLoading] = useState(false);
    const [completableEncounterIds, setCompletableEncounterIds] = useState<Record<number, boolean>>({});
    const [reportReadyEncounterIds, setReportReadyEncounterIds] = useState<Record<number, boolean>>({});
    const [encounterBillPresence, setEncounterBillPresence] = useState<Record<number, boolean>>({});
    const [encounterBillHasPayment, setEncounterBillHasPayment] = useState<Record<number, boolean>>({});
    const [encounterBillSettled, setEncounterBillSettled] = useState<Record<number, boolean>>({});
    const [currentRoles, setCurrentRoles] = useState<string[]>([]);
    const [barcodesModalOpen, setBarcodesModalOpen] = useState(false);
    const [selectedEncounterForBarcodes, setSelectedEncounterForBarcodes] = useState<Encounter | null>(null);
    const [billDetailsModalOpen, setBillDetailsModalOpen] = useState(false);
    const [selectedEncounterForBillDetails, setSelectedEncounterForBillDetails] = useState<Encounter | null>(null);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedEncounterForPayment, setSelectedEncounterForPayment] = useState<Encounter | null>(null);
    const [barcodesData, setBarcodesData] = useState<any[]>([]);
    const [billDetailsData, setBillDetailsData] = useState<any>(null);
    const [paymentModalPaymentAmount, setPaymentModalPaymentAmount] = useState(0);
    const [paymentModalMethod, setPaymentModalMethod] = useState('CASH');
    const [paymentModalNotes, setPaymentModalNotes] = useState('');
    const [isRecordingPayment, setIsRecordingPayment] = useState(false);
    const [isLoadingBarcodes, setIsLoadingBarcodes] = useState(false);
    const [isLoadingPaymentContext, setIsLoadingPaymentContext] = useState(false);
    const [selectedEncounterForActions, setSelectedEncounterForActions] = useState<Encounter | null>(null);
    const [actionsDrawerTab, setActionsDrawerTab] = useState<DrawerTab>('actions');
    const { addNotification } = useNotifications();

    const getDueAmount = (bill: any): number => {
        const explicitDue = Number(bill?.dueAmount);
        if (Number.isFinite(explicitDue)) {
            return Math.max(0, explicitDue);
        }
        const net = Number(bill?.netAmount ?? bill?.totalAmount ?? 0);
        const paid = Number(bill?.paidAmount ?? 0);
        return Math.max(0, net - paid);
    };

    const formatCurrency = (amount: unknown): string => {
        const numericAmount = Number(amount ?? 0);
        const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0;
        return `Rs. ${safeAmount.toFixed(2)}`;
    };

    const isBillSettledForUpdates = (bill: any): boolean => {
        if (!bill) return false;
        
        const due = getDueAmount(bill);
        if (due <= 0.0001) {
            // Check if status is also consistent, though due amount is the source of truth
            return true;
        }

        const net = Number(bill?.netAmount ?? bill?.totalAmount ?? 0);
        const paid = Number(bill?.paidAmount ?? 0);
        return net > 0 && paid >= net;
    };

    useEffect(() => {
        try {
            const storedUser = localStorage.getItem('user');
            if (!storedUser) return;
            const parsed = JSON.parse(storedUser);
            const roles = Array.isArray(parsed?.roles) ? parsed.roles.map((r: unknown) => String(r).toUpperCase().replace(/^ROLE_/, '')) : [];
            setCurrentRoles(roles);
        } catch {
            setCurrentRoles([]);
        }
    }, []);

    const isReceptionDeskRole = currentRoles.includes('RECEPTIONIST') || currentRoles.includes('ADMIN') || currentRoles.includes('MANAGER');
    const isDoctorRole = currentRoles.includes('DOCTOR') || currentRoles.includes('PATHOLOGIST') || currentRoles.includes('ADMIN');

    const handleBill = (encounter: Encounter) => {
        setSelectedEncounterForBilling(encounter);
        setIsBillingModalOpen(true);
    };

    const handlePrintBarcodes = () => {
        if (barcodesData.length === 0) return;
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const barcodeHtml = barcodesData.map(item => `
            <div style="display: inline-block; width: 45mm; border: 1px solid #eee; padding: 10px; margin: 5px; text-align: center; font-family: sans-serif;">
                <div style="font-size: 8pt; font-weight: bold; margin-bottom: 4px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">${item.testName}</div>
                <div style="display: flex; justify-content: center; margin: 4px 0;">
                    ${typeof item.barcode === 'string' && /^[A-Za-z0-9+/=]+$/.test(item.barcode)
                        ? `<img src="data:image/png;base64,${item.barcode}" style="max-height: 20mm; max-width: 100%;" />`
                        : `<div style="font-size: 10pt; background: #f0f0f0; padding: 4px; border: 1px dashed #ccc;">${item.barcode}</div>`
                    }
                </div>
                <div style="font-size: 7pt; margin-top: 4px; line-height: 1.2;">
                    <div style="font-weight: bold;">${item.patientName}</div>
                    <div>MRN: ${item.mrn}</div>
                    <div style="font-size: 6pt; color: #666; margin-top: 2px;">${item.barcode}</div>
                </div>
            </div>
        `).join('');

        printWindow.document.write(`
            <html>
                <head><title>Barcodes - ${barcodesData[0]?.patientName}</title></head>
                <body style="margin: 0; padding: 10px;">
                    <div style="display: flex; flex-wrap: wrap;">
                        ${barcodeHtml}
                    </div>
                    <script>
                        window.onload = () => {
                            setTimeout(() => {
                                window.print();
                                window.onafterprint = () => window.close();
                            }, 500);
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleViewBarcodes = async (encounter: Encounter) => {
        setSelectedEncounterForBarcodes(encounter);
        try {
            setIsLoadingBarcodes(true);
            setBarcodesData([]);

            const bills = await getBillsByEncounter(String(encounter.id));

            const firstBill = Array.isArray(bills) && bills.length > 0 ? bills[0] : null;
            let serviceRequestIds: number[] = Array.isArray(firstBill?.serviceRequestIds)
                ? firstBill.serviceRequestIds
                : [];

            if (serviceRequestIds.length === 0) {
                const detailedEncounter = await getEncounterById(String(encounter.id));
                serviceRequestIds = Array.isArray(detailedEncounter?.serviceRequestIds)
                    ? detailedEncounter.serviceRequestIds
                    : [];
            }

            if (serviceRequestIds.length === 0) {
                addNotification({ type: 'info', title: 'No Barcodes', message: 'No service requests found for this encounter.' });
                return;
            } else {
                const { getServiceRequestById, getSpecimensByServiceRequest } = await import('../services/api');
                const barcodesList = await Promise.all(
                    serviceRequestIds.map(async (srId: number) => {
                        try {
                            const sr = await getServiceRequestById(String(srId));
                            const requestedTests = sr.requestedTests || [];

                            const mappedFromRequestedTests = requestedTests.flatMap((test: any) =>
                                (Array.isArray(test?.specimenBarcodes) ? test.specimenBarcodes : [])
                                    .filter((barcode: unknown) => typeof barcode === 'string' && barcode.trim().length > 0)
                                    .map((barcode: string) => ({
                                        testName: test?.testName || 'Test',
                                        barcode,
                                        patientName: encounter.patientName,
                                        mrn: encounter.patientMrn || encounter.mrnId || ''
                                    }))
                            );

                            if (mappedFromRequestedTests.length > 0) {
                                return mappedFromRequestedTests;
                            }

                            // Fallback for response shapes where specimenBarcodes are not populated
                            const specimens = await getSpecimensByServiceRequest(String(srId));
                            return (specimens || [])
                                .filter((specimen: any) => typeof specimen?.barcode === 'string' && specimen.barcode.trim().length > 0)
                                .map((specimen: any, index: number) => ({
                                    testName: specimen?.specimenTypeName || `Specimen ${index + 1}`,
                                    barcode: specimen.barcode,
                                    patientName: encounter.patientName,
                                    mrn: encounter.patientMrn || encounter.mrnId || ''
                                }));
                        } catch {
                            return [];
                        }
                    })
                );

                const flattened = barcodesList.flat();
                setBarcodesData(flattened);
                setBarcodesModalOpen(true);

                if (flattened.length === 0) {
                    addNotification({ type: 'info', title: 'No Barcodes', message: 'No barcode data is available for this encounter yet.' });
                }
            }
        } catch (error) {
            addNotification({ type: 'error', title: 'Error', message: 'Failed to load barcodes.' });
            console.error('Failed to load barcodes:', error);
        } finally {
            setIsLoadingBarcodes(false);
        }
    };

    const handleViewBill = async (encounter: Encounter) => {
        setSelectedEncounterForBillDetails(encounter);
        try {
            const bills = await getBillsByEncounter(String(encounter.id));
            if (Array.isArray(bills) && bills.length > 0) {
                setBillDetailsData(bills[0]);
                setBillDetailsModalOpen(true);
            } else {
                setBillDetailsData(null);
                addNotification({ type: 'info', title: 'Info', message: 'No bill found for this encounter.' });
            }
        } catch (error) {
            setBillDetailsData(null);
            addNotification({ type: 'error', title: 'Error', message: 'Failed to load bill details.' });
            console.error('Failed to load bill:', error);
        }
    };

    const handleRecordPayment = async (encounter: Encounter) => {
        setSelectedEncounterForPayment(encounter);
        setIsLoadingPaymentContext(true);
        try {
            const bills = await getBillsByEncounter(String(encounter.id));
            if (!Array.isArray(bills) || bills.length === 0) {
                addNotification({ type: 'info', title: 'No Bill Found', message: 'Create a bill before recording payment.' });
                return;
            }

            const selectedBill =
                bills.find((bill) => bill.status === 'DUE' || bill.status === 'PARTIALLY_PAID') ||
                bills[0];

            setBillDetailsData(selectedBill);
            setPaymentModalPaymentAmount(getDueAmount(selectedBill));
            setPaymentModalMethod('CASH');
            setPaymentModalNotes('');
            setPaymentModalOpen(true);
        } catch (error) {
            addNotification({ type: 'error', title: 'Error', message: 'Failed to load bill for payment.' });
            console.error('Failed to load payment context:', error);
        } finally {
            setIsLoadingPaymentContext(false);
        }
    };

    const handleUpdateBill = async (encounter: Encounter) => {
        setIsLoadingPaymentContext(true);
        try {
            const updatedBill = await syncBill(encounter.id);
            setBillDetailsData(updatedBill);
            setEncounterBillSettled(prev => ({ ...prev, [encounter.id]: isBillSettledForUpdates(updatedBill) }));
            addNotification({ type: 'success', title: 'Bill Updated', message: 'Bill synchronized with current encounter tests successfully.' });
            onEncounterUpdate();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update bill.';
            addNotification({ type: 'error', title: 'Error', message });
            console.error('Failed to update bill:', error);
        } finally {
            setIsLoadingPaymentContext(false);
        }
    };

    const handleSubmitPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEncounterForPayment || !billDetailsData) return;

        try {
            setIsRecordingPayment(true);
            const { recordPayment } = await import('../services/api');
            const updatedBill = await recordPayment(String(billDetailsData.billId || billDetailsData.id), {
                amountPaid: paymentModalPaymentAmount,
                paymentMethod: paymentModalMethod,
                notes: paymentModalNotes,
            });
            setBillDetailsData(updatedBill);
            setEncounterBillHasPayment(prev => ({ ...prev, [selectedEncounterForPayment.id]: true }));
            setEncounterBillSettled(prev => ({ ...prev, [selectedEncounterForPayment.id]: isBillSettledForUpdates(updatedBill) }));

            addNotification({ type: 'success', title: 'Success', message: 'Payment recorded successfully.' });
            setPaymentModalOpen(false);
            onEncounterUpdate();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to record payment.';
            addNotification({ type: 'error', title: 'Error', message });
            console.error('Failed to record payment:', error);
        } finally {
            setIsRecordingPayment(false);
        }
    };

    const hasMinimumPaymentForEncounter = async (encounter: Encounter): Promise<boolean> => {
        const bills = await getBillsByEncounter(String(encounter.id));
        if (!Array.isArray(bills) || bills.length === 0) {
            return false;
        }

        return bills.some((bill) => {
            const status = String(bill.status || '').toUpperCase();
            if (status === 'PAID' || status === 'PARTIALLY_PAID') {
                return true;
            }
            return Number(bill.paidAmount || 0) > 0;
        });
    };

    const hasFullPaymentForEncounter = async (encounter: Encounter): Promise<boolean> => {
        const bills = await getBillsByEncounter(String(encounter.id));
        if (!Array.isArray(bills) || bills.length === 0) {
            return false;
        }

        return bills.every((bill) => isBillSettledForUpdates(bill));
    };

    const canCompleteEncounter = async (encounter: Encounter): Promise<boolean> => {
        if (!isReceptionDeskRole) return false;
        if (encounter.status === 'APPROVED') return true;
        if (encounter.status !== 'IN_PROGRESS' && encounter.status !== 'PENDING_VERIFICATION') {
            return false;
        }

        const detailedEncounter = await getEncounterById(String(encounter.id));
        const serviceRequestIds = Array.isArray(detailedEncounter?.serviceRequestIds) ? detailedEncounter.serviceRequestIds : [];
        if (serviceRequestIds.length === 0) {
            return false;
        }

        const approvalStatuses = await Promise.all(
            serviceRequestIds.map((serviceRequestId) => getReportApprovalStatus(String(serviceRequestId)).catch(() => null))
        );

        return approvalStatuses.every((status) => Boolean(status?.ready));
    };

    const refreshCompletableFlags = async (encounterRows: Encounter[]) => {
        if (!isReceptionDeskRole || encounterRows.length === 0) {
            setCompletableEncounterIds({});
            return;
        }

        const verificationRows = encounterRows.filter(
            (encounter) => encounter.status === 'IN_PROGRESS' || encounter.status === 'PENDING_VERIFICATION'
        );
        if (verificationRows.length === 0) {
            setCompletableEncounterIds({});
            return;
        }

        const statusEntries = await Promise.all(
            verificationRows.map(async (encounter) => {
                try {
                    const eligible = await canCompleteEncounter(encounter);
                    return [encounter.id, eligible] as const;
                } catch {
                    return [encounter.id, false] as const;
                }
            })
        );

        const lookup: Record<number, boolean> = {};
        statusEntries.forEach(([id, value]) => {
            lookup[id] = value;
        });
        setCompletableEncounterIds(lookup);
    };

    const refreshReportReadyFlags = async (encounterRows: Encounter[]) => {
        if (encounterRows.length === 0) {
            setReportReadyEncounterIds({});
            return;
        }

        const entries = await Promise.all(
            encounterRows.map(async (encounter) => {
                try {
                    const detailedEncounter = await getEncounterById(String(encounter.id));
                    const serviceRequestIds = Array.isArray(detailedEncounter?.serviceRequestIds)
                        ? detailedEncounter.serviceRequestIds
                        : [];

                    if (serviceRequestIds.length === 0) {
                        return [encounter.id, false] as const;
                    }

                    const statuses = await Promise.all(
                        serviceRequestIds.map((id) => getReportApprovalStatus(String(id)).catch(() => null))
                    );

                    return [encounter.id, statuses.every((s) => Boolean(s?.ready))] as const;
                } catch {
                    return [encounter.id, false] as const;
                }
            })
        );

        const lookup: Record<number, boolean> = {};
        entries.forEach(([id, ready]) => {
            lookup[id] = ready;
        });
        setReportReadyEncounterIds(lookup);
    };

    const handleStartProgress = async (encounter: Encounter) => {
        try {
            setIsWorkflowActionLoading(true);
            const isPartiallyPaid = await hasMinimumPaymentForEncounter(encounter);
            if (!isPartiallyPaid) {
                addNotification({ type: 'warning', title: 'Payment Required', message: 'Please create bill and record at least a partial payment before starting progress.' });
                return;
            }

            await updateEncounterStatus(encounter.id.toString(), { status: 'IN_PROGRESS' });
            onEncounterUpdate();
        } catch (error) {
            console.error('Failed to start progress', error);
            addNotification({ type: 'error', title: 'Error', message: 'Failed to start progress.' });
        } finally {
            setIsWorkflowActionLoading(false);
        }
    };

    const handleApproveEncounter = async (encounter: Encounter) => {
        try {
            setIsWorkflowActionLoading(true);
            await updateEncounterWorkflowStatus(encounter.id.toString(), 'APPROVED');
            addNotification({ 
                type: 'success', 
                title: 'Encounter Approved', 
                message: `Visit ${encounter.localEncounterValue} has been approved.` 
            });
            onEncounterUpdate();
        } catch (error) {
            console.error('Failed to approve encounter', error);
            const message = error instanceof Error ? error.message : 'Failed to approve encounter manually.';
            addNotification({ 
                type: 'error', 
                title: 'Approval Failed', 
                message: message 
            });
        } finally {
            setIsWorkflowActionLoading(false);
        }
    };

    const handleCompleteEncounter = async (encounter: Encounter) => {
        try {
            setIsWorkflowActionLoading(true);

            // Always fetch fresh bill status to prevent premature completion
            const billSettled = await hasFullPaymentForEncounter(encounter);
            if (!billSettled) {
                addNotification({ type: 'warning', title: 'Payment Pending', message: 'Please complete the full payment before marking the encounter as completed.' });
                return;
            }

            const effectiveStatus = getEffectiveEncounterStatus(encounter);
            const autoEligible =
                effectiveStatus === 'APPROVED' ||
                Boolean(reportReadyEncounterIds[encounter.id]);

            const eligible = autoEligible ? true : await canCompleteEncounter(encounter);
            if (!eligible) {
                addNotification({ type: 'warning', title: 'Not Eligible', message: 'Conditions for completion not met (Approval pending or missing results).' });
                return;
            }

            await updateEncounterWorkflowStatus(encounter.id.toString(), 'COMPLETED');
            addNotification({ type: 'success', title: 'Encounter Completed', message: `Visit ${encounter.localEncounterValue} has been finalized.` });
            onEncounterUpdate();
        } catch (error) {
            console.error('Failed to complete encounter', error);
            const message = error instanceof Error ? error.message : 'Failed to complete encounter.';
            addNotification({ type: 'error', title: 'Error', message: message });
        } finally {
            setIsWorkflowActionLoading(false);
        }
    };

    const onEncounterUpdate = () => {
        // Refetch encounters to update status
        fetchEncounters(searchQuery, selectedTests, startDate, endDate, currentPage);
    };

    useEffect(() => {
        if (encounters.length > 0) {
            refreshCompletableFlags(encounters);
            refreshReportReadyFlags(encounters);
        } else {
            setReportReadyEncounterIds({});
        }
    }, [encounters, isReceptionDeskRole]);

    useEffect(() => {
        let cancelled = false;

        const refreshBillPresence = async () => {
            if (encounters.length === 0) {
                setEncounterBillPresence({});
                return;
            }

            const entries = await Promise.all(
                encounters.map(async (encounter) => {
                    try {
                        const bills = await getBillsByEncounter(String(encounter.id));
                        if (!Array.isArray(bills) || bills.length === 0) {
                            return [encounter.id, { hasBill: false, hasPayment: false, isSettled: false }] as const;
                        }

                        const bill = bills[0];
                        const paidAmount = Number(bill?.paidAmount || 0);
                        const status = String(bill?.status || '').toUpperCase();

                        return [
                            encounter.id,
                            {
                                hasBill: true,
                                hasPayment: paidAmount > 0 || status === 'PAID' || status === 'PARTIALLY_PAID',
                                isSettled: isBillSettledForUpdates(bill),
                            }
                        ] as const;
                    } catch {
                        return [encounter.id, { hasBill: false, hasPayment: false, isSettled: false }] as const;
                    }
                })
            );

            if (cancelled) return;

            const billLookup: Record<number, boolean> = {};
            const paymentLookup: Record<number, boolean> = {};
            const settledLookup: Record<number, boolean> = {};

            entries.forEach(([id, summary]) => {
                billLookup[id] = summary.hasBill;
                paymentLookup[id] = summary.hasPayment;
                settledLookup[id] = summary.isSettled;
            });
            setEncounterBillPresence(billLookup);
            setEncounterBillHasPayment(paymentLookup);
            setEncounterBillSettled(settledLookup);
        };

        refreshBillPresence();

        return () => {
            cancelled = true;
        };
    }, [encounters]);

    useEffect(() => {
        const openBillingForEncounterId = (location.state as any)?.openBillingForEncounterId;
        if (!openBillingForEncounterId) return;

        const targetEncounter = encounters.find((encounter) => String(encounter.id) === String(openBillingForEncounterId));
        if (targetEncounter) {
            // Open the billing workflow directly
            handleBill(targetEncounter);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, encounters, navigate, location.pathname]);

    const fetchEncounters = async (query: string, testIds: string[], startDate: string, endDate: string, page: number) => {
        setIsLoading(true);
        try {
            const orgId = localStorage.getItem('organizationId');
            if (!orgId) {
                throw new Error('Organization ID not found');
            }
            const response = await searchEncounters(orgId, startDate, endDate, query, testIds, page - 1, pageSize);
            
            setEncounters(response.content);
            setTotalPages(response.totalPages);
            setCurrentPage(page);
        } catch (error) {
            console.error('Failed to fetch encounters:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const orgId = localStorage.getItem('organizationId');
        if (orgId) {
            getEnabledTestsForLab(orgId)
                .then(setTests)
                .catch(error => console.error('Failed to fetch tests:', error));
        }
    }, []);

    useEffect(() => {
        // Fetch encounters when filters change
        fetchEncounters(searchQuery, selectedTests, startDate, endDate, 1);
    }, [searchQuery, selectedTests, startDate, endDate]);

    const handleFilter = () => {
        fetchEncounters(searchQuery, selectedTests, startDate, endDate, 1);
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            fetchEncounters(searchQuery, selectedTests, startDate, endDate, currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            fetchEncounters(searchQuery, selectedTests, startDate, endDate, currentPage + 1);
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

    const getEffectiveEncounterStatus = (encounter: Encounter): Encounter['status'] => {
        return encounter.status;
    };

    const filteredEncounters = encounters.filter((encounter) => {
        const effectiveStatus = getEffectiveEncounterStatus(encounter);
        switch (statusFilter) {
            case 'ACTIVE':
                return ['ARRIVED', 'IN_PROGRESS'].includes(effectiveStatus);
            case 'VERIFICATION':
                return effectiveStatus === 'PENDING_VERIFICATION';
            case 'APPROVED':
                return effectiveStatus === 'APPROVED';
            case 'COMPLETED':
                return effectiveStatus === 'COMPLETED';
            case 'ALL':
            default:
                return true;
        }
    });
    
    const handleTestSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { options } = e.target;
        const value: string[] = [];
        for (let i = 0, l = options.length; i < l; i += 1) {
            if (options[i].selected) {
                value.push(options[i].value);
            }
        }
        setSelectedTests(value);
    };

    const openActionsModal = (encounter: Encounter) => {
        setSelectedEncounterForActions(encounter);
        setActionsDrawerTab('actions');
        setBillDetailsData(null);
        setBarcodesData([]);
    };

    const closeActionsModal = () => {
        setSelectedEncounterForActions(null);
        setActionsDrawerTab('actions');
    };

    const handleViewBarcodesInDrawer = async (encounter: Encounter) => {
        setSelectedEncounterForBarcodes(encounter);
        setActionsDrawerTab('barcodes');
        await handleViewBarcodes(encounter);
        setBarcodesModalOpen(false);
    };

    const handleViewBillInDrawer = async (encounter: Encounter) => {
        setSelectedEncounterForBillDetails(encounter);
        setActionsDrawerTab('bill');
        await handleViewBill(encounter);
        setBillDetailsModalOpen(false);
    };

    const handleRecordPaymentInDrawer = async (encounter: Encounter) => {
        setSelectedEncounterForPayment(encounter);
        setActionsDrawerTab('payment');
        await handleRecordPayment(encounter);
        setPaymentModalOpen(false);
    };

    useEffect(() => {
        if (!selectedEncounterForActions) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeActionsModal();
            }
        };

        window.addEventListener('keydown', handleEscape);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleEscape);
        };
    }, [selectedEncounterForActions]);

    // Keep the selected encounter for actions fresh when the main list updates
    useEffect(() => {
        if (selectedEncounterForActions) {
            const fresh = encounters.find(e => e.id === selectedEncounterForActions.id);
            if (fresh && (
                fresh.status !== selectedEncounterForActions.status || 
                JSON.stringify(fresh.tests) !== JSON.stringify(selectedEncounterForActions.tests)
            )) {
                setSelectedEncounterForActions(fresh);
            }
        }
    }, [encounters, selectedEncounterForActions]);

    useEffect(() => {
        if (!selectedEncounterForActions) {
            return;
        }
        setBillDetailsData(null);
    }, [selectedEncounterForActions?.id]);

    return (
        <div className="bg-gradient-to-br from-white to-cyan-50 p-6 rounded-xl shadow-lg border border-cyan-100">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent mb-2">
                    Patient Encounters
                </h2>
                <p className="text-sm text-gray-600">Manage patient visits and consultations</p>
            </div>
            
            {/* Filters - Compact Single Row */}
            <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Search */}
                    <div className="flex-1 min-w-[250px]">
                        <input 
                            type="text" 
                            placeholder="Search by name, phone, UHID, ABHA..." 
                            className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Date Range */}
                    <div className="flex items-center gap-2">
                        <input 
                            type="date" 
                            className="px-3 py-2 text-sm border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all" 
                            value={startDate} 
                            onChange={e => setStartDate(e.target.value)} 
                        />
                        <span className="text-gray-400 font-bold text-sm">to</span>
                        <input 
                            type="date" 
                            className="px-3 py-2 text-sm border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all" 
                            value={endDate} 
                            onChange={e => setEndDate(e.target.value)} 
                        />
                    </div>

                    {/* Date Presets */}
                    <div className="flex items-center gap-1.5">
                        <button onClick={() => handleDatePreset('7d')} className="px-2.5 py-1.5 text-xs text-cyan-700 bg-cyan-50 rounded-md hover:bg-cyan-100 hover:text-cyan-800 border border-cyan-200 font-medium transition-colors whitespace-nowrap">7 days</button>
                        <button onClick={() => handleDatePreset('1m')} className="px-2.5 py-1.5 text-xs text-cyan-700 bg-cyan-50 rounded-md hover:bg-cyan-100 hover:text-cyan-800 border border-cyan-200 font-medium transition-colors whitespace-nowrap">1 month</button>
                        <button onClick={() => handleDatePreset('3m')} className="px-2.5 py-1.5 text-xs text-cyan-700 bg-cyan-50 rounded-md hover:bg-cyan-100 hover:text-cyan-800 border border-cyan-200 font-medium transition-colors whitespace-nowrap">3 months</button>
                    </div>

                    {/* Total Counter */}
                    <div className="flex items-center bg-gradient-to-r from-cyan-50 to-teal-50 px-3 py-2 rounded-lg border border-cyan-200 whitespace-nowrap">
                        <span className="text-xs text-gray-600">Total:</span>
                        <span className="ml-1.5 text-sm font-bold text-cyan-700">{filteredEncounters.length}</span>
                        <span className="ml-1 text-xs text-gray-600">filtered</span>
                    </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-2">
                    {([
                        { key: 'ALL', label: 'All' },
                        { key: 'ACTIVE', label: 'Active' },
                        { key: 'VERIFICATION', label: 'Verification Pending' },
                        { key: 'APPROVED', label: 'Approved' },
                        { key: 'COMPLETED', label: 'Completed' },
                    ] as Array<{ key: EncounterStatusFilter; label: string }>).map((option) => (
                        <button
                            key={option.key}
                            type="button"
                            onClick={() => setStatusFilter(option.key)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${statusFilter === option.key
                                ? 'bg-cyan-600 border-cyan-600 text-white'
                                : 'bg-white border-gray-300 text-gray-600 hover:border-cyan-300 hover:text-cyan-700'
                                }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                {/* Clear Filters */}
                {searchQuery && (
                    <div className="flex items-center justify-start mt-3 pt-3 border-t border-gray-200">
                        <button
                            onClick={() => setSearchQuery('')}
                            className="px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md font-medium transition-colors flex items-center"
                        >
                            <span className="mr-1">x</span>
                            Clear filters
                        </button>
                    </div>
                )}
            </div>

            {/* Encounter Table */}
            <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <svg className="animate-spin h-8 w-8 text-cyan-600" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        <span className="ml-3 text-gray-600">Loading encounters...</span>
                    </div>
                ) : filteredEncounters.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        <p className="mt-2">No encounters match current filters</p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-cyan-50 to-teal-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Encounter ID</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Patient ID</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Patient Name</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ref. Doctor</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Tests</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Progress</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Open</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredEncounters.map((encounter) => (
                                <tr
                                    key={encounter.id}
                                    onClick={() => openActionsModal(encounter)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            openActionsModal(encounter);
                                        }
                                    }}
                                    className="hover:bg-cyan-50 transition-colors cursor-pointer"
                                    role="button"
                                    tabIndex={0}
                                    title="Click to open encounter actions"
                                >
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {encounter.localEncounterValue || `ENC-${encounter.id.toString().padStart(6, '0')}`}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-cyan-600">{encounter.mrnId}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">{encounter.patientName}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{encounter.referenceDoctor}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{encounter.tests.join(', ')}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{new Date(encounter.date).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 min-w-[280px]">
                                        <WorkflowStepper
                                            status={getEffectiveEncounterStatus(encounter)}
                                            hasTests={encounter.tests && encounter.tests.length > 0}
                                            billStatus={
                                                encounterBillSettled[encounter.id]
                                                    ? 'PAID'
                                                    : encounterBillHasPayment[encounter.id]
                                                        ? 'PARTIALLY_PAID'
                                                        : encounterBillPresence[encounter.id]
                                                            ? 'DUE'
                                                            : undefined
                                            }
                                        />
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <StatusBadge status={getEffectiveEncounterStatus(encounter)} />
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                                        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-cyan-700 font-semibold">
                                            Open
                                            <span aria-hidden="true">-&gt;</span>
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 px-4">
                    <button
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1 || isLoading}
                        className="px-4 py-2 text-sm font-medium text-cyan-700 bg-white border-2 border-cyan-200 rounded-lg hover:bg-cyan-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        Previous
                    </button>
                    <span className="text-sm font-medium text-gray-700">
                        Page <span className="text-cyan-600 font-bold">{currentPage}</span> of <span className="text-cyan-600 font-bold">{totalPages}</span>
                    </span>
                    <button
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages || isLoading}
                        className="px-4 py-2 text-sm font-medium text-cyan-700 bg-white border-2 border-cyan-200 rounded-lg hover:bg-cyan-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        Next
                    </button>
                </div>
            )}

            {isBillingModalOpen && <Billing 
                isOpen={isBillingModalOpen}
                onClose={() => setIsBillingModalOpen(false)}
                encounter={selectedEncounterForBilling}
                onBillCreated={onEncounterUpdate}
            />}

            {/* Encounter Actions Drawer */}
            {selectedEncounterForActions && (
                <div
                    className="fixed inset-0 z-50"
                    onClick={closeActionsModal}
                >
                    <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
                    <div
                        className="absolute top-0 right-0 h-full w-full max-w-3xl bg-gradient-to-b from-white to-slate-50 border-l border-cyan-100 shadow-2xl overflow-hidden transform transition-transform duration-300 rounded-l-2xl"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Encounter actions panel"
                    >
                        <div className="sticky top-0 z-10 px-6 py-5 bg-gradient-to-r from-cyan-700 via-sky-600 to-teal-600 text-white border-b border-cyan-500/70 shadow-lg">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-100/90 font-semibold">Encounter Workspace</p>
                                    <h3 className="text-2xl font-bold mt-1">Encounter Actions</h3>
                                    <p className="text-cyan-100 mt-1 text-sm font-medium">
                                        {selectedEncounterForActions.localEncounterValue || `ENC-${selectedEncounterForActions.id.toString().padStart(6, '0')}`} | {selectedEncounterForActions.patientName}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeActionsModal}
                                    className="rounded-lg border border-white/50 bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2 rounded-xl bg-white/10 p-1.5 w-fit">
                                {(['actions', 'barcodes', 'bill'] as DrawerTab[]).map((tab) => (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => setActionsDrawerTab(tab)}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${actionsDrawerTab === tab ? 'bg-white text-cyan-700 shadow-sm' : 'text-white hover:bg-white/20'}`}
                                    >
                                        {tab === 'actions' ? 'Actions' : tab === 'barcodes' ? 'Barcodes' : 'Bill'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="h-[calc(100%-88px)] overflow-y-auto p-6 space-y-5 bg-gradient-to-b from-white via-slate-50/40 to-cyan-50/30">
                            {actionsDrawerTab === 'actions' && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Patient ID</p>
                                            <p className="text-sm font-bold text-gray-900">{selectedEncounterForActions.mrnId || '-'}</p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Date</p>
                                            <p className="text-sm font-bold text-gray-900">{new Date(selectedEncounterForActions.date).toLocaleDateString()}</p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Ref. Doctor</p>
                                            <p className="text-sm font-bold text-gray-900 truncate">{selectedEncounterForActions.referenceDoctor || '-'}</p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Status</p>
                                            <div className="mt-1">
                                                <StatusBadge status={getEffectiveEncounterStatus(selectedEncounterForActions)} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50/80 to-white p-4 shadow-sm">
                                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700 mb-3">
                                            Choose an action
                                        </p>
                                        <ActionButtons
                                            encounter={selectedEncounterForActions}
                                            isReceptionDeskRole={isReceptionDeskRole}
                                            isDoctorRole={isDoctorRole}
                                            onApprove={handleApproveEncounter}
                                            onBill={(encounter) => {
                                                handleBill(encounter);
                                            }}
                                            onStartProgress={async (encounter) => {
                                                await handleStartProgress(encounter);
                                            }}
                                            onCompleteEncounter={async (encounter) => {
                                                await handleCompleteEncounter(encounter);
                                            }}
                                            canCompleteEncounter={Boolean(completableEncounterIds[selectedEncounterForActions.id])}
                                            isReportReady={Boolean(reportReadyEncounterIds[selectedEncounterForActions.id])}
                                            hasBill={Boolean(encounterBillPresence[selectedEncounterForActions.id])}
                                            hasPayment={Boolean(encounterBillHasPayment[selectedEncounterForActions.id])}
                                            isBillSettled={Boolean(encounterBillSettled[selectedEncounterForActions.id])}
                                            onViewBarcodes={async (encounter) => {
                                                await handleViewBarcodesInDrawer(encounter);
                                            }}
                                            onViewBill={async (encounter) => {
                                                await handleViewBillInDrawer(encounter);
                                            }}
                                            onRecordPayment={async (encounter) => {
                                                await handleRecordPaymentInDrawer(encounter);
                                            }}
                                            onUpdateBill={async (encounter) => {
                                                await handleUpdateBill(encounter);
                                                await handleViewBillInDrawer(encounter);
                                            }}
                                        />
                                    </div>
                                </>
                            )}

                            {actionsDrawerTab === 'barcodes' && (
                                <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/40 p-4 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-lg font-bold text-blue-800">Specimen Barcodes</h4>
                                        <button
                                            type="button"
                                            onClick={() => setActionsDrawerTab('actions')}
                                            className="px-3 py-1.5 rounded-md border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-50"
                                        >
                                            Back to Actions
                                        </button>
                                    </div>
                                    {isLoadingBarcodes ? (
                                        <div className="text-center py-10 text-gray-600">Loading barcodes...</div>
                                    ) : barcodesData.length > 0 ? (
                                        <>
                                            <div className="mb-4">
                                                <button
                                                    onClick={handlePrintBarcodes}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all active:scale-[0.98]"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                    </svg>
                                                    Print All Barcodes
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {barcodesData.map((test, idx) => (
                                                    <div key={idx} className="p-4 bg-white border border-blue-100 rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-blue-500">
                                                        <div className="flex flex-col items-center">
                                                            <p className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-3 w-full text-center truncate px-2">{test.testName}</p>
                                                            <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-3 flex flex-col items-center w-full">
                                                                {typeof test.barcode === 'string' && /^[A-Za-z0-9+/=]+$/.test(test.barcode)
                                                                    ? <img src={`data:image/png;base64,${test.barcode}`} alt={`Barcode for ${test.testName}`} className="max-h-16 mb-2" />
                                                                    : <Barcode value={String(test.barcode)} height={40} displayValue={false} width={1.2} />}
                                                                <span className="text-[10px] font-mono text-slate-500 mt-1">{test.barcode}</span>
                                                            </div>
                                                            <div className="mt-3 w-full border-t border-slate-100 pt-2 text-center">
                                                                <p className="text-[11px] font-bold text-slate-700 truncate">{test.patientName}</p>
                                                                <p className="text-[10px] text-slate-500">MRN: {test.mrn}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-gray-600">No barcodes available.</p>
                                    )}
                                </div>
                            )}

                            {actionsDrawerTab === 'bill' && (
                                <div className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-white to-cyan-50/40 p-4 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-lg font-bold text-cyan-800">Bill Details</h4>
                                        <button
                                            type="button"
                                            onClick={() => setActionsDrawerTab('actions')}
                                            className="px-3 py-1.5 rounded-md border border-cyan-200 text-cyan-700 text-xs font-semibold hover:bg-cyan-50"
                                        >
                                            Back to Actions
                                        </button>
                                    </div>
                                    {billDetailsData ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="border border-slate-200 rounded-xl p-3 bg-white">
                                                    <p className="text-xs font-semibold text-gray-600">TOTAL</p>
                                                    <p className="text-lg font-bold text-gray-900">{formatCurrency(billDetailsData.totalAmount)}</p>
                                                </div>
                                                <div className="border rounded-xl p-3 border-green-300 bg-green-50">
                                                    <p className="text-xs font-semibold text-gray-600">PAID</p>
                                                    <p className="text-lg font-bold text-green-700">{formatCurrency(billDetailsData.paidAmount)}</p>
                                                </div>
                                                <div className="border rounded-xl p-3 border-red-300 bg-red-50">
                                                    <p className="text-xs font-semibold text-gray-600">DUE</p>
                                                    <p className="text-lg font-bold text-red-700">{formatCurrency(getDueAmount(billDetailsData))}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => selectedEncounterForActions && handleRecordPayment(selectedEncounterForActions)}
                                                    className="px-3 py-2 border border-green-500 text-green-700 text-xs font-semibold rounded hover:bg-green-50"
                                                >
                                                    Record Payment
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setBillDetailsModalOpen(true)}
                                                    className="px-3 py-2 border border-blue-500 text-blue-700 text-xs font-semibold rounded hover:bg-blue-50"
                                                >
                                                    View Full Invoice
                                                </button>
                                                {getEffectiveEncounterStatus(selectedEncounterForActions) !== 'COMPLETED' && !isBillSettledForUpdates(billDetailsData) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => selectedEncounterForActions && handleBill(selectedEncounterForActions)}
                                                        className="px-3 py-2 border border-cyan-500 text-cyan-700 text-xs font-semibold rounded hover:bg-cyan-50"
                                                    >
                                                        Update Bill
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <p className="text-gray-600">No bill found for this encounter.</p>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => selectedEncounterForActions && handleBill(selectedEncounterForActions)}
                                                    className="px-3 py-2 bg-cyan-600 text-white text-xs font-semibold rounded hover:bg-cyan-700"
                                                >
                                                    Create New Bill
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => selectedEncounterForActions && handleViewBillInDrawer(selectedEncounterForActions)}
                                                    className="px-3 py-2 border border-slate-300 text-slate-600 text-xs font-semibold rounded hover:bg-slate-50"
                                                >
                                                    Refresh
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}

            {/* Barcodes Modal */}
            {barcodesModalOpen && selectedEncounterForBarcodes && (
                <div className="fixed inset-0 bg-black bg-opacity-40 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                    <div className="mx-auto p-0 border w-full max-w-2xl shadow-2xl rounded-xl bg-white overflow-hidden">
                        <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-cyan-600">
                            <h2 className="text-xl font-bold text-white">Specimen Barcodes</h2>
                            <p className="text-sm text-blue-100 mt-1">Encounter: {selectedEncounterForBarcodes.localEncounterValue} | Patient: {selectedEncounterForBarcodes.patientName}</p>
                        </div>

                        <div className="p-6">
                        {isLoadingBarcodes ? (
                            <div className="text-center py-10 text-gray-600">Loading barcodes...</div>
                        ) : barcodesData.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 max-h-[50vh] overflow-auto pr-1">
                                {barcodesData.map((test, idx) => (
                                    <div key={idx} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                                        <div className="text-center">
                                            <p className="text-sm font-semibold text-gray-800 mb-2">{test.testName}</p>
                                            <div className="bg-gray-50 rounded border p-2 flex justify-center">
                                                {typeof test.barcode === 'string' && /^[A-Za-z0-9+/=]+$/.test(test.barcode)
                                                    ? <img src={`data:image/png;base64,${test.barcode}`} alt={`Barcode for ${test.testName}`} className="max-h-20" />
                                                    : <Barcode value={String(test.barcode)} height={48} displayValue={false} width={1.4} />}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(String(test.barcode || ''));
                                                    addNotification({ type: 'info', title: 'Copied', message: 'Barcode copied.' });
                                                }}
                                                className="mt-3 px-3 py-1.5 border border-blue-500 text-blue-700 text-xs font-semibold rounded hover:bg-blue-50 transition-colors"
                                            >
                                                Copy Barcode
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-600 py-6">No barcodes available</p>
                        )}
                        <div className="border-t pt-4 flex justify-end gap-2">
                            <button
                                onClick={() => setBarcodesModalOpen(false)}
                                className="px-6 py-2 border border-gray-400 text-gray-700 font-semibold rounded hover:bg-gray-50 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Invoice Modal (Unified Professional View) */}
            <InvoiceModal
                isOpen={billDetailsModalOpen}
                onClose={() => setBillDetailsModalOpen(false)}
                bill={billDetailsData}
                formatCurrency={formatCurrency}
            />

            {/* Record Payment Modal - Simplified and Styled */}
            {paymentModalOpen && selectedEncounterForPayment && billDetailsData && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
                    <div className="relative mx-auto bg-white w-full max-w-md shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        <div className="px-8 py-6 bg-emerald-600">
                            <h2 className="text-xl font-black text-white tracking-tight">Record Payment</h2>
                            <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mt-1">Encounter #{selectedEncounterForPayment.localEncounterValue}</p>
                        </div>

                        <div className="p-8">
                            <form onSubmit={handleSubmitPayment} className="space-y-6">
                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Outstanding Balance</p>
                                    <p className="text-3xl font-black text-slate-900">{formatCurrency(getDueAmount(billDetailsData))}</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Payment Amount (₹)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max={getDueAmount(billDetailsData)}
                                        value={paymentModalPaymentAmount}
                                        onChange={(e) => setPaymentModalPaymentAmount(Number(e.target.value))}
                                        placeholder="0.00"
                                        required
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-black text-slate-900 focus:border-emerald-500 focus:ring-0 transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Payment Method</label>
                                    <select 
                                        value={paymentModalMethod}
                                        onChange={(e) => setPaymentModalMethod(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-bold text-slate-900 focus:border-emerald-500 focus:ring-0 transition-all appearance-none"
                                    >
                                        <option value="CASH">Cash</option>
                                        <option value="CARD">Card</option>
                                        <option value="UPI">UPI</option>
                                        <option value="CHEQUE">Cheque</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Reference Notes</label>
                                    <textarea
                                        value={paymentModalNotes}
                                        onChange={(e) => setPaymentModalNotes(e.target.value)}
                                        rows={2}
                                        placeholder="e.g. Transaction ID, Cheque details..."
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-bold text-slate-900 focus:border-emerald-500 focus:ring-0 transition-all resize-none"
                                    />
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentModalOpen(false)}
                                        disabled={isRecordingPayment}
                                        className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isRecordingPayment || paymentModalPaymentAmount <= 0}
                                        className="flex-1 px-6 py-3 bg-emerald-600 text-white font-black rounded-xl shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0"
                                    >
                                        {isRecordingPayment ? 'Recording...' : 'Record Payment'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {isWorkflowActionLoading && (
                <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">
                    Updating workflow status...
                </div>
            )}
        </div>
    );
};



