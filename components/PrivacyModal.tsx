import React from 'react';
import { X, Lock, Eye, Server, Key, Clock, ShieldCheck, Layers, Settings, FileText } from 'lucide-react';

interface PrivacyModalProps {
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-teal-100/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-700 rounded-2xl text-white shadow-md shadow-teal-600/20">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 leading-tight">Privacy Policy</h2>
              <p className="text-[10px] font-semibold text-teal-700 tracking-wider uppercase mt-0.5">Vaidya LIMS • Effective July 2026</p>
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
          
          <p className="text-sm font-medium text-slate-700 font-sans">
            At Vaidya Health, we are dedicated to protecting user and patient privacy. This Privacy Policy details how we collect, store, process, and secure diagnostic and personal information within the Vaidya LIMS application under the Digital Personal Data Protection Act, 2023 (DPDPA).
          </p>

          <div className="h-px bg-slate-100" />

          {/* 1. What Data is Collected */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Eye className="w-4.5 h-4.5 text-teal-700" />
              1. What Data is Collected
            </h3>
            <p className="pl-6">
              We collect user account credentials, login history, audit trail logs, and patient records uploaded by authorized laboratory staff (including registration details, billing information, sample status, and clinical test outcomes).
            </p>
          </section>

          {/* 2. Why it is Collected */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4.5 h-4.5 text-teal-700" />
              2. Why it is Collected
            </h3>
            <p className="pl-6">
              Information is collected to manage laboratory user credentials, maintain an untamperable audit trail for diagnostic operations, process billing, generate test reports, and securely transmit patient diagnostic records.
            </p>
          </section>

          {/* 3. Where it is Stored */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-4.5 h-4.5 text-teal-700" />
              3. Where it is Stored
            </h3>
            <p className="pl-6 font-semibold text-slate-800">
              All data is stored on secure, highly redundant cloud servers situated inside India, in strict compliance with national guidelines.
            </p>
          </section>

          {/* 4. Encryption Practices */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Key className="w-4.5 h-4.5 text-teal-700" />
              4. Encryption Practices
            </h3>
            <p className="pl-6">
              We employ strict encryption standards. Diagnostic data and patient files are encrypted during transit using TLS/SSL and at rest using strong AES-256 encryption.
            </p>
          </section>

          {/* 5. Data Retention Period */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-teal-700" />
              5. Data Retention Period
            </h3>
            <p className="pl-6">
              Patient records, invoices, and audit logs are retained for periods specified under Indian clinical diagnostic guidelines, laboratory regulations, or as defined in the service level agreement with the diagnostic facility.
            </p>
          </section>

          {/* 6. Cookies */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-4.5 h-4.5 text-teal-700" />
              6. Cookies & Local Storage
            </h3>
            <p className="pl-6">
              We utilize essential session cookies and local storage tokens to keep users authenticated, securely manage sessions, and protect against cross-site request forgery attacks.
            </p>
          </section>

          {/* 7. Third-Party Integrations */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4.5 h-4.5 text-teal-700" />
              7. Third-Party Integrations
            </h3>
            <p className="pl-6">
              LIMS interfaces with third-party analyzers, billing/payment gateways, barcode systems, and notification providers (WhatsApp/SMS). Report transmission to patient portals (like VaidyaOne or ABDM network) occurs according to patient identifiers and configuration settings.
            </p>
          </section>

          {/* 8. User Rights */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-teal-700" />
              8. User Rights
            </h3>
            <p className="pl-6">
              Laboratory staff and patients have the right to request access, rectification, or updates to their diagnostic logs. Deletion of diagnostic reports is governed strictly by clinical records retention rules.
            </p>
          </section>

          {/* 9. Grievance Officer Details */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4.5 h-4.5 text-teal-700" />
              9. Grievance Officer Details (DPDPA 2023)
            </h3>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 ml-6 space-y-1.5 text-slate-700">
              <p>
                Under the Digital Personal Data Protection Act, 2023, you can reach out to our Grievance Officer regarding any data protection concerns:
              </p>
              <div className="mt-2 space-y-1">
                <p><span className="font-bold">Grievance Officer:</span> Vaidya Compliance Team</p>
                <p><span className="font-bold">Email:</span> <span className="font-mono text-teal-755 font-semibold">grievance@vaidyahealth.in</span></p>
                <p><span className="font-bold">Address:</span> Vaidya Health, Hyderabad, Telangana, India</p>
              </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-teal-500/10 hover:shadow-teal-500/20 hover:-translate-y-0.5"
          >
            I Understand & Close
          </button>
        </div>

      </div>
    </div>
  );
};
