import React, { useState, useEffect, useCallback, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerPatient, searchPatients } from '../services/api';
import type { PatientRegistrationResponse } from '../types';
import debounce from 'lodash/debounce';
import { useNotifications } from '../services/NotificationContext';

type SearchFilter = 'all' | 'name' | 'phone' | 'uhid' | 'aadhaar' | 'abha';

interface SearchHistory {
    query: string;
    filter: SearchFilter;
    timestamp: number;
}

const PatientRegistration: React.FC = () => {
    const navigate = useNavigate();
    const { addNotification } = useNotifications();
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
        if (query.length < 2) {  
            setSearchResults([]);
            setTotalPages(0);
            setSearchError(null);
            setIsSearching(false);
            return;
        }
        setIsSearching(true);
        setSearchError(null);
        
        try {
            const orgId = localStorage.getItem('organizationId');
            if (!orgId) {
                throw new Error('Organization ID not found');
            }

            const response = await searchPatients(orgId, query, page - 1, pageSize);
            
            // Add to search history only if results found
            if (response.content.length > 0) {
                const newHistoryEntry = {
                    query,
                    filter,
                    timestamp: Date.now()
                };
                setSearchHistory(prev => [newHistoryEntry, ...prev.filter(h => 
                    h.query !== query || h.filter !== filter
                ).slice(0, 9)]);
            }

            setSearchResults(response.content);
            setTotalPages(response.totalPages);
            setCurrentPage(page);
            setSelectedResultIndex(-1);

            // Show message if no results found
            if (response.content.length === 0) {
                setSearchError('No patients found. Try adjusting your search criteria.');
            }
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
        const value = e.target.value;
        setSearchQuery(value);
        setSearchError(null); // Clear error when typing
        
        if (value.length === 0) {
            setSearchResults([]);
            setTotalPages(0);
            setIsSearching(false);
        } else if (value.length >= 2) {
            debouncedSearch(value, searchFilter);
        }
    };

    const handleFilterChange = (filter: SearchFilter) => {
        setSearchFilter(filter);
        setSearchError(null); // Clear error when changing filter
        if (searchQuery.length >= 2) {
            performSearch(searchQuery, filter, 1);
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

        // Validate all mandatory fields
        const missingFields: string[] = [];
        
        if (!firstName.trim()) missingFields.push('First Name');
        if (!lastName.trim()) missingFields.push('Last Name');
        if (!gender) missingFields.push('Gender');
        if (!dateOfBirth) missingFields.push('Date of Birth');
        if (!phone.trim()) missingFields.push('Phone Number');
        if (!email.trim()) missingFields.push('Email ID');
        if (!address.trim()) missingFields.push('Address');
        if (!city.trim()) missingFields.push('City');
        if (!state.trim()) missingFields.push('State');
        if (!postalCode.trim()) missingFields.push('Postal Code');
        // Aadhaar validation removed as ABHA is WIP

        if (missingFields.length > 0) {
            addNotification({
                type: 'error',
                title: 'Missing Required Fields',
                message: missingFields.join(', '),
                persist: false
            });
            return;
        }

        // Validate phone number is exactly 10 digits
        if (phone.length !== 10 || !/^\d{10}$/.test(phone)) {
            addNotification({
                type: 'error',
                title: 'Invalid Phone Number',
                message: 'Phone number must be exactly 10 digits',
                persist: false
            });
            return;
        }

        const orgId = localStorage.getItem('organizationId');
        if (!orgId) {
            addNotification({
                type: 'error',
                title: 'Authentication Error',
                message: 'Organization ID not found. Please log in again.',
                persist: false
            });
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
            addNotification({
                type: 'success',
                title: 'Registration Successful',
                message: `Patient registered successfully! MRN: ${response.localMrnValue}`,
                persist: true
            });
            if (goToEncounter) {
                console.log('Navigate to encounter for patient id:', response.id);
                navigate('/encounter', { state: { patient: response } });
            }
            clearForm();
        } catch (error) {
            console.error('Failed to register patient:', error);
            addNotification({
                type: 'error',
                title: 'Registration Failed',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
                persist: true
            });
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
                    <label htmlFor="search-patient" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Search Existing Patient
                    </label>
                    <div className="space-y-3">
                        <div className="relative">
                            <input
                                type="text"
                                id="search-patient"
                                placeholder="Start typing to search (minimum 2 characters)..."
                                className="w-full px-4 py-2.5 pr-10 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                onKeyDown={handleKeyDown}
                            />
                            {isSearching && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                            {searchQuery && !isSearching && (
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSearchResults([]);
                                        setSearchError(null);
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <span className="text-xs text-gray-500 self-center mr-2">Filter by:</span>
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
                    <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200 flex items-start gap-2">
                        <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <p className="text-sm text-red-800 font-semibold">{searchError}</p>
                            <p className="text-xs text-red-600 mt-1">Try using different search terms or filters</p>
                        </div>
                    </div>
                )}
                {!searchError && searchQuery.length > 0 && searchQuery.length < 2 && (
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Type at least 2 characters to search
                    </p>
                )}
                {!searchError && searchResults.length === 0 && searchQuery.length >= 2 && !isSearching && (
                    <p className="text-xs text-gray-500 mt-2">
                        Use ↑↓ keys to navigate results, Enter to select, Esc to clear
                    </p>
                )}
                {searchHistory.length > 0 && !searchResults.length && searchQuery.length < 2 && !isSearching && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-cyan-50 to-teal-50 rounded-lg border border-cyan-200">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-sm font-semibold text-cyan-900">Recent Searches</p>
                            </div>
                            <button
                                onClick={() => {
                                    setSearchHistory([]);
                                    localStorage.removeItem('patientSearchHistory');
                                }}
                                className="text-xs font-medium text-cyan-700 hover:text-cyan-900 hover:underline transition-colors"
                            >
                                Clear History
                            </button>
                        </div>
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
                {/* Form Header */}
                <div className="mb-6 flex items-center gap-2">
                    <div className="w-1 h-8 bg-gradient-to-b from-cyan-500 to-teal-500 rounded-full"></div>
                    <h3 className="text-xl font-bold text-gray-800">Patient Information</h3>
                    <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        <span className="text-red-500">*</span> All fields are required
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Designation */}
                     <div>
                        <label htmlFor="designation" className="block text-sm font-semibold text-gray-700 mb-2">
                            Designation <span className="text-red-500">*</span>
                        </label>
                        <select 
                            id="designation" 
                            className="block w-full py-2.5 px-4 border-2 border-gray-200 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all hover:border-gray-300"
                        >
                            <option>Mr.</option>
                            <option>Mrs.</option>
                            <option>Ms.</option>
                            <option>Dr.</option>
                            <option>Master</option>
                            <option>Miss</option>
                        </select>
                    </div>

                    {/* First Name */}
                    <div>
                        <label htmlFor="first-name" className="block text-sm font-semibold text-gray-700 mb-2">
                            First Name <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            id="first-name" 
                            required 
                            value={firstName} 
                            onChange={e => setFirstName(e.target.value)} 
                            placeholder="Enter first name"
                            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all hover:border-gray-300" 
                        />
                    </div>

                    {/* Last Name */}
                    <div>
                        <label htmlFor="last-name" className="block text-sm font-semibold text-gray-700 mb-2">
                            Last Name <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            id="last-name" 
                            required 
                            value={lastName} 
                            onChange={e => setLastName(e.target.value)} 
                            placeholder="Enter last name"
                            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all hover:border-gray-300" 
                        />
                    </div>

                    {/* Gender */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Gender <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-6 mt-3">
                            <label className="inline-flex items-center cursor-pointer group">
                                <input 
                                    type="radio" 
                                    name="gender" 
                                    value="male" 
                                    checked={gender === 'male'} 
                                    onChange={e => setGender(e.target.value as any)} 
                                    className="w-4 h-4 text-cyan-600 focus:ring-cyan-500 focus:ring-2" 
                                />
                                <span className="ml-2 text-gray-700 group-hover:text-cyan-700 transition-colors">Male</span>
                            </label>
                            <label className="inline-flex items-center cursor-pointer group">
                                <input 
                                    type="radio" 
                                    name="gender" 
                                    value="female" 
                                    checked={gender === 'female'} 
                                    onChange={e => setGender(e.target.value as any)} 
                                    className="w-4 h-4 text-cyan-600 focus:ring-cyan-500 focus:ring-2" 
                                />
                                <span className="ml-2 text-gray-700 group-hover:text-cyan-700 transition-colors">Female</span>
                            </label>
                            <label className="inline-flex items-center cursor-pointer group">
                                <input 
                                    type="radio" 
                                    name="gender" 
                                    value="other" 
                                    checked={gender === 'other'} 
                                    onChange={e => setGender(e.target.value as any)} 
                                    className="w-4 h-4 text-cyan-600 focus:ring-cyan-500 focus:ring-2" 
                                />
                                <span className="ml-2 text-gray-700 group-hover:text-cyan-700 transition-colors">Other</span>
                            </label>
                        </div>
                    </div>

                    {/* Date of Birth */}
                    <div>
                        <label htmlFor="dob" className="block text-sm font-semibold text-gray-700 mb-2">
                            Date of Birth <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="date" 
                            id="dob" 
                            required 
                            value={dateOfBirth} 
                            onChange={e => setDateOfBirth(e.target.value)} 
                            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all hover:border-gray-300" 
                        />
                    </div>

                    {/* Phone Number */}
                    <div>
                        <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                            Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="tel" 
                            id="phone" 
                            required 
                            value={phone} 
                            onChange={e => {
                                const value = e.target.value.replace(/\D/g, '');
                                if (value.length <= 10) {
                                    setPhone(value);
                                }
                            }}
                            placeholder="10-digit mobile number"
                            maxLength={10}
                            pattern="[0-9]{10}"
                            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all hover:border-gray-300" 
                        />
                        {phone && phone.length < 10 && (
                            <p className="text-xs text-red-500 mt-1">Phone number must be exactly 10 digits</p>
                        )}
                    </div>

                    {/* Email */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                            Email ID <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="email" 
                            id="email" 
                            required 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            placeholder="example@email.com"
                            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all hover:border-gray-300" 
                        />
                    </div>

                    {/* Address */}
                    <div className="md:col-span-2">
                        <label htmlFor="address" className="block text-sm font-semibold text-gray-700 mb-2">
                            Address <span className="text-red-500">*</span>
                        </label>
                        <textarea 
                            id="address" 
                            rows={3} 
                            value={address} 
                            onChange={e => setAddress(e.target.value)} 
                            placeholder="Enter complete address"
                            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all hover:border-gray-300 resize-none"
                        ></textarea>
                    </div>

                    {/* City */}
                    <div>
                        <label htmlFor="city" className="block text-sm font-semibold text-gray-700 mb-2">
                            City <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            id="city" 
                            value={city} 
                            onChange={e => setCity(e.target.value)} 
                            placeholder="Enter city"
                            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all hover:border-gray-300" 
                        />
                    </div>

                    {/* State */}
                    <div>
                        <label htmlFor="state" className="block text-sm font-semibold text-gray-700 mb-2">
                            State <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            id="state" 
                            value={state} 
                            onChange={e => setState(e.target.value)} 
                            placeholder="Enter state"
                            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all hover:border-gray-300" 
                        />
                    </div>

                    {/* Postal Code */}
                    <div>
                        <label htmlFor="postalCode" className="block text-sm font-semibold text-gray-700 mb-2">
                            Postal Code <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            id="postalCode" 
                            value={postalCode} 
                            onChange={e => setPostalCode(e.target.value)} 
                            placeholder="Enter postal code"
                            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all hover:border-gray-300" 
                        />
                    </div>

                    {/* ABHA Section - WIP */}
                    <div className="md:col-span-2">
                        <div className="border-t-2 border-gray-100 pt-6 mt-2 opacity-60 pointer-events-none">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-1 h-6 bg-gradient-to-b from-gray-400 to-gray-500 rounded-full"></div>
                                <h3 className="text-lg font-bold text-gray-600">ABHA Integration</h3>
                                <span className="ml-2 text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                                    WIP
                                </span>
                            </div>
                            <div className="flex items-end gap-4">
                                <div className="flex-grow">
                                    <label htmlFor="aadhaar" className="block text-sm font-semibold text-gray-500 mb-2">
                                        Aadhaar Number <span className="text-red-400">*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        id="aadhaar" 
                                        value={aadhaar} 
                                        onChange={e => setAadhaar(e.target.value)} 
                                        placeholder="XXXX XXXX XXXX"
                                        maxLength={12}
                                        disabled
                                        className="w-full px-4 py-2.5 border-2 border-gray-200 bg-gray-100 rounded-lg shadow-sm cursor-not-allowed" 
                                    />
                                </div>
                                <button 
                                    type="button" 
                                    onClick={handleCheckAbha} 
                                    disabled
                                    className="px-6 py-2.5 bg-gray-300 text-gray-500 font-semibold rounded-lg shadow-sm cursor-not-allowed whitespace-nowrap"
                                >
                                    Check ABHA
                                </button>
                            </div>
                            <div className="mt-3 text-xs text-gray-500 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                                ℹ️ This feature is currently under development and will be available soon.
                            </div>
                        </div>
                    </div>

                </div>
                
                {/* Action Buttons */}
                <div className="mt-8 pt-6 border-t-2 border-gray-100 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                        <span className="text-red-500 font-semibold">*</span> All fields are mandatory
                    </div>
                    <div className="flex gap-3">
                        <button 
                            type="button" 
                            onClick={() => {
                                // Reset form
                                setFirstName('');
                                setLastName('');
                                setGender('male');
                                setDateOfBirth('');
                                setPhone('');
                                setEmail('');
                                setAddress('');
                                setCity('');
                                setState('');
                                setPostalCode('');
                                setAadhaar('');
                                setSelectedPatient(null);
                            }}
                            className="px-6 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all duration-200"
                        >
                            Clear Form
                        </button>
                        <button 
                            type="submit" 
                            className="px-8 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-cyan-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all duration-200"
                        >
                            {selectedPatient ? '✓ Update Patient' : '✓ Register Patient'}
                        </button>
                        <button 
                            type="button" 
                            onClick={(e) => {
                                e.preventDefault();
                                handleSubmit(e as any, true);
                            }}
                            className="px-8 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-teal-700 hover:to-cyan-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all duration-200 flex items-center gap-2"
                        >
                            {selectedPatient ? 'Update & Create Encounter' : 'Register & Create Encounter'}
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </button>
                    </div>
                </div>
            </form>
            </div>
        </div>
    );
};

export default PatientRegistration;