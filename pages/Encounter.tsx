import React, { useState } from 'react';
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
    const [serviceProviderId, setServiceProviderId] = useState('2'); // Hardcoded for now
    const [referenceDoctor, setReferenceDoctor] = useState('');
    const [createdEncounter, setCreatedEncounter] = useState<null | { id: number }>(null);

    if (!patient) {
        return (
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto text-center">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Error: No Patient Selected</h2>
                <p className="text-gray-700">Please select a patient before creating an encounter.</p>
                <button
                    onClick={() => navigate('/patient-registration')}
                    className="mt-6 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75"
                >
                    Go to Patient Registration
                </button>
            </div>
        );
    }

    const { addNotification } = useNotifications();
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

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
            serviceProviderId: parseInt(serviceProviderId, 10),
            referenceDoctor: referenceDoctor.trim(),
            patientName: `${patient.firstName} ${patient.lastName}`,
            mrnId: patient.localMrnValue,
            date: new Date(startTime).toISOString()
        };

        try {
            const result = await createEncounter(encounterData);
            setCreatedEncounter(result);
            addNotification({
                type: 'success',
                title: `Encounter created for ${patient.firstName} ${patient.lastName}`,
                message: `Encounter ID: ${result.localEncounterValue || result.id} • MRN: ${patient.localMrnValue} • Dr. ${referenceDoctor} • ${status}`,
                duration: 5000 // Increased duration to ensure user sees the ID
            });
            // Longer delay to ensure user can see the encounter ID
            setTimeout(() => {
                navigate('/patient-list');
            }, 3000);
        } catch (error) {
            console.error('Failed to create encounter:', error);
            addNotification({
                type: 'error',
                title: 'Failed to Create Encounter',
                message: error instanceof Error ? error.message : 'An error occurred',
                duration: 2000
            });
        }
    };

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Encounter</h2>
            
            {createdEncounter && (
                <div className="mb-6 p-4 border-2 border-green-500 rounded-lg bg-green-50">
                    <h3 className="text-lg font-semibold text-green-800">Encounter Created Successfully!</h3>
                    <div className="text-green-700 mt-2">
                        <p className="text-lg">
                            <strong>Encounter ID:</strong> {createdEncounter.localEncounterValue || createdEncounter.id}
                        </p>
                        {createdEncounter.localEncounterValue && createdEncounter.id !== createdEncounter.localEncounterValue && (
                            <p className="text-sm mt-1 text-green-600">
                                <strong>System ID:</strong> {createdEncounter.id}
                            </p>
                        )}
                    </div>
                </div>
            )}
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-800">Patient Information</h3>
                <p className="text-gray-600 mt-2"><strong>Name:</strong> {patient.firstName} {patient.lastName}</p>
                <p className="text-gray-600"><strong>MRN:</strong> {patient.localMrnValue}</p>
                <p className="text-gray-600"><strong>DOB:</strong> {new Date(patient.dateOfBirth).toLocaleDateString()}</p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="start-time" className="block text-sm font-medium text-gray-700">Encounter Start Time</label>
                        <input
                            type="datetime-local"
                            id="start-time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="ref-doctor" className="block text-sm font-medium text-gray-700">
                            Referring Doctor <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="ref-doctor"
                            value={referenceDoctor}
                            onChange={(e) => setReferenceDoctor(e.target.value)}
                            className={`mt-1 w-full px-3 py-2 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 ${
                                referenceDoctor.trim() === '' ? 'border-red-300' : 'border-gray-300'
                            }`}
                            required
                            placeholder="Enter referring doctor's name"
                        />
                        {referenceDoctor.trim() === '' && (
                            <p className="mt-1 text-sm text-red-600">Referring doctor is required</p>
                        )}
                    </div>
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                        <select
                            id="status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="PLANNED">Planned</option>
                            <option value="ARRIVED">Arrived</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="FINISHED">Finished</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="encounter-class" className="block text-sm font-medium text-gray-700">Encounter Class</label>
                        <select
                            id="encounter-class"
                            value={encounterClass}
                            onChange={(e) => setEncounterClass(e.target.value)}
                            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="AMB">Ambulatory</option>
                            <option value="IMP">Inpatient</option>
                            <option value="EMER">Emergency</option>
                        </select>
                    </div>

                </div>
                <div className="mt-8 flex justify-end">
                    <button
                        type="submit"
                        className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75"
                    >
                        Create Encounter
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Encounter;