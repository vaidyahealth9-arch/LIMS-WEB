import React, { useState } from 'react';
import { exportPatientData } from '../services/api';
import { useNotifications } from '../services/NotificationContext';

const PatientData: React.FC = () => {
    const { addNotification } = useNotifications();
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const blob = await exportPatientData();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'patient_data.xlsx';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            addNotification({
                type: 'success',
                title: 'Export Successful',
                message: 'Patient data has been exported.',
                persist: false,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            addNotification({
                type: 'error',
                title: 'Export Failed',
                message: errorMessage,
                persist: true,
            });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-3xl mx-auto border border-cyan-100">
                <div className="mb-6 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 p-5 text-white">
                    <h2 className="text-2xl font-bold">Patient Data Management</h2>
                    <p className="mt-1 text-sm text-cyan-100">Export patient data with tests done and billing details in one compact Excel download.</p>
                </div>

                <div className="mb-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                    <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1">Includes patient basics</span>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">Includes tests done</span>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1">Includes billing summary</span>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800">Export patient data</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Download a single Excel file with patient demographics, test history, invoice numbers, and payment totals.
                            </p>
                        </div>
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200 disabled:opacity-50"
                        >
                            {isExporting ? 'Exporting...' : 'Export to Excel'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatientData;