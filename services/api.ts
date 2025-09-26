
import type { Test, OrganizationTest, Unit, SpecimenType, TestAnalyte, ReferenceRange, TestInterpretationRule, Organization, User, Patient, Encounter, ServiceRequest, Specimen, Observation, Bill, PatientRegistrationResponse } from '../types';

const API_BASE_URL = '/api';

// Helper to get authorization headers
const getAuthHeaders = () => {
    // Using Basic Auth with credentials "admin:adminpass"
    const credentials = btoa('admin:adminpass');
    return {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
    };
};

const getTechnicianAuthHeaders = () => {
    // Using Basic Auth with credentials "admin:adminpass"
    const credentials = btoa('tech.labA:techpassword123');
    return {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
    };
};

/**
 * A generic fetch wrapper to handle errors and JSON parsing
 * @param url The URL to fetch
 * @param options The fetch options
 * @returns The JSON response
 */
const fetchApi = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...options.headers,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
};


const fetchTechnicianApi = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...getTechnicianAuthHeaders(),
            ...options.headers,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
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
    return fetchTechnicianApi<PatientRegistrationResponse>(`${API_BASE_URL}/patients/register`, {
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
