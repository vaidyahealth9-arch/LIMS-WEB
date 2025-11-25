import React from 'react';
import type { Encounter } from '../types';

interface PatientInfoProps {
  encounter: Encounter;
}

export const PatientInfo: React.FC<PatientInfoProps> = ({ encounter }) => {
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
          <p><strong>Registered on:</strong> {new Date(encounter.date).toLocaleString()}</p>
          <p><strong>Collected on:</strong> {new Date(encounter.collectionDate).toLocaleString()}</p>
          <p><strong>Printed on:</strong> {new Date().toLocaleString()}</p>
          <p><strong>Sample Type:</strong> {encounter.sampleType}</p>
        </div>
      </div>
    </div>
  );
};
