import React, { useState } from 'react';
import { exportPatientData, importPatientData } from '../services/api';
import { useNotifications } from '../services/NotificationContext';

const PatientData: React.FC = () => {
    const { addNotification } = useNotifications();
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setImportFile(event.target.files[0]);
        }
    };

    const handleImport = async () => {
        if (!importFile) {
            addNotification({
                type: 'error',
                title: 'No File Selected',
                message: 'Please select an Excel file to import.',
                persist: false,
            });
            return;
        }

        setIsImporting(true);
        try {
            const response = await importPatientData(importFile);
            addNotification({
                type: 'success',
                title: 'Import Successful',
                message: response,
                persist: true,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            addNotification({
                type: 'error',
                title: 'Import Failed',
                message: errorMessage,
                persist: true,
            });
        } finally {
            setIsImporting(false);
            setImportFile(null);
        }
    };

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
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Patient Data Management</h2>

                {/* Export Section */}
                <div className="mb-8">
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

                {/* Import Section */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Import Patient Data</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Upload an Excel file to import new patient data. The first row must be the header with exact column names.
                    </p>
                    <div className="flex items-center space-x-4">
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"
                        />
                        <button
                            onClick={handleImport}
                            disabled={isImporting || !importFile}
                            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-cyan-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all duration-200 disabled:opacity-50"
                        >
                            {isImporting ? 'Importing...' : 'Import from Excel'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatientData;