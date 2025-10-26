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
    name: string;
    // Add other test properties as needed
}

export interface ReferenceRange {
    id: number;
    minAgeYears: number;
    lowValue: number;
    highValue: number;
    textRange: string;
    interpretationCode: string;
}

export interface Analyte {
    analyteId: number;
    analyteName: string;
    unit: string;
    referenceRanges: ReferenceRange[];
}

export interface RequestedTest {
  testId: number;
  testLocalCode: string;
  testName: string;
  status: string;
  price: number;
  analytes: Analyte[];
}

export interface ServiceRequest {
  id: number;
  localOrderValue: string;
  patientId: number;
  patientMrn: string;
  patientName: string;
  requesterId: number;
  requesterName: string;
  encounterId: number;
  encounterLocalValue: string;
  orderDate: string;
  status: string;
  priority: string;
  organizationId: number;
  organizationName: string;
  requestedTests: RequestedTest[];
  createdAt: string;
  updatedAt: string;
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
    status: 'PLANNED' | 'ARRIVED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
    tests: string[];
    localEncounterValue?: string;
    serviceRequestIds?: number[];
}

export interface ServiceRequest {
    id: number;
    patientId: number;
    requesterId: number;
    encounterId: number;
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
    billId: number;
    invoiceNumber: string;
    invoiceDate: string;
    patientName: string;
    patientMrn: string;
    localEncounterId: string;
    totalAmount: number;
    netAmount: number;
    paidAmount: number;
    discountPercentage: number;
    status: 'PAID' | 'PARTIALLY_PAID' | 'DUE' | 'CANCELLED';
    serviceRequestIds: number[];
    tests: string[];
    notes?: string;
    dueDate?: string;
}

export interface BillableTest {
    testId: number;
    testName: string;
    price: number;
}

export interface BillableServiceRequest {
    serviceRequestId: number;
    tests: BillableTest[];
}

export interface BillableDetails {
    localEncounterId: string;
    serviceRequests: BillableServiceRequest[];
}

export interface Paginated<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
}
