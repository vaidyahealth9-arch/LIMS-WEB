
import type { Test, OrganizationTest, Unit, SpecimenType, TestAnalyte, ReferenceRange, TestInterpretationRule, Organization, User, UserCreateRequest, UserUpdateRequest, Patient, Encounter, ServiceRequest, Specimen, Observation, Bill, PatientRegistrationResponse, BillableDetails, ServiceRequestAnalyte, GroupedAnalyte, InterpretationRule, Analyte, TestCatalogImportResponse, DashboardData, MasterTest, ReportApprovalStatus } from '../types';

// Use relative /api path in production so requests go through nginx proxy
const API_BASE_URL = '/api';
const DEFAULT_REQUEST_TIMEOUT_MS = 30000;

type ApiErrorPayload = {
        message?: string;
        error?: string;
    fieldErrors?: Record<string, string>;
};

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS) => {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

        try {
                return await fetch(url, {
                        ...options,
                        signal: controller.signal,
                });
        } finally {
                window.clearTimeout(timeoutId);
        }
};

export const login = async (username: string, password: string) => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export const signup = async (payload: {
    practitionerFirstName: string;
    practitionerLastName?: string;
    practitionerGender?: string | null;
    practitionerDateOfBirth?: string | null;
    username: string;
    password: string;
    roles: string[];
    organizationId: number;
    isActive?: boolean;
}) => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
};

export const refreshToken = async () => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    });

    if (!response.ok) {
        // If refresh fails, logout the user bas
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('organizationId');
        window.location.href = '/'; // Or your login page
        throw new Error('Session expired. Please log in again.');
    }

    const { token } = await response.json();
    localStorage.setItem('token', token);
    return token;
};

// Helper to get authorization headers
const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('token');
    if (token) {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }
    return {
        'Content-Type': 'application/json',
    };
};

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

const fetchApi = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
    try {
        const headers = new Headers(getAuthHeaders());
        if (options.headers) {
            new Headers(options.headers).forEach((value, key) => headers.set(key, value));
        }

        const config = {
            ...options,
            headers,
        };

        let response = await fetchWithTimeout(url, config);

        if (response.status === 401) {
            if (!isRefreshing) {
                isRefreshing = true;
                refreshPromise = refreshToken().finally(() => {
                    isRefreshing = false;
                });
            }

            try {
                const newToken = await refreshPromise;
                if (newToken) {
                    const newHeaders = new Headers(config.headers);
                    newHeaders.set('Authorization', `Bearer ${newToken}`);

                    const newConfig = {
                        ...config,
                        headers: newHeaders,
                    };
                    response = await fetchWithTimeout(url, newConfig);
                }
            } catch (error) {
                throw error;
            }
        }

        if (!response.ok) {
            const errorText = await response.text();
            let errorData: ApiErrorPayload = { message: 'An unknown error occurred' };

            if (errorText && errorText.trim()) {
                try {
                    errorData = JSON.parse(errorText) as ApiErrorPayload;
                } catch {
                    errorData = { message: errorText };
                }
            }

            const message = errorData.message || errorData.error || `HTTP error! status: ${response.status}`;
            const fieldErrors = errorData.fieldErrors && Object.keys(errorData.fieldErrors).length > 0
                ? Object.entries(errorData.fieldErrors)
                        .map(([field, msg]) => `${field}: ${msg}`)
                        .join(', ')
                : '';

            throw new Error(fieldErrors ? `${message} (${fieldErrors})` : message);
        }

        if (response.status === 204) {
            return null as T;
        }

        const responseText = await response.text();
        if (!responseText || !responseText.trim()) {
            return null as T;
        }

        const contentType = (response.headers.get('content-type') || '').toLowerCase();
        if (!contentType.includes('application/json')) {
            return responseText as T;
        }

        return JSON.parse(responseText) as T;
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new Error('Request timeout. Please try again.');
        }
        if (error instanceof TypeError) {
            throw new Error('Network error. Please check your internet connection and try again.');
        }
        throw error;
    }
};

// --- Master Data ---

