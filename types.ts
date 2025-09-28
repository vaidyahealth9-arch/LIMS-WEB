export enum UserRole {
    Admin = 'Admin',
    Receptionist = 'Receptionist',
    Technician = 'Technician',
    Doctor = 'Doctor',
    Radiologist = 'Radiologist',
    Manager = 'Manager',
}

export interface User {
    id: string;
    practitionerFirstName: string;
    practitionerLastName: string;
    practitionerGender: 'male' | 'female' | 'other';
    practitionerDateOfBirth: string;
    username: string;
    roles: string[];
    organizationId: string;
    isActive: boolean;
}

export interface Patient {
    id: string;
    uhid: string;
    name: string;
    age: number;
    gender: 'Male' | 'Female' | 'Other';
    phone: string;
    status: 'Completed' | 'Ongoing' | 'Stopped/Interrupted';
    date: string;
    refDoctor: string;
    tests: string[];
    amount: number;
    abhaId?: string;
}

export interface PatientRegistrationResponse {
    id: number;
    localMrnValue: string;
    firstName: string;
    lastName: string;
    gender: 'male' | 'female' | 'other';
    dateOfBirth: string;
    abhaId: string;
    abhaAddress: string;
    abdmLinkStatus: string;
    createdAt: string;
    organizationId: number;
    contactPhone: string;
    contactEmail: string;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
}

export interface Test {
    id: string;
    testName: string;
    localCode: string;
    loincCode: string;
    department: string;
    containerDescription: string;
    method: string;
    measuringPrinciple: string;
    turnAroundTimeText: string;
    reflexProfileText: string;
    reportNotes: string;
}

export interface OrganizationTest {
    organizationId: number;
    organizationName: string;
    testId: number;
    testLocalCode: string;
    testName: string;
    isEnabled: boolean;
    price: number;
    createdAt: string;
    updatedAt: string;
}

export interface BilledTest {
    id: string;
    name: string;
    department: string;
    sampleContainer: string;
    price: number;
}

export interface TestResult {
    id: string;
    testName: string;
    observedValue: string;
    machineValue?: string;
    units: string;
    normalRange: string;
    comments: string;
}

export interface IrisWorklistItem {
    id: string;
    patientId: string;
    patientName: string;
    modality: string;
    part: string;
    dateTime: string;
    priority: 'Urgent' | 'Routine';
    status: 'New' | 'Completed' | 'Ongoing' | 'Stopped/Interrupted';
}

export interface Unit {
    id: string;
    name: string;
    ucumCode: string;
    description: string;
}

export interface SpecimenType {
    id: string;
    name: string;
    snomedCode: string;
    description: string;
}

export interface TestAnalyte {
    id: string;
    analyteCode: string;
    analyteName: string;
    parentTestId: string;
    loincCode: string;
    unitId: string;
    resultType: 'Numeric' | 'Text';
    decimalPlaces: number;
    biologicalRefInterval: string | null;
    isDerived: boolean;
    formula?: string;
}

export interface ReferenceRange {
    id: string;
    analyteId: string;
    gender: 'male' | 'female' | null;
    minAgeYears: number | null;
    maxAgeYears: number | null;
    lowValue: number | null;
    highValue: number | null;
    textRange: string;
    interpretationCode: string;
}

export interface TestInterpretationRule {
    id: string;
    ruleId: string;
    analyteId: string;
    conditionExpression: string;
    classification: string;
    autoComment: string;
    reflexActionText: string | null;
    priority: 'Info' | 'Critical';
}

export interface Organization {
    id: string;
    organizationName: string;
    orgType: string;
    contactPhone: string;
    contactEmail: string;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    localIdentifierValue: string;
}

export interface Encounter {
    id: number;
    patientId: number;
    patientName: string;
    mrnId: string;
    referenceDoctor: string;
    date: string;
    status: 'arrived' | 'in-progress' | 'finished' | 'cancelled';
    tests: string[];
}

export interface ServiceRequest {
    id: string;
    patientId: string;
    requesterId: string;
    encounterId: string;
    status: string;
    priority: string;
    testIds: string[];
}

export interface Specimen {
    id: string;
    serviceRequestId: string;
    patientId: string;
    specimenTypeId: string;
    collectionDate: string;
    receivedDate: string;
    status: string;
    containerId: string;
}

export interface Observation {
    id: string;
    serviceRequestId: string;
    specimenId: string;
    analyteId: string;
    valueNumeric?: number;
    valueString?: string;
    effectiveDateTime: string;
}

export interface Bill {
    id: string;
    encounterId: string;
    serviceRequestIds: string[];
    discountPercentage: number;
    initialPaymentMethod: string;
    initialPaidAmount: number;
    notes: string;
}