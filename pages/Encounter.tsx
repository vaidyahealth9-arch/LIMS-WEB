import React, { useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createEncounter } from '../services/api';
import { useNotifications } from '../services/NotificationContext';

const Encounter: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const patient = location.state?.patient; // Assuming patient object is passed in state

    const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16));
    const [status, setStatus] = useState('ARRIVED');
    const [encounterClass, setEncounterClass] = useState('AMB');
    const [referenceDoctor, setReferenceDoctor] = useState('');
    const [createdEncounter, setCreatedEncounter] = useState<null | { id: number; localEncounterValue?: string }>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const submitLockRef = useRef(false);

    const resolvedServiceProviderId = useMemo(() => {
        const fromPatient = Number((patient as any)?.organizationId);
        if (Number.isInteger(fromPatient) && fromPatient > 0) {
            return fromPatient;
        }

        const fromStorage = Number(localStorage.getItem('organizationId'));
        if (Number.isInteger(fromStorage) && fromStorage > 0) {
            return fromStorage;
        }

        return 1;
    }, [patient]);

    if (!patient) {
        return (
            <div className="container mx-auto px-4 py-6">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl mx-auto text-center">
                    <div className="mb-6">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">No Patient Selected</h2>
                        <p className="text-gray-600">Please select a patient before creating an encounter.</p>
                    </div>
                    <button
                        onClick={() => navigate('/patient-registration')}
                        className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-cyan-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all duration-200"
                    >
                        Go to Patient Registration
                    </button>
                </div>
            </div>
        );
    }

    const { addNotification } = useNotifications();
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (submitLockRef.current || isSubmitting) {
            return;
        }

        // Additional validation for referring doctor
        if (!referenceDoctor.trim()) {
            addNotification({
                type: 'error',
                title: 'Validation Error',
                message: 'Please enter the referring doctor\'s name',
                duration: 5000
            });
            return;
        }

        const encounterData = {
            patientId: patient.id,
            startTime: new Date(startTime).toISOString(),
            status,
            encounterClass,
            serviceProviderId: resolvedServiceProviderId,
            referenceDoctor: referenceDoctor.trim(),
            patientName: `${patient.firstName} ${patient.lastName}`,
            mrnId: patient.localMrnValue,
            date: new Date(startTime).toISOString()
        };

        try {
            submitLockRef.current = true;
            setIsSubmitting(true);
            const result = await createEncounter(encounterData);
            setCreatedEncounter(result);
            addNotification({
                type: 'success',
                title: `Encounter created for ${patient.firstName} ${patient.lastName}`,
                message: `Encounter ID: ${result.localEncounterValue || result.id} • MRN: ${patient.localMrnValue} • Dr. ${referenceDoctor} • ${status}`,
                duration: 5000 // Increased duration to ensure user sees the ID
            });
            // Continue workflow: Encounter -> Add Tests
            setTimeout(() => {
                navigate('/create-tests', { state: { encounter: result } });
            }, 3000);
        } catch (error) {
            console.error('Failed to create encounter:', error);
            addNotification({
                type: 'error',
                title: 'Failed to Create Encounter',
                message: error instanceof Error ? error.message : 'An error occurred',
                duration: 2000
            });
        } finally {
            setIsSubmitting(false);
            submitLockRef.current = false;
        }
    };

    return (
        <div className="container mx-auto px-4 py-6">
            {/* Header */}
            <div className="mb-6 p-6 rounded-xl" style={{ background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)' }}>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-1">Create New Encounter</h2>
                        <p className="text-cyan-100 text-sm">Register a new patient visit</p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg max-w-5xl mx-auto">
            
            {createdEncounter && (
                <div className="mb-6 p-6 border-2 border-emerald-300 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-emerald-800 mb-2">✓ Encounter Created Successfully!</h3>
                            <div className="text-emerald-700 space-y-1">
                                <p className="text-lg font-semibold">
                                    Encounter ID: <span className="text-emerald-900">{createdEncounter.localEncounterValue || createdEncounter.id}</span>
                                </p>
                                {createdEncounter.localEncounterValue && String(createdEncounter.id) !== String(createdEncounter.localEncounterValue) && (
                                    <p className="text-sm text-emerald-600">
                                        System ID: {createdEncounter.id}
                                    </p>
                                )}
                                <p className="text-sm text-emerald-600 mt-2">Redirecting to patient list...</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Patient Information Card */}
            <div className="mb-8 p-6 border-2 border-gray-200 rounded-xl bg-gradient-to-br from-gray-50 to-white">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-teal-500 rounded-full"></div>
                    <h3 className="text-lg font-bold text-gray-800">Patient Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                        <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Patient Name</p>
                            <p className="text-sm font-bold text-gray-800">{patient.firstName} {patient.lastName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                        <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">MRN</p>
                            <p className="text-sm font-bold text-gray-800">{patient.localMrnValue}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Date of Birth</p>
                            <p className="text-sm font-bold text-gray-800">{new Date(patient.dateOfBirth).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Form Header */}
                <div className="mb-6 flex items-center gap-2">
                    <div className="w-1 h-8 bg-gradient-to-b from-cyan-500 to-teal-500 rounded-full"></div>
                    <h3 className="text-xl font-bold text-gray-800">Encounter Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Encounter Start Time */}
                    <div>
                        <label htmlFor="start-time" className="block text-sm font-semibold text-gray-700 mb-2">
                            Encounter Start Time <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="datetime-local"
                            id="start-time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all hover:border-gray-300"
                            required
                        />
                    </div>

                    {/* Referring Doctor */}
                    <div>
                        <label htmlFor="ref-doctor" className="block text-sm font-semibold text-gray-700 mb-2">
                            Referring Doctor <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="ref-doctor"
                            value={referenceDoctor}
                            onChange={(e) => setReferenceDoctor(e.target.value)}
                            className={`w-full px-4 py-2.5 border-2 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 transition-all hover:border-gray-300 ${
                                referenceDoctor.trim() === '' ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-cyan-500'
                            }`}
                            required
                            placeholder="Enter referring doctor's name"
                        />
                        {referenceDoctor.trim() === '' && (
                            <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Referring doctor is required
                            </p>
                        )}
                    </div>

                    {/* Status */}
                    <div>
                        <label htmlFor="status" className="block text-sm font-semibold text-gray-700 mb-2">
                            Status <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full py-2.5 px-4 border-2 border-gray-200 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all hover:border-gray-300"
                        >
                            <option value="PLANNED">Planned</option>
                            <option value="ARRIVED">Arrived</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>

                    {/* Encounter Class */}
                    <div>
                        <label htmlFor="encounter-class" className="block text-sm font-semibold text-gray-700 mb-2">
                            Encounter Class <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="encounter-class"
                            value={encounterClass}
                            onChange={(e) => setEncounterClass(e.target.value)}
                            className="w-full py-2.5 px-4 border-2 border-gray-200 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all hover:border-gray-300"
                        >
                            <option value="AMB">Ambulatory</option>
                            <option value="IMP">Inpatient</option>
                            <option value="EMER">Emergency</option>
                        </select>
                    </div>

                </div>
                
                {/* Submit Button */}
                <div className="mt-8 pt-6 border-t-2 border-gray-100 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        disabled={isSubmitting}
                        className="px-6 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all duration-200"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || createdEncounter !== null}
                        className="px-8 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-cyan-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all duration-200 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        {isSubmitting ? 'Creating Encounter...' : 'Create Encounter'}
                    </button>
                </div>
            </form>
            </div>
        </div>
    );
};

export default Encounter;