import React from 'react';
import { X, Scale, Shield, AlertTriangle, UserCheck, HelpCircle, FileText, Trash2, Clock, Award, RefreshCw, Lock, Users, Eye, Database, FileSpreadsheet, Server, Zap } from 'lucide-react';

interface TermsModalProps {
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-gradient-to-r from-cyan-50 to-cyan-100/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-700 rounded-2xl text-white shadow-md shadow-cyan-600/20">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 leading-tight">Terms & Conditions</h2>
              <p className="text-[10px] font-semibold text-cyan-700 tracking-wider uppercase mt-0.5">Vaidya LIMS • Effective July 2026</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-600 text-xs leading-relaxed">
          
          <p className="text-sm font-medium text-slate-700">
            By accessing or using Vaidya LIMS (Laboratory Information Management System), you agree to comply with and be bound by these Terms & Conditions. Please read them carefully.
          </p>

          <div className="h-px bg-slate-100" />

          {/* 1. Authorized Use */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-cyan-700" />
              1. Authorized Use & Role-Based Responsibilities
            </h3>
            <p className="pl-6">
              By accessing Vaidya LIMS, you confirm that you are an authorized employee, consultant, or representative of a registered healthcare facility or diagnostic laboratory. You agree to use the system only for legitimate healthcare and laboratory operations.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 ml-6 space-y-3">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-700" />
                Role-Based Responsibilities
              </h4>
              <ul className="space-y-2">
                <li>
                  <span className="font-bold text-slate-800">Receptionist:</span> Responsible for correct patient registration and billing.
                </li>
                <li>
                  <span className="font-bold text-slate-800">Technician:</span> Responsible for accurate sample processing and result entry.
                </li>
                <li>
                  <span className="font-bold text-slate-800">Pathologist:</span> Responsible for reviewing and approving reports where applicable.
                </li>
                <li>
                  <span className="font-bold text-slate-800">Administrator:</span> Responsible for user management, access control, and compliance.
                </li>
              </ul>
            </div>
          </section>

          {/* 2. Patient Data & Privacy */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Eye className="w-4 h-4 text-cyan-700" />
              2. Patient Data & Privacy
            </h3>
            <p className="pl-6">
              You agree to handle all patient information confidentially and in compliance with applicable Indian laws, including the Digital Personal Data Protection Act, 2023. Patient data must only be accessed for authorized clinical or administrative purposes.
            </p>
          </section>

          {/* 3. Accuracy of Reports */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-cyan-700" />
              3. Accuracy of Reports
            </h3>
            <div className="pl-6 space-y-1.5">
              <p>The laboratory is solely responsible for ensuring that:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Patient identification is correct.</li>
                <li>Test values are accurate.</li>
                <li>Units and reference ranges are appropriate.</li>
                <li>Pathologist authorization is completed where required.</li>
                <li>Reports are reviewed before release.</li>
              </ul>
              <p className="font-semibold text-slate-800 mt-1">Vaidya only stores and transmits reports and does not verify their clinical accuracy.</p>
            </div>
          </section>

          {/* 4. User Accounts & Access Control */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyan-700" />
              4. User Accounts & Access Control
            </h3>
            <div className="pl-6 space-y-1.5">
              <p>Each user must have an individual login. Users must not:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Share passwords.</li>
                <li>Use another employee’s account.</li>
                <li>Leave systems logged in unattended.</li>
                <li>Create unauthorized user accounts.</li>
              </ul>
              <p>Laboratories are responsible for promptly disabling accounts of former employees.</p>
            </div>
          </section>

          {/* 5. Electronic Audit Trail */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-700" />
              5. Electronic Audit Trail
            </h3>
            <p className="pl-6 font-semibold text-slate-800">
              Every significant action—including patient registration, sample collection, result entry, report approval, report modification, invoice generation, and user management—is automatically logged with user identity and timestamps. Audit logs cannot be altered.
            </p>
          </section>

          {/* 6. Data Security */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-700" />
              6. Data Security
            </h3>
            <p className="pl-6">
              Vaidya employs industry-standard security measures to protect stored data. Users are responsible for safeguarding their credentials and immediately reporting suspected unauthorized access.
            </p>
          </section>

          {/* 7. System Availability */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-cyan-700" />
              7. System Availability
            </h3>
            <p className="pl-6">
              While Vaidya strives for continuous availability, temporary interruptions may occur due to maintenance, upgrades, internet connectivity, or unforeseen technical issues. Routine maintenance may occur without prior notice during off-peak hours.
            </p>
          </section>

          {/* 8. Backup & Disaster Recovery */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-700" />
              8. Backup & Disaster Recovery
            </h3>
            <p className="pl-6">
              Vaidya performs regular system backups. Laboratories are encouraged to retain copies of legally required reports in accordance with local regulations.
            </p>
          </section>

          {/* 9. Integration Services */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-700" />
              9. Integration Services
            </h3>
            <p className="pl-6">
              If the laboratory enables integrations (PHR, ABHA, analyzers, barcode systems, SMS, WhatsApp, payment gateways, or third-party software), data will be exchanged only according to configured settings and applicable consent requirements. Vaidya is not responsible for failures caused by third-party systems.
            </p>
          </section>

          {/* 10. Patient Record Transmission */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-700" />
              10. Patient Record Transmission
            </h3>
            <p className="pl-6">
              Released reports may automatically become available to patients through VaidyaOne or other authorized connected platforms, based on the patient’s registered mobile number or approved identifiers.
            </p>
          </section>

          {/* 11. Billing & Financial Records */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-700" />
              11. Billing & Financial Records
            </h3>
            <div className="pl-6 space-y-1">
              <p>The laboratory is solely responsible for:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Pricing</li>
                <li>Tax calculations</li>
                <li>Invoices</li>
                <li>Refunds</li>
                <li>Financial compliance</li>
              </ul>
              <p>Vaidya does not assume responsibility for billing disputes.</p>
            </div>
          </section>

          {/* 12. Prohibited Activities */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-danger-600" />
              12. Prohibited Activities
            </h3>
            <div className="pl-6 space-y-1.5">
              <p>Users shall not:</p>
              <ul className="list-disc list-inside space-y-1 pl-1 text-slate-600">
                <li>Access records without authorization.</li>
                <li>Alter patient reports fraudulently.</li>
                <li>Upload malicious software.</li>
                <li>Reverse engineer the software.</li>
                <li>Attempt unauthorized system access.</li>
                <li>Use the platform for unlawful purposes.</li>
              </ul>
              <p className="text-danger-700 font-semibold">Violation may result in immediate suspension.</p>
            </div>
          </section>

          {/* 13. Intellectual Property */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-cyan-700" />
              13. Intellectual Property
            </h3>
            <p className="pl-6">
              The software, source code, user interface, trademarks, documentation, and associated technologies remain the exclusive property of Vaidya Health. No rights are transferred except for the licensed use of the platform.
            </p>
          </section>

          {/* 14. Limitation of Liability */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-cyan-700" />
              14. Limitation of Liability
            </h3>
            <div className="pl-6 space-y-1">
              <p>Vaidya is a software platform and is not responsible for:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Incorrect laboratory results</li>
                <li>Clinical decisions</li>
                <li>Delayed diagnoses</li>
                <li>Data entered incorrectly by laboratory staff</li>
                <li>Hardware failures at the customer site</li>
                <li>Internet outages</li>
                <li>Third-party integration failures</li>
              </ul>
              <p className="font-semibold text-slate-800">The laboratory retains full responsibility for patient care and report accuracy.</p>
            </div>
          </section>

          {/* 15. Suspension & Termination */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-cyan-700" />
              15. Suspension & Termination
            </h3>
            <div className="pl-6 space-y-1">
              <p>Vaidya may suspend or terminate access for:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Unauthorized use</li>
                <li>Security breaches</li>
                <li>Illegal activity</li>
                <li>Non-payment (if applicable)</li>
                <li>Violation of these Terms</li>
              </ul>
            </div>
          </section>

          {/* 16. Updates to Terms */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-cyan-700" />
              16. Updates to Terms
            </h3>
            <p className="pl-6">
              These Terms may be updated periodically. Continued use of Vaidya LIMS constitutes acceptance of revised Terms.
            </p>
          </section>

          {/* 17. Governing Law */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-cyan-700" />
              17. Governing Law
            </h3>
            <p className="pl-6">
              These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Hyderabad, Telangana.
            </p>
          </section>

          {/* 18. Contact Information */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-700" />
              18. Contact Information
            </h3>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 pl-4 ml-6 space-y-1 text-slate-700">
              <p className="font-bold">Vaidya Health</p>
              <p>Email: <span className="font-mono text-cyan-700 font-semibold">support@vaidyahealth.in</span></p>
              <p>Website: <span className="font-mono text-cyan-700 font-semibold">www.vaidyahealth.in</span></p>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-cyan-700 hover:bg-cyan-855 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-cyan-500/10 hover:shadow-cyan-500/20 hover:-translate-y-0.5"
          >
            I Understand & Close
          </button>
        </div>

      </div>
    </div>
  );
};
