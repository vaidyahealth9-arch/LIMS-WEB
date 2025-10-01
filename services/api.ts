
import type { Test, OrganizationTest, Unit, SpecimenType, TestAnalyte, ReferenceRange, TestInterpretationRule, Organization, User, Patient, Encounter, ServiceRequest, Specimen, Observation, Bill, PatientRegistrationResponse } from '../types';

const API_BASE_URL = '/api';

export const login = async (username, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
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

export const refreshToken = async () => {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    });

    if (!response.ok) {
        // If refresh fails, logout the user
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
const getAuthHeaders = () => {
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
    const config = {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...options.headers,
        },
    };

    let response = await fetch(url, config);

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
                 const newConfig = {
                    ...config,
                    headers: {
                        ...config.headers,
                        'Authorization': `Bearer ${newToken}`,
                    },
                };
                response = await fetch(url, newConfig);
            }
        } catch (error) {
            // The refreshToken function already handles logout on failure.
            // We just need to rethrow the error to the caller.
            throw error;
        }
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    if (response.status === 204) {
        return null as T;
    }

    return response.json();
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

export const addTest = (data: any): Promise<Test> => {
    return fetchApi<Test>(`${API_BASE_URL}/tests`, {
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

export const getAllTests = (): Promise<Test[]> => {
    return fetchApi<Test[]>(`${API_BASE_URL}/tests`);
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

// --- Users (Practitioners) ---

export const addUser = (data: any): Promise<User> => {
    return fetchApi<User>(`${API_BASE_URL}/users`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const getAllUsers = (): Promise<User[]> => {
    return fetchApi<User[]>(`${API_BASE_URL}/users`);
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

// --- Patients ---

export const registerPatient = (data: any): Promise<PatientRegistrationResponse> => {
    return fetchApi<PatientRegistrationResponse>(`${API_BASE_URL}/patients/register`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const verifyAbha = (patientId: string, data: any): Promise<any> => {
    return fetchApi<any>(`${API_BASE_URL}/patients/${patientId}/abha/verify-otp`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const getPatientsByOrganization = (organizationId: string): Promise<PatientRegistrationResponse[]> => {
    return fetchApi<PatientRegistrationResponse[]>(`${API_BASE_URL}/patients/by-organization/${organizationId}`);
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

export const searchEncounters = (organizationId: string, date: string, query: string, tests: string[], page: number, size: number): Promise<Paginated<Encounter>> => {
    const testParams = tests.map(t => `tests=${t}`).join('&');
    return fetchApi<Paginated<Encounter>>(`${API_BASE_URL}/encounters/search?organizationId=${organizationId}&date=${date}&query=${query}&${testParams}&page=${page}&size=${size}`);
};

// --- Encounters & Service Requests ---

export const createEncounter = (data: any): Promise<Encounter> => {
    return fetchApi<Encounter>(`${API_BASE_URL}/encounters`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const createServiceRequest = (data: any): Promise<ServiceRequest> => {
    return fetchApi<ServiceRequest>(`${API_BASE_URL}/service-requests`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const getEncounterById = (encounterId: string): Promise<Encounter> => {
    return fetchApi<Encounter>(`${API_BASE_URL}/encounters/${encounterId}`);
};

export const updateEncounterStatus = (encounterId: string, data: any): Promise<Encounter> => {
    return fetchApi<Encounter>(`${API_BASE_URL}/encounters/${encounterId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

export const getServiceRequestById = (serviceRequestId: string): Promise<ServiceRequest> => {
    return fetchApi<ServiceRequest>(`${API_BASE_URL}/service-requests/${serviceRequestId}`);
};

export const updateServiceRequestStatus = (serviceRequestId: string, data: any): Promise<ServiceRequest> => {
    return fetchApi<ServiceRequest>(`${API_BASE_URL}/service-requests/${serviceRequestId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

// --- Observations (Test Results) ---

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

// --- Specimen ---

export const createSpecimen = (data: any): Promise<Specimen> => {
    return fetchApi<Specimen>(`${API_BASE_URL}/specimens`, {
        method: 'POST',
        body: JSON.stringify(data),
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

export const createBill = (data: any): Promise<Bill> => {
    return fetchApi<Bill>(`${API_BASE_URL}/bills`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const recordPayment = (billId: string, data: any): Promise<Bill> => {
    return fetchApi<Bill>(`${API_BASE_URL}/bills/${billId}/payment`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
};

export const getBillById = (billId: string): Promise<Bill> => {
    return fetchApi<Bill>(`${API_BASE_URL}/bills/${billId}`);
};

export const getBillsByEncounter = (encounterId: string): Promise<Bill[]> => {
    return fetchApi<Bill[]>(`${API_BASE_URL}/bills/by-encounter/${encounterId}`);
};

export const getBillsByOrganization = (organizationId: string, status: string): Promise<Bill[]> => {
    return fetchApi<Bill[]>(`${API_BASE_URL}/bills/by-organization/${organizationId}?status=${status}`);
};