export const addUnit = (data: any): Promise<Unit> => {
    return fetchApi<Unit>(`${API_BASE_URL}/units`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const addSpecimenType = (data: any): Promise<SpecimenType> => {
    return fetchApi<SpecimenType>(`${API_BASE_URL}/specimen-types`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const addTestAnalyte = (data: any): Promise<TestAnalyte> => {
    return fetchApi<TestAnalyte>(`${API_BASE_URL}/test-analytes`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const addReferenceRange = (data: any): Promise<ReferenceRange> => {
    return fetchApi<ReferenceRange>(`${API_BASE_URL}/reference-ranges`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const addTestInterpretationRule = (data: any): Promise<TestInterpretationRule> => {
    return fetchApi<TestInterpretationRule>(`${API_BASE_URL}/test-interpretation-rules`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};
 
export const getAnalytesForOrganization = (organizationId: string): Promise<Analyte[]> => {
    return fetchApi<Analyte[]>(`${API_BASE_URL}/organizations/${organizationId}/analytes`);
};

export const addOrUpdateAnalyteForOrganization = (organizationId: string, analyteData: any): Promise<void> => {
    return fetchApi<void>(`${API_BASE_URL}/organizations/${organizationId}/analytes`, {
        method: 'POST',
        body: JSON.stringify(analyteData),
    });
};

export const createOrUpdateOrganizationTest = (organizationId: string, testData: any): Promise<OrganizationTest> => {
    return fetchApi<OrganizationTest>(`${API_BASE_URL}/organizations/${organizationId}/tests`, {
        method: 'POST',
        body: JSON.stringify(testData),
    });
};

export const bulkUpdateOrganizationTestPrices = (
    organizationId: string,
    testIds: number[],
    price: number
): Promise<OrganizationTest[]> => {
    return fetchApi<OrganizationTest[]>(`${API_BASE_URL}/organizations/${organizationId}/tests/prices`, {
        method: 'PUT',
        body: JSON.stringify({ testIds, price }),
    });
};

export const setAnalytesForOrganizationTest = (organizationId: string, testId: string, analyteIds: string[]): Promise<void> => {
    return fetchApi<void>(`${API_BASE_URL}/organization-test-analytes/organization/${organizationId}/test/${testId}`, {
        method: 'PUT',
        body: JSON.stringify({ analyteIds }),
    });
};

export const searchServiceRequests = (
  orgId: string,
  startDate: string,
  endDate: string,
  query: string,
  testIds: string[],
  page: number,
    size: number,
    includeClosed: boolean = false
): Promise<Paginated<ServiceRequest>> => {
  const params = new URLSearchParams({
    orgId,
    startDate,
    endDate,
    page: page.toString(),
    size: size.toString(),
  });
    if (includeClosed) {
        params.append('includeClosed', 'true');
    }
  if (query) {
    params.append('query', query);
  }
  if (testIds && testIds.length > 0) {
    testIds.forEach(id => params.append('testIds', id));
  }

  return fetchApi<Paginated<ServiceRequest>>(`${API_BASE_URL}/service-requests/search?${params.toString()}`);
};
// --- Organizations (Labs) ---

export const addOrganization = (data: any): Promise<Organization> => {
    return fetchApi<Organization>(`${API_BASE_URL}/organizations`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const getAllOrganizations = (): Promise<Organization[]> => {
    return fetchApi<Organization[]>(`${API_BASE_URL}/organizations`);
};

export const getOrganizationById = (organizationId: string): Promise<Organization> => {
    return fetchApi<Organization>(`${API_BASE_URL}/organizations/${organizationId}`);
};

export const updateOrganizationReportBranding = (
    organizationId: string,
    payload: {
        reportHeaderImage?: string;
        reportFooterImage?: string;
        reportHeaderMarginMm?: number;
        reportFooterMarginMm?: number;
        reportHeaderHeightMm?: number;
        reportFooterHeightMm?: number;
        gstin?: string;
    }
): Promise<Organization> => {
    return fetchApi<Organization>(`${API_BASE_URL}/organizations/${organizationId}/report-branding`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
};

// --- Users (Practitioners) ---

export const addUser = (data: UserCreateRequest): Promise<User> => {
    return fetchApi<User>(`${API_BASE_URL}/users`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const getAllUsers = (): Promise<User[]> => {
    return fetchApi<User[]>(`${API_BASE_URL}/users`);
};

export const getUsersByOrganization = (organizationId: string): Promise<User[]> => {
    return fetchApi<User[]>(`${API_BASE_URL}/users/by-organization/${organizationId}`);
};

export const updateUser = (userId: number, data: UserUpdateRequest): Promise<User> => {
    return fetchApi<User>(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

export const toggleUserActiveStatus = (userId: number, isActive: boolean): Promise<User> => {
    return fetchApi<User>(`${API_BASE_URL}/users/${userId}/active?isActive=${isActive}`, {
        method: 'PATCH',
    });
};

export const deleteUser = (userId: number): Promise<void> => {
    return fetchApi<void>(`${API_BASE_URL}/users/${userId}`, {
        method: 'DELETE',
    }).catch((error) => {
        const message = error instanceof Error ? error.message.toLowerCase() : '';
        const shouldFallbackToPostDelete =
            message.includes("request method 'delete' is not supported") ||
            message.includes('method not allowed') ||
            message.includes('405');

        if (!shouldFallbackToPostDelete) {
            throw error;
        }

        return fetchApi<void>(`${API_BASE_URL}/users/${userId}/delete`, {
            method: 'POST',
        }).catch((postDeleteError) => {
            const postDeleteMessage = postDeleteError instanceof Error ? postDeleteError.message.toLowerCase() : '';
            const shouldFallbackToDeactivate =
                postDeleteMessage.includes('not found') ||
                postDeleteMessage.includes('no static resource') ||
                postDeleteMessage.includes('404');

            if (!shouldFallbackToDeactivate) {
                throw postDeleteError;
            }

            return fetchApi<void>(`${API_BASE_URL}/users/${userId}/active?isActive=false`, {
                method: 'PATCH',
            });
        });
    });
};

// --- Lab-Specific Test Catalogs ---

export const enableTestForLab = (organizationId: string, data: any): Promise<any> => {
    return fetchApi<any>(`${API_BASE_URL}/organizations/${organizationId}/tests`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const getEnabledTestsForLab = (organizationId: string): Promise<OrganizationTest[]> => {
    return fetchApi<OrganizationTest[]>(`${API_BASE_URL}/organizations/${organizationId}/tests/enabled`);
};

export const getAllOrganizationTestsForLab = (organizationId: string): Promise<OrganizationTest[]> => {
    return fetchApi<OrganizationTest[]>(`${API_BASE_URL}/organizations/${organizationId}/tests`);
};

export const getAllMasterTests = (): Promise<MasterTest[]> => {
    return fetchApi<MasterTest[]>(`${API_BASE_URL}/tests`);
};

export const importTestCatalogFromFile = async (file: File, dryRun: boolean): Promise<TestCatalogImportResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetchWithTimeout(`${API_BASE_URL}/tests/import/file?dryRun=${dryRun}`, {
        method: 'POST',
        headers,
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
};

export const importTestCatalogFromJson = (
    tests: Array<Record<string, unknown>>,
    dryRun: boolean
): Promise<TestCatalogImportResponse> => {
    return fetchApi<TestCatalogImportResponse>(`${API_BASE_URL}/tests/import?dryRun=${dryRun}`, {
        method: 'POST',
        body: JSON.stringify({ tests }),
    });
};

// --- Patients ---

export const registerPatient = (data: any): Promise<PatientRegistrationResponse> => {
    return fetchApi<PatientRegistrationResponse>(`${API_BASE_URL}/patients/register`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const exportPatientData = async (): Promise<Blob> => {
    const response = await fetch(`${API_BASE_URL}/patients/data/export`, {
        method: 'GET',
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.blob();
};

export const getDashboardData = (days: 7 | 30 | 90 = 7): Promise<DashboardData> => {
    return fetchApi<DashboardData>(`${API_BASE_URL}/dashboard?days=${days}`);
};

export const uploadFile = async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/storage/upload`, {
        method: 'POST',
        headers,
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.message || `Upload failed (Status ${response.status})`);
        } catch {
            throw new Error(errorText || `Upload failed (Status ${response.status})`);
        }
    }

    return response.json();
};


export const getPatientsByOrganization = (organizationId: string): Promise<PatientRegistrationResponse[]> => {
    return fetchApi<PatientRegistrationResponse[]>(`${API_BASE_URL}/patients/by-organization/${organizationId}`);
};

export const fetchPhrUser = (mobile: string, relationship?: string): Promise<any> => {
    const params = new URLSearchParams({ mobile });
    if (relationship && relationship !== 'none') {
        params.append('relationship', relationship);
    }
    return fetchApi<any>(`${API_BASE_URL}/patients/phr-lookup?${params.toString()}`);
};

export interface Paginated<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
}

export const searchPatients = (organizationId: string, query: string, page: number, size: number): Promise<Paginated<PatientRegistrationResponse>> => {
    return fetchApi<Paginated<PatientRegistrationResponse>>(`${API_BASE_URL}/patients/by-organization/${organizationId}/search?query=${query}&page=${page}&size=${size}`);
};

export const searchEncounters = (organizationId: string, startDate: string, endDate: string, query: string, tests: string[], page: number, size: number): Promise<Paginated<Encounter>> => {
    return searchEncountersWithFilters(organizationId, startDate, endDate, query, tests, page, size, {});
};

export const searchEncountersWithFilters = (
    organizationId: string,
    startDate: string,
    endDate: string,
    query: string,
    tests: string[],
    page: number,
    size: number,
    filters: {
        department?: string;
        sampleCollector?: string;
        referringDoctor?: string;
        hospital?: string;
    }
): Promise<Paginated<Encounter>> => {
    const params = new URLSearchParams({
        organizationId,
        startDate,
        endDate,
        query,
        page: String(page),
        size: String(size),
    });

    tests.forEach((testId) => params.append('tests', testId));

    if (filters.department?.trim()) {
        params.append('department', filters.department.trim());
    }
    if (filters.sampleCollector?.trim()) {
        params.append('sampleCollector', filters.sampleCollector.trim());
    }
    if (filters.referringDoctor?.trim()) {
        params.append('referringDoctor', filters.referringDoctor.trim());
    }
    if (filters.hospital?.trim()) {
        params.append('hospital', filters.hospital.trim());
    }

    return fetchApi<Paginated<Encounter>>(`${API_BASE_URL}/encounters/search?${params.toString()}`);
};

// --- Encounters & Service Requests ---

export const createEncounter = (data: any): Promise<Encounter> => {
    return fetchApi<Encounter>(`${API_BASE_URL}/encounters`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const downloadReport = async (
    serviceRequestId: string,
    withHeader: boolean = true,
    reportType: 'regular' | 'smart' = 'regular'
): Promise<Blob> => {
    const url = `${API_BASE_URL}/reports/pdf/${serviceRequestId}?withHeader=${withHeader}&reportType=${encodeURIComponent(reportType)}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        try {
            const parsed = errorText ? JSON.parse(errorText) : null;
            const message = parsed?.message || parsed?.error || `HTTP error! status: ${response.status}`;
            throw new Error(message);
        } catch {
            throw new Error(errorText || `HTTP error! status: ${response.status}`);
        }
    }

    return response.blob();
};

export const getReportPdfUrl = (
    serviceRequestId: string,
    withHeader: boolean = true,
    reportType: 'regular' | 'smart' = 'regular'
): string => {
    return `${API_BASE_URL}/reports/pdf/${encodeURIComponent(serviceRequestId)}?withHeader=${withHeader}&reportType=${encodeURIComponent(reportType)}`;
};

export const downloadReportByLocalValue = async (
    localReportValue: string,
    withHeader: boolean = true,
    reportType: 'regular' | 'smart' = 'regular'
): Promise<Blob> => {
    const url = `${API_BASE_URL}/reports/pdf/by-value/${encodeURIComponent(localReportValue)}?withHeader=${withHeader}&reportType=${encodeURIComponent(reportType)}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        try {
            const parsed = errorText ? JSON.parse(errorText) : null;
            const message = parsed?.message || parsed?.error || `HTTP error! status: ${response.status}`;
            throw new Error(message);
        } catch {
            throw new Error(errorText || `HTTP error! status: ${response.status}`);
        }
    }

    return response.blob();
};

export const getReportApprovalStatus = (serviceRequestId: string): Promise<ReportApprovalStatus> => {
    return fetchApi<ReportApprovalStatus>(`${API_BASE_URL}/reports/approval-status/${serviceRequestId}`);
};

export const createServiceRequest = (data: any): Promise<ServiceRequest> => {
    return fetchApi<ServiceRequest>(`${API_BASE_URL}/service-requests`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const updateServiceRequest = (serviceRequestId: string | number, data: any): Promise<ServiceRequest> => {
    return fetchApi<ServiceRequest>(`${API_BASE_URL}/service-requests/${serviceRequestId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

export const getEncounterById = (encounterId: string): Promise<Encounter> => {
    return fetchApi<Encounter>(`${API_BASE_URL}/encounters/${encounterId}/details`);
};

export const updateEncounterStatus = (encounterId: string, data: any): Promise<Encounter> => {
    return fetchApi<Encounter>(`${API_BASE_URL}/encounters/${encounterId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

export const updateEncounterWorkflowStatus = (encounterId: string, status: string): Promise<Encounter> => {
    return fetchApi<Encounter>(`${API_BASE_URL}/encounters/${encounterId}/workflow-status?status=${encodeURIComponent(status)}`, {
        method: 'PUT'
    });
};

export const getServiceRequestById = (serviceRequestId: string): Promise<ServiceRequest> => {
    return fetchApi<ServiceRequest>(`${API_BASE_URL}/service-requests/${serviceRequestId}`);
};

export const getServiceRequestAnalytes = (serviceRequestId: number): Promise<GroupedAnalyte[]> => {
    return fetchApi<GroupedAnalyte[]>(`${API_BASE_URL}/service-requests/${serviceRequestId}/analytes`);
};

export const updateServiceRequestStatus = (serviceRequestId: string, data: any): Promise<ServiceRequest> => {
    return fetchApi<ServiceRequest>(`${API_BASE_URL}/service-requests/${serviceRequestId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

// --- Observations (Test Results) ---

export const createObservationForServiceRequest = (serviceRequestId: number, observationData: any): Promise<Observation> => {
    return fetchApi<Observation>(`${API_BASE_URL}/service-requests/${serviceRequestId}/observations`, {
        method: 'POST',
        body: JSON.stringify(observationData),
    });
};

export const getObservationsForServiceRequest = (serviceRequestId: string): Promise<Observation[]> => {
    return fetchApi<Observation[]>(`${API_BASE_URL}/service-requests/${serviceRequestId}/observations`);
};

export const getHistoricalObservationSeriesForServiceRequest = (
    serviceRequestId: string,
    limitPerAnalyte: number = 6
): Promise<Record<string, Array<{ value: number; effectiveDateTime: string; observationId: number }>>> => {
    return fetchApi<Record<string, Array<{ value: number; effectiveDateTime: string; observationId: number }>>>(
        `${API_BASE_URL}/service-requests/${serviceRequestId}/observations/history?limitPerAnalyte=${encodeURIComponent(limitPerAnalyte)}`
    );
};

export const addObservation = (data: any): Promise<Observation> => {
    return fetchApi<Observation>(`${API_BASE_URL}/observations`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const sendObservationsForVerification = (data: any): Promise<any> => {
    return fetchApi<any>(`${API_BASE_URL}/observations/send-for-verification`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const approveObservations = (data: any): Promise<any> => {
    return fetchApi<any>(`${API_BASE_URL}/observations/approve`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

const normalizeNumericId = (id: string | number): number => {
    if (typeof id === 'number') {
        return id;
    }

    const match = String(id).match(/(\d+)$/);
    if (!match) {
        throw new Error(`Invalid ID format: ${id}`);
    }

    return Number(match[1]);
};

export const updateObservation = (observationId: string | number, observationData: any): Promise<Observation> => {
    const normalizedId = normalizeNumericId(observationId);
    return fetchApi<Observation>(`${API_BASE_URL}/observations/${normalizedId}`, {
        method: 'PUT',
        body: JSON.stringify(observationData),
    });
};

// --- Specimen ---

export const createSpecimen = (data: any): Promise<Specimen> => {
    return fetchApi<Specimen>(`${API_BASE_URL}/specimens`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const getSpecimensByEncounter = (encounterId: string): Promise<Specimen[]> => {
    return fetchApi<Specimen[]>(`${API_BASE_URL}/specimens/by-encounter/${encounterId}`);
};

export const getSpecimensByServiceRequest = (serviceRequestId: string | number): Promise<Specimen[]> => {
    return fetchApi<Specimen[]>(`${API_BASE_URL}/specimens/by-service-request/${serviceRequestId}`);
};

export const scanSpecimenByBarcode = (barcodeValue: string): Promise<Specimen> => {
    const encodedValue = encodeURIComponent(barcodeValue);
    return fetchApi<Specimen>(`${API_BASE_URL}/specimens/scan?barcodeValue=${encodedValue}`);
};

export const regenerateSpecimenBarcode = (
    specimenId: string | number,
    payload: { reason: string; force?: boolean }
): Promise<Specimen> => {
    return fetchApi<Specimen>(`${API_BASE_URL}/specimens/${specimenId}/barcode/regenerate`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
};

export const getSpecimenById = (specimenId: string): Promise<Specimen> => {
    return fetchApi<Specimen>(`${API_BASE_URL}/specimens/${specimenId}`);
};

export const updateSpecimenStatus = (specimenId: string, data: any): Promise<Specimen> => {
    return fetchApi<Specimen>(`${API_BASE_URL}/specimens/${specimenId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

// --- Billing ---

const toNumberSafe = (value: unknown, fallback = 0): number => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
};

const normalizeBill = (rawBill: any): Bill => {
    const testItemsFromServiceRequests = Array.isArray(rawBill?.serviceRequests)
        ? rawBill.serviceRequests.flatMap((sr: any) =>
            Array.isArray(sr?.requestedTests)
                ? sr.requestedTests
                    .filter((t: any) => typeof t?.testName === 'string' && t.testName.trim().length > 0)
                    .map((t: any) => ({
                        testName: t.testName,
                        price: toNumberSafe(t?.price),
                    }))
                : []
        )
        : [];

    const testsFromServiceRequests = Array.isArray(rawBill?.serviceRequests)
        ? rawBill.serviceRequests.flatMap((sr: any) =>
            Array.isArray(sr?.requestedTests)
                ? sr.requestedTests
                    .map((t: any) => t?.testName)
                    .filter((name: unknown): name is string => typeof name === 'string' && name.trim().length > 0)
                : []
        )
        : [];

    const normalizedTests: string[] = Array.isArray(rawBill?.tests)
        ? rawBill.tests
        : Array.isArray(rawBill?.testItems)
            ? rawBill.testItems
                .map((item: any) => item?.testName)
                .filter((name: unknown): name is string => typeof name === 'string' && name.trim().length > 0)
            : testsFromServiceRequests;

    const normalizedTestItems = Array.isArray(rawBill?.testItems)
        ? rawBill.testItems.map((item: any) => ({
            testName: item?.testName ?? 'Unnamed Test',
            price: toNumberSafe(item?.price),
        }))
        : testItemsFromServiceRequests.length > 0
            ? testItemsFromServiceRequests
            : normalizedTests.map((testName) => ({ testName, price: 0 }));

    const normalizedServiceRequestIds: number[] = Array.isArray(rawBill?.serviceRequestIds)
        ? rawBill.serviceRequestIds.map((id: unknown) => toNumberSafe(id)).filter((id: number) => id > 0)
        : Array.isArray(rawBill?.serviceRequests)
            ? rawBill.serviceRequests
                .map((sr: any) => toNumberSafe(sr?.serviceRequestId))
                .filter((id: number) => id > 0)
            : [];

    return {
        ...rawBill,
        billId: toNumberSafe(rawBill?.billId ?? rawBill?.id),
        encounterId: toNumberSafe(rawBill?.encounterId),
        organizationId: toNumberSafe(rawBill?.organizationId),
        invoiceNumber: rawBill?.invoiceNumber ?? '',
        invoiceDate: rawBill?.invoiceDate ?? new Date().toISOString(),
        patientName: rawBill?.patientName ?? '',
        patientMrn: rawBill?.patientMrn ?? '',
        localEncounterId: rawBill?.localEncounterId ?? rawBill?.encounterLocalValue ?? 'N/A',
        organizationName: rawBill?.organizationName,
        totalAmount: toNumberSafe(rawBill?.totalAmount),
        discountAmount: toNumberSafe(rawBill?.discountAmount),
        netAmount: toNumberSafe(rawBill?.netAmount),
        paidAmount: toNumberSafe(rawBill?.paidAmount),
        dueAmount: toNumberSafe(rawBill?.dueAmount),
        discountPercentage: toNumberSafe(rawBill?.discountPercentage),
        status: (rawBill?.status ?? 'DUE') as Bill['status'],
        paymentDate: rawBill?.paymentDate,
        serviceRequestIds: normalizedServiceRequestIds,
        tests: normalizedTests,
        testItems: normalizedTestItems,
        notes: rawBill?.notes,
        dueDate: rawBill?.dueDate,
    } as Bill;
};

export const createBill = (data: any): Promise<Bill> => {
    return fetchApi<any>(`${API_BASE_URL}/bills`, {
        method: 'POST',
        body: JSON.stringify(data),
    }).then(normalizeBill);
};

export const recordPayment = (billId: string, data: any): Promise<Bill> => {
    return fetchApi<any>(`${API_BASE_URL}/bills/${billId}/payment`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    }).then(normalizeBill);
};

export const syncBill = (encounterId: string | number): Promise<Bill> => {
    return fetchApi<any>(`${API_BASE_URL}/bills/sync/${encounterId}`, {
        method: 'PUT'
    }).then(normalizeBill);
};

export const getBillById = (billId: string): Promise<Bill> => {
    return fetchApi<any>(`${API_BASE_URL}/bills/${billId}`).then(normalizeBill);
};

export const getBillsByEncounter = (encounterId: string): Promise<Bill[]> => {
    return fetchApi<any[]>(`${API_BASE_URL}/bills/by-encounter/${encounterId}`).then((bills) =>
        (Array.isArray(bills) ? bills : []).map(normalizeBill)
    );
};

export const getBillsByOrganization = (organizationId: string, status: string): Promise<Bill[]> => {
    return fetchApi<any[]>(`${API_BASE_URL}/bills/by-organization/${organizationId}?status=${status}`).then((bills) =>
        (Array.isArray(bills) ? bills : []).map(normalizeBill)
    );
};

export const getBillableDetailsForEncounter = (encounterId: string): Promise<BillableDetails> => {
    return fetchApi<BillableDetails>(`${API_BASE_URL}/bills/encounter/${encounterId}/billable-details`);
};

export const searchBills = (
    organizationId: string,
    startDate: string,
    endDate: string,
    query: string,
    page: number,
    size: number
): Promise<Paginated<Bill>> => {
    const params = new URLSearchParams({
        organizationId,
        startDate,
        endDate,
        page: page.toString(),
        size: size.toString(),
    });
    if (query) {
        params.append('query', query);
    }
    return fetchApi<Paginated<any>>(`${API_BASE_URL}/bills/search?${params.toString()}`).then((pageData) => ({
        ...pageData,
        content: (Array.isArray(pageData?.content) ? pageData.content : []).map(normalizeBill),
    }));
};

export const getInterpretationRules = (organizationId: string, testId: string): Promise<InterpretationRule[]> => {
    return fetchApi<InterpretationRule[]>(`${API_BASE_URL}/interpretation-rules?organizationId=${organizationId}&testId=${testId}`);
};

export const createInterpretationRule = (data: Partial<InterpretationRule>): Promise<InterpretationRule> => {
    return fetchApi<InterpretationRule>(`${API_BASE_URL}/interpretation-rules`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const updateInterpretationRule = (ruleId: number, data: Partial<InterpretationRule>): Promise<InterpretationRule> => {
    return fetchApi<InterpretationRule>(`${API_BASE_URL}/interpretation-rules/${ruleId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};


