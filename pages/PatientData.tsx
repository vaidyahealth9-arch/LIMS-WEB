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
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto border border-cyan-100">
                <div className="mb-8 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 p-5 text-white">
                    <h2 className="text-2xl font-bold">Patient Data Management</h2>
                    <p className="mt-1 text-sm text-cyan-100">Export existing records or import new records from Excel in a controlled way.</p>
                </div>

                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase">Step 1</p>
                        <p className="text-sm font-medium text-slate-800">Download latest data/template</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase">Step 2</p>
                        <p className="text-sm font-medium text-slate-800">Edit rows without changing header names</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase">Step 3</p>
                        <p className="text-sm font-medium text-slate-800">Import and review notifications</p>
                    </div>
                </div>

                {/* Export Section */}
                <div className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Export Patient Data</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Download all patient data to an Excel file.
                    </p>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200 disabled:opacity-50"
                    >
                        {isExporting ? 'Exporting...' : 'Export to Excel'}
                    </button>
                </div>

                {/* Import feature removed per request (was non-functional) */}
            </div>
        </div>
    );
};

export default PatientData;