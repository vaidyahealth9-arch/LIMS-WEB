import React from 'react';
import type { Encounter } from '../types';

interface PatientInfoProps {
  encounter: Encounter;
}

export const PatientInfo: React.FC<PatientInfoProps> = ({ encounter }) => {
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Test Report</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p><strong>Name:</strong> {encounter.patientName}</p>
          <p><strong>Age/Gender:</strong> {encounter.patientAge} / {encounter.patientGender}</p>
          <p><strong>Registration ID:</strong> {encounter.localEncounterValue}</p>
        </div>
        <div>
          <p><strong>Registered on:</strong> {formatDate(encounter.date)}</p>
          <p><strong>Collected on:</strong> {formatDate(encounter.collectionDate)}</p>
          <p><strong>Printed on:</strong> {formatDate(new Date())}</p>
          <p><strong>Sample Type:</strong> {encounter.sampleType}</p>
        </div>
      </div>
    </div>
  );
};
