import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getObservationsForServiceRequest, updateObservation, getEncounterById } from '../services/api';
import { useNotifications } from '../services/NotificationContext';
import { TestReport } from '../components/TestReport';
import type { Encounter } from '../types';

const ViewObservations: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { addNotification } = useNotifications();
    const serviceRequest = location.state?.serviceRequest;

    const [observations, setObservations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [encounter, setEncounter] = useState<Encounter | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const [printWithHeader, setPrintWithHeader] = useState(true);

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

    useEffect(() => {
        const fetchEncounterDetails = async () => {
            if (serviceRequest && serviceRequest.encounterId) {
                try {
                    const enc = await getEncounterById(serviceRequest.encounterId.toString());
                    setEncounter(enc);
                } catch (error) {
                    console.error("Failed to fetch encounter details", error);
                    addNotification({
                        type: 'error',
                        title: 'Failed to Fetch Encounter Details',
                        message: 'Could not load encounter details for printing.',
                        persist: true,
                    });
                }
            }
        };
        fetchEncounterDetails();
    }, [serviceRequest, addNotification]);

    const handleValueChange = (index: number, value: string) => {
        const newObservations = [...observations];
        newObservations[index].valueNumeric = parseFloat(value);
        setObservations(newObservations);
    };

    const toggleEditMode = (index: number) => {
        const newObservations = [...observations];
        newObservations[index].isEditing = !newObservations[index].isEditing;
        setObservations(newObservations);
    };

    const handlePrint = (withHeader: boolean) => {
        if (observations.length > 0 && encounter) {
            setPrintWithHeader(withHeader);
            setIsPrinting(true);
        } else {
            addNotification({
                type: 'info',
                title: 'No Data',
                message: 'No observations available to print.',
            });
        }
    };

    useEffect(() => {
        if (isPrinting) {
            setTimeout(() => {
                const printContent = document.getElementById('printable-report')?.innerHTML;
                if (printContent) {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                        printWindow.document.write(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <title>Test Report</title>
                                <script src="https://cdn.tailwindcss.com"></script>
                                <style>
                                    @page { size: A4; margin: 1cm; }
                                    body { margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
                                    .page-break { page-break-before: always; }
                                    @media print {
                                        .print-hide { display: none !important; }
                                        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                                    }
                                </style>
                            </head>
                            <body>
                                ${printContent}
                                <script>
                                    window.onload = function() {
                                        setTimeout(function() {
                                            window.print();
                                            window.onafterprint = function() {
                                                window.close();
                                            };
                                        }, 250);
                                    };
                                </script>
                            </body>
                            </html>
                        `);
                        printWindow.document.close();
                    }
                }
                setIsPrinting(false);
            }, 100);
        }
    }, [isPrinting, observations, encounter, printWithHeader]);

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
                                            type="number"
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
                    <button
                        onClick={() => handlePrint(true)}
                        className="ml-4 px-8 py-3 bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg"
                    >
                        Print with Header
                    </button>
                    <button
                        onClick={() => handlePrint(false)}
                        className="ml-4 px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg"
                    >
                        Print without Header
                    </button>
                </div>
            </div>
            {isPrinting && encounter && (
                <div id="printable-report" style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '210mm' }}>
                    <TestReport encounter={encounter} observations={observations} withHeader={printWithHeader} />
                </div>
            )}
        </div>
    );
};

export default ViewObservations;
