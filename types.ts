export enum UserRole {
    Admin = 'Admin',
    Manager = 'Manager',
    Receptionist = 'Receptionist',
    Technician = 'Technician',
    Doctor = 'Doctor',
    Radiologist = 'Radiologist',
}

export interface User {
    id: number;
    username: string;
    roles: string[];
    isActive: boolean;
    organizationId: number | null;
    organizationName: string | null;
    practitionerFirstName: string;
    practitionerLastName: string | null;
    practitionerGender: 'male' | 'female' | 'other' | 'unknown' | null;
    practitionerSignatureImage?: string | null;
    practitionerDateOfBirth: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface UserCreateRequest {
    practitionerFirstName: string;
    practitionerLastName?: string;
    practitionerGender?: 'male' | 'female' | 'other' | 'unknown';
    practitionerSignatureImage?: string;
    practitionerDateOfBirth?: string;
    username: string;
    password: string;
    roles: string[];
    organizationId: number;
    isActive?: boolean;
}

export interface UserUpdateRequest {
    practitionerFirstName?: string;
    practitionerLastName?: string;
    practitionerGender?: 'male' | 'female' | 'other' | 'unknown';
    practitionerSignatureImage?: string;
    practitionerDateOfBirth?: string;
    newPassword?: string;
    roles?: string[];
    isActive?: boolean;
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
    // Aadhaar normalization
    postalCode: string;
    relationship?: string;
    isDependent?: boolean;
}

export interface Test {
    id: string;
    testName: string;
    name: string;
    department: string;
    method: string;
    // Add other test properties as needed
}

export interface MasterTest {
    id: number;
    testName: string;
    localCode?: string;
}

export interface Analyte {
    id: number;
    testId?: number;
    name: string;
    price: number | null;
    code: string;
    associatedTest: string;
    bioReference: string;
    isOrgSpecific: boolean;
}

export interface RequestedTest {
  testId: number;
  testLocalCode: string;
  testName: string;
  status: string;
  price: number;
  analytes: Analyte[];
  barcode: string;
    specimenBarcodes?: string[];
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
    encounterStatus?: 'PLANNED' | 'ARRIVED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED' | string;
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
    testCode?: string;
    testName: string;
    isEnabled: boolean;
    price: number | null;
    analyteIds?: number[];
    createdAt: string;
    updatedAt: string;
    specimenTypeId?: number;
    defaultNumberOfSpecimens?: number;
}

export interface BilledTest {
    id: string;
    name: string;
    department: string;
    sampleContainer: string;
    price: number;
}

export interface ServiceRequestAnalyte {
    analyteId: number;
    analyteName: string;
    unit: string;
    resultType?: string;
    biologicalRefInterval?: string | null;
    referenceRange?: string | null;
    interpretationRule: InterpretationRule | null;
}

export interface GroupedAnalyte {
    testId: number;
    testName: string;
    analytes: ServiceRequestAnalyte[];
}

export interface TestResult {
    id: string;
    testName: string;
    observedValue: string;
}

export interface ResultEntry {
    id: string;
    testName: string;
    observedValue: string;
    machineValue?: string;
    units: string;
    resultType?: string;
    normalRange: string;
    comments: string;
    specimenId?: number | null;
    analyteId: number;
    existingObservationId?: string | null;
    interpretationRule: InterpretationRule | null;
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
    id: number;
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

export type InterpretationRule = {
  id?: number;
  organizationId?: number;
  analyteId: number;
  analyteName: string;
  conditionExpression?: string;
  classification?: string;
  autoComment?: string;
  reflexActionText?: string;
  priority?: string;
  createdAt?: string;
  updatedAt?: string;
  ruleSource?: 'Organization' | 'Global';
};

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
    gstin?: string | null;
    localIdentifierValue: string;
    reportHeaderImage?: string | null;
    reportFooterImage?: string | null;
    reportHeaderMarginMm?: number | null;
    reportFooterMarginMm?: number | null;
    reportHeaderHeightMm?: number | null;
    reportFooterHeightMm?: number | null;
}

export interface Encounter {
    id: number;
    patientId: number;
    patientName: string;
    patientAge: string;
    patientGender: string;
    mrnId: string;
    referenceDoctor: string;
    date: string;
    collectionDate: string;
    sampleType: string;
    status: 'PLANNED' | 'ARRIVED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED' | 'PENDING_VERIFICATION' | 'APPROVED' | 'COMPLETED';
    tests: string[];
    localEncounterValue?: string;
    serviceRequestIds?: number[];
    approvingPractitionerId?: number;
}

export interface ServiceRequest {
    id: number;
    patientId: number;
    requesterId: number;
    encounterId: number;
    encounterStatus?: 'PLANNED' | 'ARRIVED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED' | string;
    status: string;
    priority: string;
    testIds: string[];
}

export interface Specimen {
    id: number | string;
    localSpecimenValue?: string;
    serviceRequestId: number | string;
    serviceRequestLocalValue?: string;
    patientId: number | string;
    patientMrn?: string;
    specimenTypeId?: number | string;
    specimenTypeName?: string;
    collectionDate?: string;
    receivedDate?: string;
    status: string;
    containerId?: string;
    barcode?: string;
    barcodeRegeneratedCount?: number;
    lastBarcodeRegeneratedAt?: string;
    lastBarcodeRegeneratedBy?: string;
    lastBarcodeRegenerationReason?: string;
    organizationId?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface Observation {
    id: string;
    serviceRequestId: string;
    specimenId: string;
    testName?: string;
    analyteId: string;
    analyteName?: string;
    valueNumeric?: number;
    valueString?: string;
    comments?: string;
    unit?: string;
    referenceRange?: string;
    interpretation?: string;
    status?: string;
    performerName?: string;
    performerSignatureImage?: string;
    issuedDateTime?: string;
    effectiveDateTime: string;
}

export interface ReportApprovalStatus {
    ready: boolean;
    message: string;
    approvedDoctorName?: string | null;
    approvedDoctorSignatureImage?: string | null;
    approvedAt?: string | null;
    ulrNumber?: string | null;
    accreditationScopeQrContent?: string | null;
    reportIntegrityQrContent?: string | null;
    reportStorageReference?: string | null;
    reportLocalValue?: string | null;
    reportPdfPath?: string | null;
}

export interface BillTestItem {
    testName: string;
    price: number;
}

export interface Bill {
    billId: number;
    encounterId?: number;
    organizationId?: number;
    invoiceNumber: string;
    invoiceDate: string;
    patientName: string;
    patientMrn: string;
    localEncounterId: string;
    organizationName?: string;
    totalAmount: number;
    discountAmount?: number;
    netAmount: number;
    paidAmount: number;
    dueAmount?: number;
    discountPercentage: number;
    status: 'PAID' | 'PARTIALLY_PAID' | 'DUE' | 'CANCELLED';
    paymentDate?: string;
    serviceRequestIds: number[];
    tests: string[];
    testItems?: BillTestItem[];
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

export interface TestCatalogImportItemResult {
    testId?: number;
    localCode?: string;
    testName?: string;
    action: string;
    status: string;
    message: string;
}

export interface TestCatalogImportResponse {
    total: number;
    created: number;
    updated: number;
    failed: number;
    dryRun: boolean;
    results: TestCatalogImportItemResult[];
}

export interface DashboardWeeklyRevenueItem {
    date: string;
    revenue: number;
}

export interface DashboardData {
    newPatientsToday: number;
    revenueToday: number;
    pendingServiceRequests: number;
    weeklyRevenue: DashboardWeeklyRevenueItem[];
    averageTat: number;
}
