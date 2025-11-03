import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getObservationsForServiceRequest, updateObservation } from '../services/api'; // Assuming updateObservation exists
import { useNotifications } from '../services/NotificationContext';

const ViewObservations: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { addNotification } = useNotifications();
    const serviceRequest = location.state?.serviceRequest;

    const [observations, setObservations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchObservations = async () => {
            if (serviceRequest && serviceRequest.id) {
                setIsLoading(true);
                try {
                    const fetchedObservations = await getObservationsForServiceRequest(serviceRequest.id.toString());
                    const formattedObservations = fetchedObservations.map(obs => ({
                        ...obs,
                        isEditing: false,
                    }));
                    setObservations(formattedObservations);
                } catch (error) {
                    addNotification({
                        type: 'error',
                        title: 'Failed to Fetch Observations',
                        message: 'Could not load observations for this service request.',
                        persist: true,
                    });
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchObservations();
    }, [serviceRequest, addNotification]);

    const handleValueChange = (index: number, value: string) => {
        const newObservations = [...observations];
        newObservations[index].valueNumeric = parseFloat(value); // Assuming numeric input
        setObservations(newObservations);
    };

    const toggleEditMode = (index: number) => {
        const newObservations = [...observations];
        newObservations[index].isEditing = !newObservations[index].isEditing;
        setObservations(newObservations);
    };

    const handleSave = async (index: number) => {
        const observation = observations[index];
        setIsLoading(true);
        try {
            const observationData = {
                valueNumeric: observation.valueNumeric,
                valueString: observation.valueString,
                valueCode: observation.valueCode,
                valueCodeSystem: observation.valueCodeSystem,
                interpretationCode: observation.interpretationCode,
                interpretationSystem: observation.interpretationSystem,
                effectiveDateTime: observation.effectiveDateTime,
            };
            await updateObservation(observation.id, observationData);

            addNotification({
                type: 'success',
                title: 'Observation Updated',
                message: `${observation.analyteName} for ${observation.testName} updated successfully.`,
                persist: false,
            });
            toggleEditMode(index);
        } catch (error) {
            addNotification({
                type: 'error',
                title: 'Update Failed',
                message: 'Failed to update observation.',
                persist: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!serviceRequest) {
        return (
            <div className="container mx-auto px-4 py-6">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl mx-auto text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">No Service Request Found</h2>
                    <p className="text-gray-600">Please go back and select a service request to view observations.</p>
                    <button
                        onClick={() => navigate('/patient-list')}
                        className="mt-4 px-8 py-3 bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg"
                    >
                        Go to Patient List
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-gray-800 mb-6">View/Edit Observations for {serviceRequest.patientName}</h2>
                <div className="space-y-4">
                    {observations.map((obs, index) => (
                        <div key={`${obs.testId}-${obs.analyteId}`} className="p-4 border rounded-lg shadow-sm bg-gray-50">
                            <div className="flex justify-between items-center">
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-800">{obs.testName}</p>
                                    <p className="text-sm text-gray-600">{obs.analyteName}</p>
                                </div>
                                <div className="flex items-center space-x-4">
                                    {obs.isEditing ? (
                                        <input
                                            type="number" // Change to number input
                                            value={obs.valueNumeric !== null ? obs.valueNumeric : ''}
                                            onChange={(e) => handleValueChange(index, e.target.value)}
                                            className="w-32 px-2 py-1 border-2 border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-cyan-500"
                                        />
                                    ) : (
                                        <p className="w-32 text-right">{obs.valueNumeric !== null ? `${obs.valueNumeric} ${obs.unitName}` : 'No value'}</p>
                                    )}
                                    <div className="w-24">
                                        {obs.isEditing ? (
                                            <button onClick={() => handleSave(index)} disabled={isLoading} className="px-4 py-1 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 disabled:opacity-50">
                                                {isLoading ? 'Saving...' : 'Save'}
                                            </button>
                                        ) : (
                                            <button onClick={() => toggleEditMode(index)} className="px-4 py-1 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600">
                                                Edit
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-8 text-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-8 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-300"
                    >
                        Back
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ViewObservations;
