import React from 'react';

interface StepperProps {
    status: string;
    hasTests?: boolean;
    billStatus?: string;
    currentStep?: number;
}

const steps = [
    { id: 'registration', label: 'Registration' },
    { id: 'ordering', label: 'Ordering' },
    { id: 'billing', label: 'Billing' },
    { id: 'in-lab', label: 'In-Lab' },
    { id: 'verification', label: 'Verification' },
    { id: 'report', label: 'Report' }
];

export const WorkflowStepper: React.FC<StepperProps> = ({ status, hasTests, billStatus }) => {
    const normalizedStatus = String(status || '')
        .toUpperCase()
        .replace(/-/g, '_')
        .replace(/\s+/g, '_');

    const isWorkflowComplete = normalizedStatus === 'APPROVED' || normalizedStatus === 'COMPLETED';

    let activeStep = 0; 
    if (hasTests) activeStep = 1; 
    if (billStatus === 'DUE' || billStatus === 'PARTIALLY_PAID') activeStep = 2; 
    if (billStatus === 'PAID') activeStep = 3; 
    if (normalizedStatus === 'IN_PROGRESS') activeStep = 3; 
    if (normalizedStatus === 'PENDING_VERIFICATION') activeStep = 4; 
    if (normalizedStatus === 'APPROVED' || normalizedStatus === 'COMPLETED') activeStep = 5; 

    return (
        <div className="w-full py-6">
            <div className="flex items-center w-full">
                {steps.map((step, index) => {
                    const isCompleted = isWorkflowComplete ? index <= activeStep : index < activeStep;
                    const isActive = !isWorkflowComplete && index === activeStep;
                    
                    return (
                        <React.Fragment key={step.id}>
                            {/* Step Circle */}
                            <div className="flex flex-col items-center relative min-w-[40px]">
                                <div 
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold z-10 transition-all duration-500 ${
                                        isCompleted 
                                            ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-200/50' 
                                            : isActive 
                                                ? 'bg-white border-2 border-cyan-500 text-cyan-600 scale-110 shadow-lg ring-4 ring-cyan-50' 
                                                : 'bg-white border-2 border-slate-200 text-slate-400'
                                    }`}
                                >
                                    {isCompleted ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        index + 1
                                    )}
                                </div>
                                <span 
                                    className={`absolute -bottom-5 text-[8px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors duration-300 ${
                                        isActive ? 'text-cyan-700' : isCompleted ? 'text-teal-600' : 'text-slate-400'
                                    }`}
                                >
                                    {step.label}
                                </span>
                            </div>

                            {/* Connector Line */}
                            {index < steps.length - 1 && (
                                <div className="flex-1 h-[2px] mx-1 bg-slate-100 relative -translate-y-2.5">
                                    <div 
                                        className={`absolute inset-0 bg-gradient-to-r from-cyan-400 to-teal-400 transition-all duration-700 ease-in-out`}
                                        style={{ width: isCompleted ? '100%' : '0%' }}
                                    ></div>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};
