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
        <div className="container mx-auto px-4 py-6">
            {/* Header */}
            <div className="mb-6 p-6 rounded-xl" style={{ background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)' }}>
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-1">
                            {selectedPatient ? 'Update Patient Information' : 'Register New Patient'}
                        </h2>
                        <p className="text-cyan-50 text-sm">
                            {selectedPatient ? 'Update existing patient details' : 'Add a new patient to the system'}
                        </p>
                    </div>
                    <button 
                        onClick={clearForm} 
                        className="px-5 py-2.5 text-sm font-semibold text-white bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all duration-200 border border-white/30"
                    >
                        Clear Form
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                {/* Search Section */}
                <div className="mb-6 relative">
                    <label htmlFor="search-patient" className="block text-sm font-semibold text-gray-700 mb-2">Search Existing Patient</label>
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                id="search-patient"
                                placeholder="Search by Phone, Name, UHID, Aadhaar, ABHA number..."
                                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <button
                                type="button"
                                onClick={() => handleFilterChange('all')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                                    searchFilter === 'all'
                                        ? 'bg-gradient-to-r from-cyan-500 to-teal-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                All
                            </button>
                            <button
                                type="button"
                                onClick={() => handleFilterChange('name')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                                    searchFilter === 'name'
                                        ? 'bg-gradient-to-r from-cyan-500 to-teal-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Name
                            </button>
                            <button
                                type="button"
                                onClick={() => handleFilterChange('phone')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                                    searchFilter === 'phone'
                                        ? 'bg-gradient-to-r from-cyan-500 to-teal-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Phone
                            </button>
                            <button
                                type="button"
                                onClick={() => handleFilterChange('uhid')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                                    searchFilter === 'uhid'
                                        ? 'bg-gradient-to-r from-cyan-500 to-teal-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                UHID
                            </button>
                            <button
                                type="button"
                                onClick={() => handleFilterChange('aadhaar')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                                    searchFilter === 'aadhaar'
                                        ? 'bg-gradient-to-r from-cyan-500 to-teal-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Aadhaar
                            </button>
                            <button
                                type="button"
                                onClick={() => handleFilterChange('abha')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                                    searchFilter === 'abha'
                                        ? 'bg-gradient-to-r from-cyan-500 to-teal-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                ABHA
                            </button>
                        </div>
                    </div>
                {searchError && (
                    <p className="text-sm text-red-600 mt-2 font-medium">{searchError}</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                    Use ↑↓ keys to navigate results, Enter to select, Esc to clear
                </p>
                {searchHistory.length > 0 && !searchResults.length && searchQuery.length < 2 && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Recent Searches</p>
                        <div className="flex flex-wrap gap-2">
                            {searchHistory.map((history, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleHistoryItemClick(history)}
                                    className="px-3 py-1.5 text-sm bg-white border border-gray-200 text-gray-700 rounded-lg hover:border-cyan-400 hover:bg-cyan-50 transition-colors flex items-center gap-1"
                                >
                                    <span>{history.query}</span>
                                    <span className="text-xs text-gray-500">({history.filter})</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                 {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border-2 border-cyan-200 rounded-xl mt-1 shadow-xl">
                        <ul className="max-h-60 overflow-y-auto">
                            {searchResults.map((patient, index) => (
                                <li 
                                    key={patient.id} 
                                    className={`px-4 py-3 cursor-pointer transition-colors ${
                                        index === selectedResultIndex 
                                            ? 'bg-gradient-to-r from-cyan-50 to-teal-50 border-l-4 border-cyan-500' 
                                            : 'hover:bg-cyan-50/50'
                                    }`}
                                    onClick={() => handlePatientSelect(patient)}
                                    onMouseEnter={() => setSelectedResultIndex(index)}
                                >
                                    <p className="font-semibold text-gray-800">{patient.firstName} {patient.lastName}</p>
                                    <p className="text-sm text-gray-600 mt-1">
                                        <span className="inline-block mr-4">📋 MRN: {patient.localMrnValue}</span>
                                        {patient.contactPhone && (
                                            <span className="inline-block mr-4">📞 {patient.contactPhone}</span>
                                        )}
                                        {patient.contactEmail && (
                                            <span className="inline-block">✉️ {patient.contactEmail}</span>
                                        )}
                                    </p>
                                </li>
                            ))}
                        </ul>
                        {totalPages > 1 && (
                            <div className="flex justify-between items-center p-3 border-t-2 border-gray-100 bg-gray-50">
                                <button
                                    onClick={handlePreviousPage}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 text-sm font-semibold text-cyan-700 bg-white border border-cyan-200 rounded-lg hover:bg-cyan-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Previous
                                </button>
                                <span className="text-sm font-medium text-gray-600">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={handleNextPage}
                                    disabled={currentPage === totalPages}
                                    className="px-4 py-2 text-sm font-semibold text-cyan-700 bg-white border border-cyan-200 rounded-lg hover:bg-cyan-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="border-t-2 border-gray-100 my-6"></div>

            <form onSubmit={(e) => handleSubmit(e)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                     <div>
                        <label htmlFor="designation" className="block text-sm font-semibold text-gray-700 mb-1">Designation</label>
                        <select id="designation" className="mt-1 block w-full py-2.5 px-3 border-2 border-gray-200 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors">
                            <option>Mr.</option>
                            <option>Mrs.</option>
                            <option>Ms.</option>
                            <option>Dr.</option>
                            <option>Master</option>
                            <option>Miss</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="first-name" className="block text-sm font-semibold text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                        <input type="text" id="first-name" required value={firstName} onChange={e => setFirstName(e.target.value)} className="mt-1 w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors" />
                    </div>
                    <div>
                        <label htmlFor="last-name" className="block text-sm font-semibold text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                        <input type="text" id="last-name" required value={lastName} onChange={e => setLastName(e.target.value)} className="mt-1 w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                        <div className="mt-2 flex items-center space-x-4">
                            <label className="inline-flex items-center"><input type="radio" name="gender" value="male" checked={gender === 'male'} onChange={e => setGender(e.target.value as any)} className="form-radio text-cyan-600 focus:ring-cyan-500" /> <span className="ml-2 text-gray-700">Male</span></label>
                            <label className="inline-flex items-center"><input type="radio" name="gender" value="female" checked={gender === 'female'} onChange={e => setGender(e.target.value as any)} className="form-radio text-cyan-600 focus:ring-cyan-500" /> <span className="ml-2 text-gray-700">Female</span></label>
                            <label className="inline-flex items-center"><input type="radio" name="gender" value="other" checked={gender === 'other'} onChange={e => setGender(e.target.value as any)} className="form-radio text-cyan-600 focus:ring-cyan-500" /> <span className="ml-2 text-gray-700">Other</span></label>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="dob" className="block text-sm font-semibold text-gray-700 mb-1">Date of Birth <span className="text-red-500">*</span></label>
                        <input type="date" id="dob" required value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} className="mt-1 w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors" />
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                        <input type="tel" id="phone" required value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors" />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">Email ID <span className="text-red-500">*</span></label>
                        <input type="email" id="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors" />
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="address" className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
                        <textarea id="address" rows={2} value={address} onChange={e => setAddress(e.target.value)} className="mt-1 w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"></textarea>
                    </div>
                    <div>
                        <label htmlFor="city" className="block text-sm font-semibold text-gray-700 mb-1">City</label>
                        <input type="text" id="city" value={city} onChange={e => setCity(e.target.value)} className="mt-1 w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors" />
                    </div>
                    <div>
                        <label htmlFor="state" className="block text-sm font-semibold text-gray-700 mb-1">State</label>
                        <input type="text" id="state" value={state} onChange={e => setState(e.target.value)} className="mt-1 w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors" />
                    </div>
                    <div>
                        <label htmlFor="postalCode" className="block text-sm font-semibold text-gray-700 mb-1">Postal Code</label>
                        <input type="text" id="postalCode" value={postalCode} onChange={e => setPostalCode(e.target.value)} className="mt-1 w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors" />
                    </div>

                    <div className="md:col-span-2 border-t-2 border-gray-100 pt-6 mt-2">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-teal-500 rounded-full"></div>
                            <h3 className="text-lg font-bold text-gray-800">ABHA Integration</h3>
                        </div>
                        <div className="flex items-end gap-4">
                           <div className="flex-grow">
                             <label htmlFor="aadhaar" className="block text-sm font-semibold text-gray-700 mb-1">Aadhaar Number (for ABHA creation)</label>
                             <input type="text" id="aadhaar" value={aadhaar} onChange={e => setAadhaar(e.target.value)} className="mt-1 w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors" />
                           </div>
                           <button 
                                type="button" 
                                onClick={handleCheckAbha} 
                                className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-cyan-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all duration-200"
                           >
                                Check ABHA
                           </button>
                        </div>
                         {abhaStatus === 'loading' && <p className="text-sm text-cyan-600 mt-3 font-medium">🔄 Checking ABHA status...</p>}
                         {abhaStatus === 'success' && <p className="text-sm text-emerald-600 mt-3 font-medium">✓ ABHA ID successfully linked.</p>}
                         {abhaStatus === 'error' && <p className="text-sm text-red-600 mt-3 font-medium">✗ ABHA verification failed. Please check the details or create a new ABHA ID.</p>}
                    </div>

                </div>
                
                <div className="mt-8 flex justify-end space-x-4">
                    <button 
                        type="submit" 
                        className="px-6 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all duration-200"
                    >
                        {selectedPatient ? 'Update' : 'Register'}
                    </button>
                    <button 
                        type="button" 
                        onClick={(e) => handleSubmit(e, true)} 
                        className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-cyan-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all duration-200 flex items-center gap-2"
                    >
                        {selectedPatient ? 'Update & Create Encounter' : 'Register & Create Encounter'}
                        <span>→</span>
                    </button>
                </div>
            </form>
            </div>
        </div>
    );
};

export default PatientRegistration;