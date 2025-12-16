import React from 'react';
import type { Observation } from '../types';

interface TestResultTableProps {
  testName: string;
  observations: Observation[];
}

export const TestResultTable: React.FC<TestResultTableProps> = ({ testName, observations }) => {
  return (
    <div>
      <h3 className="text-lg font-bold text-gray-800 mb-4">{testName}</h3>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Analyte Name</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {observations.map((obs) => (
            <tr key={obs.analyteId}>
              <td className="px-4 py-3 text-sm">{obs.analyteName}</td>
              <td className="px-4 py-3 text-sm">{obs.valueString || obs.valueNumeric}</td>
              <td className="px-4 py-3 text-sm">{obs.unit}</td>
              <td className="px-4 py-3 text-sm">{obs.referenceRange}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4">
        <h4 className="font-bold">Interpretation / Comments:</h4>
        <ul className="list-disc list-inside">
          {observations.map((obs) => (
            obs.interpretation && <li key={obs.analyteId}>{obs.interpretation}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};
