import React from 'react';
import type { Encounter, Observation } from '../types';
import { ReportHeader } from './ReportHeader';
import { PatientInfo } from './PatientInfo';
import { TestResultTable } from './TestResultTable';

interface TestReportProps {
  encounter: Encounter | null;
  observations: Observation[];
  withHeader: boolean;
}

export const TestReport: React.FC<TestReportProps> = ({ encounter, observations, withHeader }) => {
  if (!encounter) {
    return null;
  }

  const groupedObservations = observations.reduce((acc, obs) => {
    const key = obs.testName;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(obs);
    return acc;
  }, {} as Record<string, Observation[]>);

  return (
    <div className="bg-white p-8">
      {Object.entries(groupedObservations).map(([testName, obs]) => (
        <div key={testName} className="page-break">
          {withHeader && <ReportHeader />}
          <PatientInfo encounter={encounter} />
          <TestResultTable testName={testName} observations={obs} />
        </div>
      ))}
    </div>
  );
};
