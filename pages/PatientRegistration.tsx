import React, { useState, useEffect, useCallback, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerPatient, searchPatients } from '../services/api';
import type { PatientRegistrationResponse } from '../types';
import debounce from 'lodash/debounce';

type SearchFilter = 'all' | 'name' | 'phone' | 'uhid' | 'aadhaar' | 'abha';

interface SearchHistory {
    query: string;
    filter: SearchFilter;
    timestamp: number;
}

const PatientRegistration: React.FC = () => {
    const navigate = useNavigate();
    const [abhaStatus, setAbhaStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [gender, setGender] = useState<'male' | 'female' | 'other' | '' > ('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [aadhaar, setAadhaar] = useState('');

    const [searchQuery, setSearchQuery] = useState('');
    const [searchFilter, setSearchFilter] = useState<SearchFilter>('all');
    const [searchResults, setSearchResults] = useState<PatientRegistrationResponse[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<PatientRegistrationResponse | null>(null);
    const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
    const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
    const [searchError, setSearchError] = useState<string | null>(null);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const pageSize = 5;

    // Load search history from localStorage on component mount
    useEffect(() => {
        const savedHistory = localStorage.getItem('patientSearchHistory');
        if (savedHistory) {
            setSearchHistory(JSON.parse(savedHistory));
        }
    }, []);

    // Save search history to localStorage when it changes
    useEffect(() => {
        if (searchHistory.length > 0) {
            localStorage.setItem('patientSearchHistory', JSON.stringify(searchHistory.slice(0, 10)));
        }
    }, [searchHistory]);

    const handleCheckAbha = () => {
        setAbhaStatus('loading');
        setTimeout(() => {
            const success = Math.random() > 0.3;
            setAbhaStatus(success ? 'success' : 'error');
        }, 1500);
    };

    const clearForm = () => {
        setFirstName('');
        setLastName('');
        setGender('');
        setDateOfBirth('');
        setPhone('');
        setEmail('');
        setAddress('');
        setCity('');
        setState('');
        setPostalCode('');
        setAadhaar('');
        setSelectedPatient(null);
        setSearchQuery('');
        setSearchResults([]);
        setCurrentPage(1);
        setTotalPages(0);
    };

    const handlePatientSelect = (patient: PatientRegistrationResponse) => {
        setSelectedPatient(patient);
        setFirstName(patient.firstName);
        setLastName(patient.lastName);
        setGender(patient.gender as any);
        setDateOfBirth(patient.dateOfBirth ? patient.dateOfBirth.split('T')[0] : '');
        setPhone(patient.contactPhone || '');
        setEmail(patient.contactEmail || '');
        setAddress(patient.addressLine1 || '');
        setCity(patient.city || '');
        setState(patient.state || '');
        setPostalCode(patient.postalCode || '');
        setAadhaar('');
        setSearchResults([]);
        setTotalPages(0);
        setSearchQuery(`${patient.firstName} ${patient.lastName} (${patient.localMrnValue})`);
    };

    const performSearch = async (query: string, filter: SearchFilter, page: number) => {
        if (query.length < 2) {  // Reduced minimum length to 2 characters
            setSearchResults([]);
            setTotalPages(0);
            setSearchError(null);
            return;
        }
        setIsSearching(true);
        setSearchError(null);
        
        try {
            const orgId = localStorage.getItem('organizationId');
            if (!orgId) {
                throw new Error('Organization ID not found');
            }

            // Add filter to query params
            const queryParams = new URLSearchParams({
                query,
                filter,
                page: String(page - 1),
                size: String(pageSize)
            });

            const response = await searchPatients(orgId, query, page - 1, pageSize);
            
            // Add to search history
            const newHistoryEntry = {
                query,
                filter,
                timestamp: Date.now()
            };
            setSearchHistory(prev => [newHistoryEntry, ...prev.filter(h => 
                h.query !== query || h.filter !== filter
            ).slice(0, 9)]);

            setSearchResults(response.content);
            setTotalPages(response.totalPages);
            setCurrentPage(page);
            setSelectedResultIndex(-1);
        } catch (error) {
            console.error('Patient search failed:', error);
            setSearchResults([]);
            setTotalPages(0);
            setSearchError(error instanceof Error ? error.message : 'Search failed. Please try again.');
        } finally {
            setIsSearching(false);
        }
    };

    // Debounced search function
    const debouncedSearch = useCallback(
        debounce((query: string, filter: SearchFilter) => {
            performSearch(query, filter, 1);
        }, 300),
        []
    );

    // Handle keyboard navigation
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (searchResults.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedResultIndex(prev => 
                    prev < searchResults.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedResultIndex(prev => prev > 0 ? prev - 1 : -1);
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedResultIndex >= 0 && searchResults[selectedResultIndex]) {
                    handlePatientSelect(searchResults[selectedResultIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setSearchResults([]);
                setSelectedResultIndex(-1);
                break;
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        debouncedSearch(e.target.value, searchFilter);
    };

    const handleFilterChange = (filter: SearchFilter) => {
        setSearchFilter(filter);
        if (searchQuery.length >= 2) {
            debouncedSearch(searchQuery, filter);
        }
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            performSearch(searchQuery, searchFilter, currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            performSearch(searchQuery, searchFilter, currentPage + 1);
        }
    };

    const handleHistoryItemClick = (historyItem: SearchHistory) => {
        setSearchQuery(historyItem.query);
        setSearchFilter(historyItem.filter);
        performSearch(historyItem.query, historyItem.filter, 1);
    };

    const handleSubmit = async (e: React.FormEvent, goToEncounter = false) => {
        e.preventDefault();
        
        if (selectedPatient) {
            if (goToEncounter) {
                console.log('Navigate to encounter for existing patient id:', selectedPatient.id);
                navigate('/encounter', { state: { patient: selectedPatient } });
            }
            return;
        }

        const orgId = localStorage.getItem('organizationId');
        if (!orgId) {
            alert('Organization ID not found. Please log in again.');
            return;
        }

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
            organizationId: orgId,
            aadhaarNumber: aadhaar,
        };

        try {
            const response: PatientRegistrationResponse = await registerPatient(patientData);
            alert(`Patient registered successfully! MRN: ${response.localMrnValue}`);
            if (goToEncounter) {
                console.log('Navigate to encounter for patient id:', response.id);
                navigate('/encounter', { state: { patient: response } });
            }
            clearForm();
        } catch (error) {
            console.error('Failed to register patient:', error);
            alert(`Failed to register patient: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">{selectedPatient ? 'Update Patient Information' : 'Register New Patient'}</h2>
                <button onClick={clearForm} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none">
                    Clear Form
                </button>
            </div>

            <div className="mb-6 relative">
                <label htmlFor="search-patient" className="block text-sm font-medium text-gray-700 mb-1">Search Existing Patient</label>
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            id="search-patient"
                            placeholder="Search by Phone, Name, UHID, Aadhaar, ABHA number..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() => handleFilterChange('all')}
                            className={`px-3 py-1 text-sm rounded-full ${
                                searchFilter === 'all'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            All
                        </button>
                        <button
                            type="button"
                            onClick={() => handleFilterChange('name')}
                            className={`px-3 py-1 text-sm rounded-full ${
                                searchFilter === 'name'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Name
                        </button>
                        <button
                            type="button"
                            onClick={() => handleFilterChange('phone')}
                            className={`px-3 py-1 text-sm rounded-full ${
                                searchFilter === 'phone'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Phone
                        </button>
                        <button
                            type="button"
                            onClick={() => handleFilterChange('uhid')}
                            className={`px-3 py-1 text-sm rounded-full ${
                                searchFilter === 'uhid'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            UHID
                        </button>
                        <button
                            type="button"
                            onClick={() => handleFilterChange('aadhaar')}
                            className={`px-3 py-1 text-sm rounded-full ${
                                searchFilter === 'aadhaar'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Aadhaar
                        </button>
                        <button
                            type="button"
                            onClick={() => handleFilterChange('abha')}
                            className={`px-3 py-1 text-sm rounded-full ${
                                searchFilter === 'abha'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            ABHA
                        </button>
                    </div>
                </div>
                {searchError && (
                    <p className="text-sm text-red-600 mt-1">{searchError}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                    Use ↑↓ keys to navigate results, Enter to select, Esc to clear
                </p>
                {searchHistory.length > 0 && !searchResults.length && searchQuery.length < 2 && (
                    <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700 mb-1">Recent Searches</p>
                        <div className="flex flex-wrap gap-2">
                            {searchHistory.map((history, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleHistoryItemClick(history)}
                                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 flex items-center gap-1"
                                >
                                    <span>{history.query}</span>
                                    <span className="text-xs text-gray-500">({history.filter})</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                 {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 shadow-lg">
                        <ul className="max-h-60 overflow-y-auto">
                            {searchResults.map((patient, index) => (
                                <li 
                                    key={patient.id} 
                                    className={`px-4 py-3 cursor-pointer ${
                                        index === selectedResultIndex 
                                            ? 'bg-indigo-100 border-l-4 border-indigo-600' 
                                            : 'hover:bg-indigo-50'
                                    }`}
                                    onClick={() => handlePatientSelect(patient)}
                                    onMouseEnter={() => setSelectedResultIndex(index)}
                                >
                                    <p className="font-semibold text-gray-800">{patient.firstName} {patient.lastName}</p>
                                    <p className="text-sm text-gray-600">
                                        <span className="inline-block mr-3">MRN: {patient.localMrnValue}</span>
                                        {patient.contactPhone && (
                                            <span className="inline-block mr-3">Phone: {patient.contactPhone}</span>
                                        )}
                                        {patient.contactEmail && (
                                            <span className="inline-block">Email: {patient.contactEmail}</span>
                                        )}
                                    </p>
                                </li>
                            ))}
                        </ul>
                        {totalPages > 1 && (
                            <div className="flex justify-between items-center p-2 border-t border-gray-200">
                                <button
                                    onClick={handlePreviousPage}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <span className="text-sm text-gray-600">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={handleNextPage}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                )}
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
                                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email ID <span className="text-red-500">*</span></label>
                                            <input type="email" id="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
                                            <textarea id="address" rows={2} value={address} onChange={e => setAddress(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                                        </div>                    <div>
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
                        {selectedPatient ? 'Update' : 'Register'}
                    </button>
                    <button type="button" onClick={(e) => handleSubmit(e, true)} className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75">
                        {selectedPatient ? 'Update & Create Encounter' : 'Register & Create Encounter'} →
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PatientRegistration;