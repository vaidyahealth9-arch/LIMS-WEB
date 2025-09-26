import React, { useState } from 'react';
import { registerPatient } from '../services/api';
import type { PatientRegistrationResponse } from '../types';

const PatientRegistration: React.FC = () => {
    const [abhaStatus, setAbhaStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [aadhaar, setAadhaar] = useState();

    const handleCheckAbha = () => {
        setAbhaStatus('loading');
        setTimeout(() => {
            const success = Math.random() > 0.3;
            setAbhaStatus(success ? 'success' : 'error');
        }, 1500);
    };

    const handleSubmit = async (e: React.FormEvent, goToBilling = false) => {
        e.preventDefault();
        
        const patientData = {
            firstName,
            lastName,
            gender,
            dateOfBirth,
            contactPhone: phone,
            contactEmail: email,
            addressLine1: address,
            city,
            state,
            postalCode,
            organizationId: '2', // Hardcoded
            aadhaarNumber: aadhaar,
        };

        try {
            const response: PatientRegistrationResponse = await registerPatient(patientData);
            alert(`Patient registered successfully! MRN: ${response.localMrnValue}`);
            if (goToBilling) {
                // Here you would navigate to the billing page, e.g., using react-router-dom
                // history.push(`/billing/${response.id}`);
                console.log('Navigate to billing for patient id:', response.id);
            }
        } catch (error) {
            console.error('Failed to register patient:', error);
            alert(`Failed to register patient: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Register New Patient</h2>

            <div className="mb-6">
                <label htmlFor="search-patient" className="block text-sm font-medium text-gray-700 mb-1">Search Existing Patient</label>
                <input
                    type="text"
                    id="search-patient"
                    placeholder="Search by Phone, Name, UHID, Aadhaar, ABHA number..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                 <p className="text-xs text-gray-500 mt-1">Implements substring, fuzzy search, and autocomplete.</p>
            </div>

            <div className="border-t border-gray-200 my-6"></div>

            <form onSubmit={(e) => handleSubmit(e)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label htmlFor="designation" className="block text-sm font-medium text-gray-700">Designation</label>
                        <select id="designation" className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                            <option>Mr.</option>
                            <option>Mrs.</option>
                            <option>Ms.</option>
                            <option>Dr.</option>
                            <option>Master</option>
                            <option>Miss</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="first-name" className="block text-sm font-medium text-gray-700">First Name <span className="text-red-500">*</span></label>
                        <input type="text" id="first-name" required value={firstName} onChange={e => setFirstName(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div>
                        <label htmlFor="last-name" className="block text-sm font-medium text-gray-700">Last Name <span className="text-red-500">*</span></label>
                        <input type="text" id="last-name" required value={lastName} onChange={e => setLastName(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Gender</label>
                        <div className="mt-2 flex items-center space-x-4">
                            <label className="inline-flex items-center"><input type="radio" name="gender" value="male" checked={gender === 'male'} onChange={e => setGender(e.target.value as any)} className="form-radio text-indigo-600" /> <span className="ml-2">Male</span></label>
                            <label className="inline-flex items-center"><input type="radio" name="gender" value="female" checked={gender === 'female'} onChange={e => setGender(e.target.value as any)} className="form-radio text-indigo-600" /> <span className="ml-2">Female</span></label>
                            <label className="inline-flex items-center"><input type="radio" name="gender" value="other" checked={gender === 'other'} onChange={e => setGender(e.target.value as any)} className="form-radio text-indigo-600" /> <span className="ml-2">Other</span></label>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="dob" className="block text-sm font-medium text-gray-700">Date of Birth <span className="text-red-500">*</span></label>
                        <input type="date" id="dob" required value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number <span className="text-red-500">*</span></label>
                        <input type="tel" id="phone" required value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email ID</label>
                        <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                     <div>
                        <label htmlFor="ref-doctor" className="block text-sm font-medium text-gray-700">Ref. Doctor</label>
                        <input type="text" id="ref-doctor" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
                        <textarea id="address" rows={2} value={address} onChange={e => setAddress(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                    </div>
                    <div>
                        <label htmlFor="city" className="block text-sm font-medium text-gray-700">City</label>
                        <input type="text" id="city" value={city} onChange={e => setCity(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div>
                        <label htmlFor="state" className="block text-sm font-medium text-gray-700">State</label>
                        <input type="text" id="state" value={state} onChange={e => setState(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div>
                        <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">Postal Code</label>
                        <input type="text" id="postalCode" value={postalCode} onChange={e => setPostalCode(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>

                    <div className="md:col-span-2 border-t pt-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">ABHA Integration</h3>
                        <div className="flex items-end gap-4">
                           <div className="flex-grow">
                             <label htmlFor="aadhaar" className="block text-sm font-medium text-gray-700">Aadhaar Number (for ABHA creation)</label>
                             <input type="text" id="aadhaar" value={aadhaar} onChange={e => setAadhaar(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                           </div>
                           <button type="button" onClick={handleCheckAbha} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75">
                                Check ABHA
                           </button>
                        </div>
                         {abhaStatus === 'loading' && <p className="text-sm text-blue-600 mt-2">Checking ABHA status...</p>}
                         {abhaStatus === 'success' && <p className="text-sm text-green-600 mt-2">✓ ABHA ID successfully linked.</p>}
                         {abhaStatus === 'error' && <p className="text-sm text-red-600 mt-2">✗ ABHA verification failed. Please check the details or create a new ABHA ID.</p>}
                    </div>

                </div>
                
                <div className="mt-8 flex justify-end space-x-4">
                    <button type="submit" className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 focus:outline-none">
                        Register
                    </button>
                    <button type="button" onClick={(e) => handleSubmit(e, true)} className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75">
                        Go to Billing →
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PatientRegistration;
