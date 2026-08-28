import React, { useState } from 'react';
import { exportPatientData } from '../services/api';
import { useNotifications } from '../services/NotificationContext';

const PatientData: React.FC = () => {
    const { addNotification } = useNotifications();
    const [isExporting, setIsExporting] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [gender, setGender] = useState('ALL');

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const blob = await exportPatientData({
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                gender: gender === 'ALL' ? undefined : gender,
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `patient_export_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            addNotification({
                type: 'success',
                title: 'Export Successful',
                message: 'Filtered patient data has been exported.',
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

    const handleClearFilters = () => {
        setStartDate('');
        setEndDate('');
        setGender('ALL');
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="bg-gradient-to-br from-white to-cyan-50 p-8 rounded-xl shadow-lg max-w-3xl mx-auto border border-cyan-100">
                {/* Header Card */}
                <div className="mb-8 rounded-2xl bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 p-6 text-white shadow-md relative overflow-hidden">
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white opacity-10 rounded-full blur-xl"></div>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-3xl font-extrabold tracking-tight">Patient Data Export</h2>
                            <p className="mt-1 text-sm text-cyan-100">Export comprehensive patient details, history, and financial metrics to Excel.</p>
                        </div>
                    </div>
                </div>

                {/* Filter Controls Panel */}
                <div className="bg-white/60 backdrop-blur-md border border-cyan-100 rounded-2xl p-6 shadow-sm mb-6">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2 text-cyan-700">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        Filter Patient Records
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* Date Range Start */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Registered From</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-sm"
                            />
                        </div>

                        {/* Date Range End */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Registered To</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-sm"
                            />
                        </div>

                        {/* Gender */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Gender</label>
                            <select
                                value={gender}
                                onChange={(e) => setGender(e.target.value)}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-sm bg-white cursor-pointer"
                            >
                                <option value="ALL">All Genders</option>
                                <option value="MALE">Male</option>
                                <option value="FEMALE">Female</option>
                                <option value="OTHER">Other</option>
                                <option value="UNKNOWN">Unknown</option>
                            </select>
                        </div>

                        {/* Actions block inside filters */}
                        <div className="flex items-end justify-end">
                            {(startDate || endDate || gender !== 'ALL') && (
                                <button
                                    onClick={handleClearFilters}
                                    className="px-4 py-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Features Badges */}
                <div className="mb-6 flex flex-wrap gap-2 text-xs font-semibold text-slate-600 justify-center">
                    <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3.5 py-1.5 shadow-sm">✓ Patient Demographics</span>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 shadow-sm">✓ Tests Taken History</span>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 shadow-sm">✓ Invoice & Billing Details</span>
                </div>

                {/* Export Trigger Card */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-800">Generate Spreadsheet</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            Extracts patient metrics based on the filters chosen above. The file is optimized for analysis in Excel or Google Sheets.
                        </p>
                    </div>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300 disabled:opacity-50 flex items-center gap-2 transform active:scale-95"
                    >
                        {isExporting ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                </svg>
                                Exporting...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download Excel
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PatientData;