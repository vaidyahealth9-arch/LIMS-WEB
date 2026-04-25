import React, { useState, useEffect, useMemo } from 'react';
import {
    getAllOrganizationTestsForLab,
    getAnalytesForOrganization,
    getAllMasterTests,
    getOrganizationById,
    getUsersByOrganization,
    updateUser,
    addOrUpdateAnalyteForOrganization,
    createOrUpdateOrganizationTest,
    setAnalytesForOrganizationTest,
    bulkUpdateOrganizationTestPrices,
    updateOrganizationReportBranding,
    uploadFile,
} from '../services/api';
import type { OrganizationTest, Analyte, MasterTest, User } from '../types';
import { useNotifications } from '../services/NotificationContext';
import { useAuth } from '../services/AuthContext';
import TestFormModal from '../components/TestFormModal';
import AnalyteFormModal from '../components/AnalyteFormModal';

interface AssignAnalytesModalProps {
    isOpen: boolean;
    onClose: () => void;
    test: OrganizationTest;
    allAnalytes: Analyte[];
    onSave: (testId: number, analyteIds: number[]) => void;
}

const AssignAnalytesModal: React.FC<AssignAnalytesModalProps> = ({ isOpen, onClose, test, allAnalytes, onSave }) => {
    const [selectedAnalyteIds, setSelectedAnalyteIds] = useState<Set<number>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const preselectedFromTest = Array.isArray(test?.analyteIds) ? test.analyteIds : [];

        const preselectedFromMappings = allAnalytes
            .filter((analyte) => {
                if (analyte.testId != null) {
                    return analyte.testId === test.testId;
                }
                return analyte.associatedTest === test.testName;
            })
            .map((analyte) => analyte.id);

        const preselected = preselectedFromTest.length > 0
            ? preselectedFromTest
            : preselectedFromMappings;

        setSelectedAnalyteIds(new Set(preselected));
        setSearchTerm('');
    }, [test, isOpen, allAnalytes]);

    const analytesForTest = allAnalytes.filter((analyte) => {
        if (analyte.testId != null) {
            return analyte.testId === test.testId;
        }
        return analyte.associatedTest === test.testName;
    });

    const hasAnyTestScopedMetadata = allAnalytes.some(
        (analyte) => analyte.testId != null || Boolean(analyte.associatedTest && analyte.associatedTest.trim())
    );
    const showMetadataFallbackNotice = analytesForTest.length === 0 && !hasAnyTestScopedMetadata;
    const showNoAnalytesConfiguredNotice = analytesForTest.length === 0 && hasAnyTestScopedMetadata;

    const analytePool = analytesForTest.length > 0 ? analytesForTest : allAnalytes;

    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filteredAnalytes = analytePool
        .filter((analyte) => {
            if (!normalizedSearch) {
                return true;
            }

            const searchTarget = `${analyte.name} ${analyte.code} ${analyte.bioReference}`.toLowerCase();
            return searchTarget.includes(normalizedSearch);
        })
        .sort((a, b) => {
            const aSelected = selectedAnalyteIds.has(a.id) ? 1 : 0;
            const bSelected = selectedAnalyteIds.has(b.id) ? 1 : 0;
            if (aSelected !== bSelected) {
                return bSelected - aSelected;
            }
            return a.name.localeCompare(b.name);
        });

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
        const allowedAnalyteIds = new Set(analytePool.map((analyte) => analyte.id));
        const sanitizedSelectedAnalyteIds = Array.from(selectedAnalyteIds).filter((analyteId) => allowedAnalyteIds.has(analyteId));
        onSave(test.testId, sanitizedSelectedAnalyteIds);
    };

    const handleSelectAllVisible = () => {
        setSelectedAnalyteIds(prev => {
            const next = new Set(prev);
            filteredAnalytes.forEach((analyte) => next.add(analyte.id));
            return next;
        });
    };

    const handleClearVisible = () => {
        setSelectedAnalyteIds(prev => {
            const next = new Set(prev);
            filteredAnalytes.forEach((analyte) => next.delete(analyte.id));
            return next;
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-3xl w-full">
                <h3 className="text-xl font-bold mb-4">Manage Analytes for {test.testName}</h3>
                <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                    <div>
                        <label htmlFor="analyte-search" className="block text-xs font-semibold text-gray-600 mb-1">Search analyte</label>
                        <input
                            id="analyte-search"
                            type="text"
                            placeholder="Search by name, code, or reference"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div className="flex md:justify-end gap-2">
                        <button onClick={handleSelectAllVisible} className="px-3 py-2 text-sm rounded-md bg-cyan-50 text-cyan-700 hover:bg-cyan-100">
                            Select visible
                        </button>
                        <button onClick={handleClearVisible} className="px-3 py-2 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200">
                            Clear visible
                        </button>
                    </div>
                </div>
                <div className="mb-3 flex flex-wrap gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-800 font-semibold">Already selected: {selectedAnalyteIds.size}</span>
                    <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">Showing: {filteredAnalytes.length} / {analytePool.length}</span>
                </div>
                {showMetadataFallbackNotice && (
                    <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                        Test-specific analyte mapping metadata is unavailable for this test, so all analytes are shown.
                    </div>
                )}
                {showNoAnalytesConfiguredNotice && (
                    <div className="mb-3 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
                        No analytes are currently defined for this test yet. Showing all analytes so you can assign them.
                    </div>
                )}
                <div className="max-h-96 overflow-y-auto">
                    {filteredAnalytes.map(analyte => (
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
                    {filteredAnalytes.length === 0 && (
                        <div className="p-3 text-sm text-gray-500">No analytes match your search.</div>
                    )}
                </div>
                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500">Save Analytes</button>
                </div>
            </div>
        </div>
    );
};

type BannerKind = 'header' | 'footer';

const getBannerTarget = (kind: BannerKind) => {
    return kind === 'header'
        ? { width: 2200, height: 360 }
        : { width: 2200, height: 260 };
};

const MAX_BANNER_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_SIGNATURE_DATA_URL_LENGTH = 900000;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const BANNER_RULES: Record<BannerKind, {
    minWidth: number;
    minHeight: number;
    maxWidth: number;
    maxHeight: number;
    ratioMin: number;
    ratioMax: number;
    recommendedWidth: number;
    recommendedHeight: number;
}> = {
    header: {
        minWidth: 1200,
        minHeight: 180,
        maxWidth: 5000,
        maxHeight: 1200,
        ratioMin: 4.5,
        ratioMax: 8.0,
        recommendedWidth: 2200,
        recommendedHeight: 360,
    },
    footer: {
        minWidth: 1200,
        minHeight: 130,
        maxWidth: 5000,
        maxHeight: 1000,
        ratioMin: 6.0,
        ratioMax: 11.0,
        recommendedWidth: 2200,
        recommendedHeight: 260,
    },
};

const sanitizeGstinInput = (value: string): string => {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
};

const getGstinValidationMessage = (value: string): string => {
    if (!value) {
        return '';
    }

    if (value.length < 15) {
        return `GSTIN must be 15 characters (${value.length}/15).`;
    }

    if (!GSTIN_REGEX.test(value)) {
        return 'GSTIN format looks invalid. Example: 27ABCDE1234F1Z5';
    }

    return '';
};


const LabManagement: React.FC = () => {
    const { addNotification } = useNotifications();
    const { user } = useAuth();
    const [orgTests, setOrgTests] = useState<OrganizationTest[]>([]);
    const [masterTests, setMasterTests] = useState<MasterTest[]>([]);
    const [analytes, setAnalytes] = useState<Analyte[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [organizationId, setOrganizationId] = useState<string | null>(null);
    const [selectedTestIds, setSelectedTestIds] = useState<Set<number>>(new Set());
    const [bulkPrice, setBulkPrice] = useState('');
    const [reportHeaderImage, setReportHeaderImage] = useState('');
    const [reportFooterImage, setReportFooterImage] = useState('');
    const [reportHeaderMarginMm, setReportHeaderMarginMm] = useState('0');
    const [reportFooterMarginMm, setReportFooterMarginMm] = useState('0');
    const [reportHeaderHeightMm, setReportHeaderHeightMm] = useState('34');
    const [reportFooterHeightMm, setReportFooterHeightMm] = useState('24');
    const [gstin, setGstin] = useState('');
    const [isBrandingSaving, setIsBrandingSaving] = useState(false);
    const [doctorUsers, setDoctorUsers] = useState<User[]>([]);
    const [selectedDoctorUserId, setSelectedDoctorUserId] = useState('');
    const [selectedDoctorSignatureImage, setSelectedDoctorSignatureImage] = useState('');
    const [isDoctorSignatureSaving, setIsDoctorSignatureSaving] = useState(false);
    const [brandingSnapshot, setBrandingSnapshot] = useState<{
        reportHeaderImage: string;
        reportFooterImage: string;
        reportHeaderMarginMm: number;
        reportFooterMarginMm: number;
        reportHeaderHeightMm: number;
        reportFooterHeightMm: number;
        gstin: string;
    } | null>(null);

    const [isTestModalOpen, setIsTestModalOpen] = useState(false);
    const [isAnalyteModalOpen, setIsAnalyteModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

    const [editingTest, setEditingTest] = useState<OrganizationTest | null>(null);
    const [editingAnalyte, setEditingAnalyte] = useState<Analyte | null>(null);
    const [assigningTest, setAssigningTest] = useState<OrganizationTest | null>(null);

    const isAdminUser = useMemo(() => {
        const normalizedRole = (role: string) => role.toUpperCase().replace(/^ROLE_/, '');

        const sessionRoles = user?.roles && user.roles.length > 0
            ? user.roles
            : (() => {
                const storedUser = localStorage.getItem('user');
                if (!storedUser) {
                    return [] as string[];
                }

                try {
                    const parsed = JSON.parse(storedUser);
                    return Array.isArray(parsed?.roles) ? parsed.roles : [];
                } catch {
                    return [] as string[];
                }
            })();

        return sessionRoles.some((role) => normalizedRole(role) === 'ADMIN');
    }, [user]);

    const hasDoctorRole = (roles: string[] = []) => {
        return roles.some((role) => {
            const normalized = String(role || '').toUpperCase().replace(/^ROLE_/, '');
            return normalized === 'PATHOLOGIST' || normalized === 'DOCTOR' || normalized === 'RADIOLOGIST';
        });
    };

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
                getAllOrganizationTestsForLab(organizationId),
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

    const fetchDoctorUsers = async () => {
        if (!organizationId) return;
        try {
            const users = await getUsersByOrganization(organizationId);
            const doctors = users.filter((user) => hasDoctorRole(user.roles));
            setDoctorUsers(doctors);

            if (doctors.length === 0) {
                setSelectedDoctorUserId('');
                setSelectedDoctorSignatureImage('');
                return;
            }

            setSelectedDoctorUserId((previousUserId) => {
                const stillExists = doctors.some((doctor) => String(doctor.id) === previousUserId);
                return stillExists ? previousUserId : String(doctors[0].id);
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch doctors for signature management';
            addNotification({ type: 'error', title: 'Doctor List Load Failed', message, persist: true });
        }
    };

    useEffect(() => {
        if(organizationId) {
            fetchData();
            fetchDoctorUsers();
            getAllMasterTests()
                .then((tests) => {
                    setMasterTests(
                        [...tests].sort((a, b) => a.testName.localeCompare(b.testName))
                    );
                })
                .catch((error) => {
                    const message = error instanceof Error ? error.message : 'Failed to fetch master tests';
                    addNotification({ type: 'error', title: 'Master Test Load Failed', message, persist: true });
                });

            getOrganizationById(organizationId)
                .then((organization) => {
                    const nextHeaderImage = organization.reportHeaderImage || '';
                    const nextFooterImage = organization.reportFooterImage || '';
                    const nextHeaderMargin = organization.reportHeaderMarginMm ?? 0;
                    const nextFooterMargin = organization.reportFooterMarginMm ?? 0;
                    const nextHeaderHeight = organization.reportHeaderHeightMm ?? 34;
                    const nextFooterHeight = organization.reportFooterHeightMm ?? 24;
                    const nextGstin = organization.gstin || '';

                    setReportHeaderImage(nextHeaderImage);
                    setReportFooterImage(nextFooterImage);
                    setReportHeaderMarginMm(String(nextHeaderMargin));
                    setReportFooterMarginMm(String(nextFooterMargin));
                    setReportHeaderHeightMm(String(nextHeaderHeight));
                    setReportFooterHeightMm(String(nextFooterHeight));
                    setGstin(nextGstin);
                    setBrandingSnapshot({
                        reportHeaderImage: nextHeaderImage,
                        reportFooterImage: nextFooterImage,
                        reportHeaderMarginMm: nextHeaderMargin,
                        reportFooterMarginMm: nextFooterMargin,
                        reportHeaderHeightMm: nextHeaderHeight,
                        reportFooterHeightMm: nextFooterHeight,
                        gstin: nextGstin,
                    });
                })
                .catch((error) => {
                    const message = error instanceof Error ? error.message : 'Failed to fetch organization branding settings';
                    addNotification({ type: 'error', title: 'Branding Load Failed', message, persist: true });
                });
        }
    }, [organizationId, addNotification]);

    useEffect(() => {
        const selectedDoctor = doctorUsers.find((doctor) => String(doctor.id) === selectedDoctorUserId);
        setSelectedDoctorSignatureImage(selectedDoctor?.practitionerSignatureImage || '');
    }, [selectedDoctorUserId, doctorUsers]);

    const fileToDataUrl = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error('Failed to read selected image'));
            reader.readAsDataURL(file);
        });
    };

    const getImageDimensions = (dataUrl: string): Promise<{ width: number; height: number }> => {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve({ width: image.width, height: image.height });
            image.onerror = () => reject(new Error('Unable to read image dimensions.'));
            image.src = dataUrl;
        });
    };

    const validateBannerFile = async (file: File, dataUrl: string, kind: BannerKind) => {
        if (file.size > MAX_BANNER_FILE_SIZE_BYTES) {
            throw new Error('Image size must be 2 MB or less. Please upload a smaller image.');
        }

        const { width, height } = await getImageDimensions(dataUrl);
        const rule = BANNER_RULES[kind];

        if (width < rule.minWidth || height < rule.minHeight) {
            throw new Error(
                `Image is too small. Minimum required for ${kind} is ${rule.minWidth}x${rule.minHeight}px.`
            );
        }

        if (width > rule.maxWidth || height > rule.maxHeight) {
            throw new Error(
                `Image is too large. Maximum allowed for ${kind} is ${rule.maxWidth}x${rule.maxHeight}px.`
            );
        }

        const ratio = width / height;
        if (ratio < rule.ratioMin || ratio > rule.ratioMax) {
            throw new Error(
                `Image aspect ratio is not suitable for ${kind}. Please use a wide banner close to ${rule.recommendedWidth}x${rule.recommendedHeight}px.`
            );
        }
    };

    const renderBannerToDataUrl = async (
        dataUrl: string,
        kind: BannerKind,
    ): Promise<string> => {
        const target = getBannerTarget(kind);
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = target.width;
                canvas.height = target.height;

                const context = canvas.getContext('2d');
                if (!context) {
                    reject(new Error('Failed to prepare image canvas'));
                    return;
                }

                context.fillStyle = '#FFFFFF';
                context.fillRect(0, 0, canvas.width, canvas.height);

                const fitScale = Math.min(canvas.width / image.width, canvas.height / image.height);
                const drawWidth = image.width * fitScale;
                const drawHeight = image.height * fitScale;
                const x = (canvas.width - drawWidth) / 2;
                const y = (canvas.height - drawHeight) / 2;

                context.drawImage(image, x, y, drawWidth, drawHeight);

                resolve(canvas.toDataURL('image/jpeg', 0.92));
            };
            image.onerror = () => reject(new Error('Failed to process selected image'));
            image.src = dataUrl;
        });
    };


    const dataUrlToBlob = (dataUrl: string): Blob => {
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    };

    const normalizeBannerImage = async (

        file: File,
        kind: BannerKind
    ): Promise<string> => {
        const dataUrl = await fileToDataUrl(file);
        await validateBannerFile(file, dataUrl, kind);
        return renderBannerToDataUrl(dataUrl, kind);
    };

    const normalizeSignatureImage = async (file: File): Promise<string> => {
        const dataUrl = await fileToDataUrl(file);
        const { width, height } = await getImageDimensions(dataUrl);

        if (width < 120 || height < 50) {
            throw new Error('Signature image is too small. Use at least 120x50 pixels for clarity.');
        }

        const targetWidth = 900;
        const targetHeight = 220;

        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = targetWidth;
                canvas.height = targetHeight;

                const context = canvas.getContext('2d');
                if (!context) {
                    reject(new Error('Failed to prepare signature image canvas'));
                    return;
                }

                context.fillStyle = '#FFFFFF';
                context.fillRect(0, 0, canvas.width, canvas.height);

                const fitScale = Math.min(canvas.width / image.width, canvas.height / image.height);
                const drawWidth = image.width * fitScale;
                const drawHeight = image.height * fitScale;
                const x = (canvas.width - drawWidth) / 2;
                const y = (canvas.height - drawHeight) / 2;

                context.drawImage(image, x, y, drawWidth, drawHeight);

                let quality = 0.9;
                let normalizedDataUrl = canvas.toDataURL('image/jpeg', quality);

                while (normalizedDataUrl.length > MAX_SIGNATURE_DATA_URL_LENGTH && quality > 0.45) {
                    quality -= 0.1;
                    normalizedDataUrl = canvas.toDataURL('image/jpeg', quality);
                }

                if (normalizedDataUrl.length > MAX_SIGNATURE_DATA_URL_LENGTH) {
                    reject(new Error('Signature image is too large after processing. Please upload a smaller image.'));
                    return;
                }

                resolve(normalizedDataUrl);
            };
            image.onerror = () => reject(new Error('Failed to process signature image'));
            image.src = dataUrl;
        });
    };

    const handleHeaderImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const dataUrl = await normalizeBannerImage(file, 'header');
            const blob = dataUrlToBlob(dataUrl);
            const uploadRes = await uploadFile(new File([blob], 'header.jpg', { type: 'image/jpeg' }));
            setReportHeaderImage(uploadRes.url);
            addNotification({ type: 'success', title: 'Header Ready', message: 'Header image processed and uploaded.' });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to upload header image';
            addNotification({ type: 'error', title: 'Header Upload Failed', message, persist: true });
        }
    };

    const handleFooterImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const dataUrl = await normalizeBannerImage(file, 'footer');
            const blob = dataUrlToBlob(dataUrl);
            const uploadRes = await uploadFile(new File([blob], 'footer.jpg', { type: 'image/jpeg' }));
            setReportFooterImage(uploadRes.url);
            addNotification({ type: 'success', title: 'Footer Ready', message: 'Footer image processed and uploaded.' });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to upload footer image';
            addNotification({ type: 'error', title: 'Footer Upload Failed', message, persist: true });
        }
    };

    const handleSaveReportBranding = async () => {
        if (!organizationId) return;

        const headerMargin = Number(reportHeaderMarginMm || '0');
        const footerMargin = Number(reportFooterMarginMm || '0');
        const headerHeight = Number(reportHeaderHeightMm || '34');
        const footerHeight = Number(reportFooterHeightMm || '24');

        if (Number.isNaN(headerMargin) || headerMargin < 0 || Number.isNaN(footerMargin) || footerMargin < 0) {
            addNotification({ type: 'error', title: 'Invalid Margins', message: 'Header/Footer margins must be non-negative numbers.' });
            return;
        }

        if (Number.isNaN(headerHeight) || headerHeight < 0 || Number.isNaN(footerHeight) || footerHeight < 0) {
            addNotification({ type: 'error', title: 'Invalid Heights', message: 'Header/Footer heights must be non-negative numbers.' });
            return;
        }

        if (!isGstinValid) {
            addNotification({ type: 'error', title: 'Invalid GSTIN', message: gstinValidationMessage || 'Please enter a valid GSTIN.' });
            return;
        }

        try {
            setIsBrandingSaving(true);
            const updated = await updateOrganizationReportBranding(organizationId, {
                reportHeaderImage,
                reportFooterImage,
                reportHeaderMarginMm: headerMargin,
                reportFooterMarginMm: footerMargin,
                reportHeaderHeightMm: headerHeight,
                reportFooterHeightMm: footerHeight,
                gstin: normalizedGstin,
            });

            setReportHeaderImage(updated.reportHeaderImage || '');
            setReportFooterImage(updated.reportFooterImage || '');
            setReportHeaderMarginMm(String(updated.reportHeaderMarginMm ?? 0));
            setReportFooterMarginMm(String(updated.reportFooterMarginMm ?? 0));
            setReportHeaderHeightMm(String(updated.reportHeaderHeightMm ?? 34));
            setReportFooterHeightMm(String(updated.reportFooterHeightMm ?? 24));
            setGstin(updated.gstin || '');
            setBrandingSnapshot({
                reportHeaderImage: updated.reportHeaderImage || '',
                reportFooterImage: updated.reportFooterImage || '',
                reportHeaderMarginMm: updated.reportHeaderMarginMm ?? 0,
                reportFooterMarginMm: updated.reportFooterMarginMm ?? 0,
                reportHeaderHeightMm: updated.reportHeaderHeightMm ?? 34,
                reportFooterHeightMm: updated.reportFooterHeightMm ?? 24,
                gstin: updated.gstin || '',
            });

            addNotification({ type: 'success', title: 'Report Branding Saved', message: 'Header/footer images and margins updated successfully.' });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save report branding settings';
            addNotification({ type: 'error', title: 'Save Failed', message, persist: true });
        } finally {
            setIsBrandingSaving(false);
        }
    };

    const handleDoctorSignatureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            if (file.size > MAX_BANNER_FILE_SIZE_BYTES) {
                throw new Error('Signature image size must be 2 MB or less.');
            }

            const dataUrl = await normalizeSignatureImage(file);
            const blob = dataUrlToBlob(dataUrl);
            const uploadRes = await uploadFile(new File([blob], 'signature.jpg', { type: 'image/jpeg' }));
            setSelectedDoctorSignatureImage(uploadRes.url);
            addNotification({ type: 'success', title: 'Signature Ready', message: 'Signature processed and uploaded.' });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to upload doctor signature image';
            addNotification({ type: 'error', title: 'Signature Upload Failed', message, persist: true });
        }
    };

    const handleSaveDoctorSignature = async () => {
        if (!selectedDoctorUserId) {
            addNotification({ type: 'error', title: 'No Doctor Selected', message: 'Select a doctor before saving signature.' });
            return;
        }

        try {
            setIsDoctorSignatureSaving(true);
            const updatedUser = await updateUser(Number(selectedDoctorUserId), {
                practitionerSignatureImage: selectedDoctorSignatureImage || '',
            });

            setDoctorUsers((previousDoctors) =>
                previousDoctors.map((doctor) =>
                    doctor.id === updatedUser.id
                        ? { ...doctor, practitionerSignatureImage: updatedUser.practitionerSignatureImage || '' }
                        : doctor
                )
            );

            await fetchDoctorUsers();
            setSelectedDoctorUserId(String(updatedUser.id));

            addNotification({ type: 'success', title: 'Signature Saved', message: 'Doctor signature updated successfully.' });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save doctor signature';
            addNotification({ type: 'error', title: 'Save Failed', message, persist: true });
        } finally {
            setIsDoctorSignatureSaving(false);
        }
    };

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
            const matchedAnalyte = analytes.find((candidate) => candidate.id === analyteData.analyteId);
            const analyteLabel = matchedAnalyte?.name || `ID ${analyteData.analyteId}`;
            addNotification({ type: 'success', title: 'Analyte Saved', message: `Analyte ${analyteLabel} has been saved.` });
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
            setOrgTests(prev => prev.map(test =>
                test.testId === testId ? { ...test, analyteIds } : test
            ));
            setAssigningTest(prev => prev && prev.testId === testId ? { ...prev, analyteIds } : prev);
            addNotification({ type: 'success', title: 'Analytes Assigned', message: 'Analytes have been assigned to the test.' });
            setIsAssignModalOpen(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred';
            addNotification({ type: 'error', title: 'Failed to Assign Analytes', message, persist: true });
        }
    };

    const handleToggleTestSelection = (testId: number) => {
        setSelectedTestIds(prev => {
            const next = new Set(prev);
            if (next.has(testId)) {
                next.delete(testId);
            } else {
                next.add(testId);
            }
            return next;
        });
    };

    const handleToggleSelectAll = () => {
        if (selectedTestIds.size === orgTests.length) {
            setSelectedTestIds(new Set());
            return;
        }
        setSelectedTestIds(new Set(orgTests.map(test => test.testId)));
    };

    const handleBulkPriceUpdate = async () => {
        if (!organizationId) return;

        const parsedPrice = Number(bulkPrice);
        if (selectedTestIds.size === 0) {
            addNotification({ type: 'error', title: 'No Tests Selected', message: 'Select at least one test to apply bulk pricing.' });
            return;
        }
        if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
            addNotification({ type: 'error', title: 'Invalid Price', message: 'Enter a valid non-negative price for bulk update.' });
            return;
        }

        try {
            await bulkUpdateOrganizationTestPrices(organizationId, Array.from(selectedTestIds), parsedPrice);
            addNotification({
                type: 'success',
                title: 'Bulk Price Updated',
                message: `Updated ${selectedTestIds.size} selected test(s) to ₹${parsedPrice.toFixed(2)}.`
            });
            setSelectedTestIds(new Set());
            setBulkPrice('');
            fetchData();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred';
            addNotification({ type: 'error', title: 'Failed Bulk Update', message, persist: true });
        }
    };

    if (isLoading) {
        return <div className="p-8">Loading lab management data...</div>;
    }

    const buttonClass = "px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500";
    const thClass = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase";
    const tdClass = "px-4 py-4 whitespace-nowrap text-gray-500";

    const toNonNegativeNumber = (value: string, fallback: number) => {
        const parsed = Number(value);
        if (Number.isNaN(parsed) || parsed < 0) {
            return fallback;
        }
        return parsed;
    };

    const previewHeaderHeightMm = toNonNegativeNumber(reportHeaderHeightMm, 34);
    const previewFooterHeightMm = toNonNegativeNumber(reportFooterHeightMm, 24);
    const previewTopMarginMm = toNonNegativeNumber(reportHeaderMarginMm, 0);
    const previewBottomMarginMm = toNonNegativeNumber(reportFooterMarginMm, 0);

    const a4WidthMm = 210;
    const a4HeightMm = 297;
    const previewScale = 1.25; // px per mm
    const previewWidthPx = Math.round(a4WidthMm * previewScale);
    const previewHeightPx = Math.round(a4HeightMm * previewScale);

    const toPx = (mm: number) => Math.round(mm * previewScale);
    const previewHeaderPx = toPx(previewHeaderHeightMm);
    const previewFooterPx = toPx(previewFooterHeightMm);
    const previewTopMarginPx = toPx(previewTopMarginMm);
    const previewBottomMarginPx = toPx(previewBottomMarginMm);
    const normalizedGstin = sanitizeGstinInput(gstin);
    const gstinValidationMessage = getGstinValidationMessage(normalizedGstin);
    const isGstinValid = gstinValidationMessage.length === 0;
    const hasUnsavedBrandingChanges = brandingSnapshot === null || (
        reportHeaderImage !== brandingSnapshot.reportHeaderImage ||
        reportFooterImage !== brandingSnapshot.reportFooterImage ||
        previewTopMarginMm !== brandingSnapshot.reportHeaderMarginMm ||
        previewBottomMarginMm !== brandingSnapshot.reportFooterMarginMm ||
        previewHeaderHeightMm !== brandingSnapshot.reportHeaderHeightMm ||
        previewFooterHeightMm !== brandingSnapshot.reportFooterHeightMm ||
        normalizedGstin !== sanitizeGstinInput(brandingSnapshot.gstin)
    );

    return (
        <div className="container mx-auto px-4 py-6 space-y-8">
            <div className="bg-white p-8 rounded-xl shadow-lg">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Doctor Signature Management</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Upload and manage doctor signatures used on approved diagnostic reports.
                    </p>
                    {!isAdminUser && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-3 inline-block">
                            View-only mode: only Admin can upload or update doctor signatures.
                        </p>
                    )}
                </div>

                {doctorUsers.length === 0 ? (
                    <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded px-4 py-3">
                        No doctor/pathologist/radiologist users found in this organization.
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Select Doctor</label>
                                <select
                                    value={selectedDoctorUserId}
                                    onChange={(e) => setSelectedDoctorUserId(e.target.value)}
                                    disabled={!isAdminUser}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                                >
                                    {doctorUsers.map((doctor) => {
                                        const doctorName = `${doctor.practitionerFirstName || ''} ${doctor.practitionerLastName || ''}`.trim() || doctor.username;
                                        return (
                                            <option key={doctor.id} value={doctor.id}>
                                                {doctorName} ({doctor.roles.join(', ')})
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Upload Signature</label>
                                {isAdminUser && (
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleDoctorSignatureUpload}
                                        className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"
                                    />
                                )}
                                <p className="text-[11px] text-gray-500 mt-1">Recommended transparent PNG. Max size 2MB.</p>
                            </div>
                        </div>

                        <div className="mt-4">
                            {selectedDoctorSignatureImage ? (
                                <div className="inline-block border border-gray-200 rounded-lg px-4 py-3 bg-gray-50">
                                    <p className="text-xs font-semibold text-gray-700 mb-2">Signature Preview</p>
                                    <img src={selectedDoctorSignatureImage} alt="Doctor signature preview" className="max-h-20 object-contain" />
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No signature uploaded for selected doctor.</p>
                            )}
                        </div>

                        <div className="mt-4 flex justify-end">
                            {isAdminUser ? (
                                <button
                                    onClick={handleSaveDoctorSignature}
                                    disabled={isDoctorSignatureSaving || !selectedDoctorUserId}
                                    className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                                >
                                    {isDoctorSignatureSaving ? 'Saving...' : 'Save Doctor Signature'}
                                </button>
                            ) : (
                                <div className="text-xs text-gray-600 bg-gray-100 border border-gray-200 rounded px-3 py-2">
                                    Doctor signatures are managed by Admin users.
                                </div>
                            )}
                        </div>

                        <div className="mt-6 overflow-x-auto border border-gray-200 rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className={thClass}>Doctor</th>
                                        <th className={thClass}>Role(s)</th>
                                        <th className={thClass}>Saved Signature</th>
                                        <th className={thClass}>Updated</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {doctorUsers.map((doctor) => {
                                        const doctorName = `${doctor.practitionerFirstName || ''} ${doctor.practitionerLastName || ''}`.trim() || doctor.username;
                                        return (
                                            <tr key={`doctor-signature-${doctor.id}`}>
                                                <td className={tdClass}>{doctorName}</td>
                                                <td className={tdClass}>{doctor.roles.join(', ')}</td>
                                                <td className={tdClass}>
                                                    {doctor.practitionerSignatureImage ? (
                                                        <img
                                                            src={doctor.practitionerSignatureImage}
                                                            alt={`${doctorName} signature`}
                                                            className="h-12 max-w-[200px] object-contain border border-gray-200 rounded bg-white"
                                                        />
                                                    ) : (
                                                        <span className="text-xs text-gray-500">Not uploaded</span>
                                                    )}
                                                </td>
                                                <td className={tdClass}>{doctor.updatedAt ? new Date(doctor.updatedAt).toLocaleString() : '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Report Header/Footer Branding</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Upload organization-specific header/footer images for reports with header. For reports without header, define top/bottom margins (mm) so content stays within printable area.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        Keep it simple: upload ready banner images and set heights. The preview below shows exactly what will be saved.
                    </p>
                    {!isAdminUser && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-3 inline-block">
                            View-only mode: only Admin can upload or modify header/footer branding.
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-700">Header Image</label>
                        {isAdminUser && (
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleHeaderImageUpload}
                                className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"
                            />
                        )}
                        {reportHeaderImage && (
                            <img src={reportHeaderImage} alt="Header preview" className="w-full max-h-32 object-contain border rounded-md p-2 bg-gray-50" />
                        )}
                        {isAdminUser && reportHeaderImage && (
                            <button
                                onClick={() => setReportHeaderImage('')}
                                className="text-xs text-red-600 hover:text-red-700"
                            >
                                Remove header image
                            </button>
                        )}
                        <p className="text-[11px] text-gray-500">
                            Validation: max 2MB, minimum 1200x180px, recommended 2200x360px, wide aspect ratio.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-700">Footer Image</label>
                        {isAdminUser && (
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFooterImageUpload}
                                className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"
                            />
                        )}
                        {reportFooterImage && (
                            <img src={reportFooterImage} alt="Footer preview" className="w-full max-h-32 object-contain border rounded-md p-2 bg-gray-50" />
                        )}
                        {isAdminUser && reportFooterImage && (
                            <button
                                onClick={() => setReportFooterImage('')}
                                className="text-xs text-red-600 hover:text-red-700"
                            >
                                Remove footer image
                            </button>
                        )}
                        <p className="text-[11px] text-gray-500">
                            Validation: max 2MB, minimum 1200x130px, recommended 2200x260px, wide aspect ratio.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Header Margin (mm) for report without header</label>
                        <input
                            type="number"
                            min={0}
                            value={reportHeaderMarginMm}
                            onChange={(e) => setReportHeaderMarginMm(e.target.value)}
                            disabled={!isAdminUser}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Footer Margin (mm) for report without header</label>
                        <input
                            type="number"
                            min={0}
                            value={reportFooterMarginMm}
                            onChange={(e) => setReportFooterMarginMm(e.target.value)}
                            disabled={!isAdminUser}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Header Height (mm) for report with header</label>
                        <input
                            type="number"
                            min={0}
                            value={reportHeaderHeightMm}
                            onChange={(e) => setReportHeaderHeightMm(e.target.value)}
                            disabled={!isAdminUser}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Footer Height (mm) for report with header</label>
                        <input
                            type="number"
                            min={0}
                            value={reportFooterHeightMm}
                            onChange={(e) => setReportFooterHeightMm(e.target.value)}
                            disabled={!isAdminUser}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">GSTIN (for Billing Invoice)</label>
                        <input
                            type="text"
                            value={gstin}
                            onChange={(e) => setGstin(sanitizeGstinInput(e.target.value))}
                            disabled={!isAdminUser}
                            maxLength={15}
                            placeholder="27ABCDE1234F1Z5"
                            className={`w-full px-3 py-2 border rounded-md ${!isGstinValid ? 'border-red-400 bg-red-50 focus:outline-none focus:ring-1 focus:ring-red-400' : 'border-gray-300'}`}
                        />
                        <p className="text-[11px] text-gray-500 mt-1">Optional. Used on invoice print/PDF. Format: 15-char GSTIN (e.g., 27ABCDE1234F1Z5).</p>
                        {!isGstinValid && (
                            <p className="text-[11px] text-red-600 mt-1 font-medium">{gstinValidationMessage}</p>
                        )}
                    </div>
                </div>

                <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <h3 className="text-sm font-semibold text-gray-800 mb-1">Live A4 Ruler Preview</h3>
                    <p className="text-xs text-gray-600 mb-3">
                        Adjust height/margin values above and watch this A4 preview update in real-time before saving.
                    </p>

                    <div className="flex flex-col xl:flex-row gap-6">
                        <div>
                            <div
                                className="relative border border-gray-300 bg-white shadow-sm overflow-hidden"
                                style={{ width: previewWidthPx, height: previewHeightPx }}
                            >
                                {/* Horizontal ruler */}
                                <div className="absolute top-0 left-0 right-0 h-5 bg-gray-100 border-b border-gray-300 z-20">
                                    {Array.from({ length: Math.floor(a4WidthMm / 10) + 1 }, (_, i) => {
                                        const mm = i * 10;
                                        const left = toPx(mm);
                                        return (
                                            <div key={`hr-${mm}`} className="absolute" style={{ left }}>
                                                <div className="w-px h-3 bg-gray-500" />
                                                {mm % 50 === 0 && (
                                                    <span className="absolute top-3 -translate-x-1/2 text-[9px] text-gray-600">{mm}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Vertical ruler */}
                                <div className="absolute top-0 left-0 bottom-0 w-5 bg-gray-100 border-r border-gray-300 z-20">
                                    {Array.from({ length: Math.floor(a4HeightMm / 10) + 1 }, (_, i) => {
                                        const mm = i * 10;
                                        const top = toPx(mm);
                                        return (
                                            <div key={`vr-${mm}`} className="absolute" style={{ top }}>
                                                <div className="h-px w-3 bg-gray-500" />
                                                {mm % 50 === 0 && (
                                                    <span className="absolute left-3 -translate-y-1/2 text-[9px] text-gray-600">{mm}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* A4 content area offset from rulers */}
                                <div className="absolute" style={{ left: 20, top: 20, width: previewWidthPx - 20, height: previewHeightPx - 20 }}>
                                    {/* Header band (with header mode) */}
                                    <div
                                        className="absolute left-0 right-0 bg-cyan-100/80 border-b border-cyan-300 overflow-hidden"
                                        style={{ top: 0, height: previewHeaderPx }}
                                    >
                                        {reportHeaderImage && (
                                            <img
                                                src={reportHeaderImage}
                                                alt="Header overlay preview"
                                                className="absolute inset-0 w-full h-full object-contain"
                                            />
                                        )}
                                        <span className="absolute right-2 top-1 text-[10px] font-semibold text-cyan-800">
                                            Header {previewHeaderHeightMm}mm
                                        </span>
                                    </div>

                                    {/* Footer band (with header mode) */}
                                    <div
                                        className="absolute left-0 right-0 bg-teal-100/80 border-t border-teal-300 overflow-hidden"
                                        style={{ bottom: 0, height: previewFooterPx }}
                                    >
                                        {reportFooterImage && (
                                            <img
                                                src={reportFooterImage}
                                                alt="Footer overlay preview"
                                                className="absolute inset-0 w-full h-full object-contain"
                                            />
                                        )}
                                        <span className="absolute right-2 bottom-1 text-[10px] font-semibold text-teal-800">
                                            Footer {previewFooterHeightMm}mm
                                        </span>
                                    </div>

                                    {/* Content zone (with header mode) */}
                                    <div
                                        className="absolute left-0 right-0 border-2 border-dashed border-amber-400 bg-amber-50/40"
                                        style={{ top: previewHeaderPx, bottom: previewFooterPx }}
                                    >
                                        <span className="absolute left-2 top-1 text-[10px] font-semibold text-amber-700">Content Zone (with header)</span>
                                    </div>

                                    {/* Content zone (without header mode) */}
                                    <div
                                        className="absolute left-3 right-3 border-2 border-dotted border-indigo-400"
                                        style={{ top: previewTopMarginPx, bottom: previewBottomMarginPx }}
                                    >
                                        <span className="absolute left-2 top-1 text-[10px] font-semibold text-indigo-700">
                                            Content Zone (without header)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="text-xs text-gray-700 space-y-2">
                            <p className="font-semibold text-gray-800">Preview legend</p>
                            <p><span className="inline-block w-3 h-3 mr-1 align-middle bg-cyan-100 border border-cyan-300" /> Header strip (with header)</p>
                            <p><span className="inline-block w-3 h-3 mr-1 align-middle bg-teal-100 border border-teal-300" /> Footer strip (with header)</p>
                            <p><span className="inline-block w-3 h-3 mr-1 align-middle bg-amber-50 border border-amber-400" /> Data area between header & footer</p>
                            <p><span className="inline-block w-3 h-3 mr-1 align-middle border-2 border-dotted border-indigo-400" /> Data area using top/bottom margins (without header)</p>
                            <div className="pt-2 border-t border-gray-200 mt-2 space-y-1">
                                <p>Current header height: <strong>{previewHeaderHeightMm}mm</strong></p>
                                <p>Current footer height: <strong>{previewFooterHeightMm}mm</strong></p>
                                <p>Top margin (without header): <strong>{previewTopMarginMm}mm</strong></p>
                                <p>Bottom margin (without header): <strong>{previewBottomMarginMm}mm</strong></p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    {isAdminUser ? (
                        <>
                            {hasUnsavedBrandingChanges && (
                                <div className="mr-4 self-center text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
                                    Preview is updated. Click Save Branding Settings to apply.
                                </div>
                            )}
                            <button
                                onClick={handleSaveReportBranding}
                                disabled={isBrandingSaving || !hasUnsavedBrandingChanges || !isGstinValid}
                                className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                            >
                                {isBrandingSaving ? 'Saving...' : 'Save Branding Settings'}
                            </button>
                        </>
                    ) : (
                        <div className="text-xs text-gray-600 bg-gray-100 border border-gray-200 rounded px-3 py-2">
                            Branding settings are managed by Admin users.
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Available Organization Tests</h2>
                    <button onClick={handleAddTest} className={buttonClass}>Add New Test</button>
                </div>
                <div className="mb-4 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="text-sm text-gray-600">
                        {selectedTestIds.size} selected for bulk price update
                    </div>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={bulkPrice}
                        onChange={(e) => setBulkPrice(e.target.value)}
                        placeholder="Bulk price (e.g. 299.00)"
                        className="px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <button
                        onClick={handleBulkPriceUpdate}
                        className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                        disabled={selectedTestIds.size === 0 || !bulkPrice}
                    >
                        Apply to Selected
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className={thClass}>
                                    <input
                                        type="checkbox"
                                        checked={orgTests.length > 0 && selectedTestIds.size === orgTests.length}
                                        onChange={handleToggleSelectAll}
                                        aria-label="Select all tests"
                                    />
                                </th>
                                <th className={thClass}>Name</th>
                                <th className={thClass}>Local Code</th>
                                <th className={thClass}>Price</th>
                                <th className={thClass}>Status</th>
                                <th className={thClass}>Analytes</th>
                                <th className={thClass}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {orgTests.map(test => (
                                <tr key={test.testId}>
                                    <td className={tdClass}>
                                        <input
                                            type="checkbox"
                                            checked={selectedTestIds.has(test.testId)}
                                            onChange={() => handleToggleTestSelection(test.testId)}
                                            aria-label={`Select ${test.testName}`}
                                        />
                                    </td>
                                    <td className={`font-medium text-gray-900 ${tdClass}`}>{test.testName}</td>
                                    <td className={tdClass}>{test.testLocalCode}</td>
                                    <td className={tdClass}>{test.price !== null ? `₹${test.price.toFixed(2)}` : '—'}</td>
                                    <td className={tdClass}>{test.isEnabled ? 'Enabled' : 'Disabled'}</td>
                                    <td className={tdClass}>{test.analyteIds?.length ?? 0}</td>
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
                availableTests={masterTests}
            />
            <AnalyteFormModal
                isOpen={isAnalyteModalOpen}
                onClose={() => setIsAnalyteModalOpen(false)}
                onSave={handleSaveAnalyte}
                analyte={editingAnalyte}
                analyteOptions={
                    editingAnalyte
                        ? analytes
                        : analytes
                            .sort((a, b) => a.name.localeCompare(b.name))
                }
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
