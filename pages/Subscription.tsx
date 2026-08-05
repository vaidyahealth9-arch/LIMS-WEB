import React, { useState, useEffect } from 'react';
import { AlertCircle, Check, Zap, Users, BarChart3, Shield, Clock, CreditCard, X } from 'lucide-react';
import { useAuth } from '../services/AuthContext';
import { useNotifications } from '../services/NotificationContext';
import { useSubscription } from '../services/SubscriptionContext';

interface SubscriptionPlan {
    id: number;
    planName: string;
    price: number;
    discountedPrice: number;
    discountPercentage: number;
    trialDays: number;
    description: string;
    isActive: boolean;
    maxUsers: number;
    maxTestsPerMonth: number;
    maxReports: number;
    includesAdvancedAnalytics: boolean;
    includesCustomBranding: boolean;
    includesApiAccess: boolean;
    includesPrioritySupport: boolean;
}

interface Subscription {
    id: number;
    status: string;
    planName: string;
    monthlyAmount: number;
    discountedAmount: number;
    trialEndDate: string;
    currentCycleEnd: string;
}

interface SubscriptionSummary {
    isOnTrial: boolean;
    hasUsedTrial?: boolean;
    hasActiveSubscription: boolean;
    currentPlanName: string;
    monthlyAmount: number;
    discountedAmount: number;
    status: string;
    daysRemainingInTrial: number;
    daysUntilNextBilling: number;
    nextBillingDate: string;
}

// Fix #7: Contact info collected from user before initiating payment
interface ContactInfo {
    email: string;
    phone: string;
}

declare global {
    interface Window {
        Razorpay: any;
    }
}

const Subscription: React.FC = () => {
    const { user } = useAuth();
    const { addNotification } = useNotifications();
    const { isSubscribed, remainingTime, refreshSubscription } = useSubscription();
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
    const [subscriptionSummary, setSubscriptionSummary] = useState<SubscriptionSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [processingPayment, setProcessingPayment] = useState(false);

    // Fix #7: Contact info modal state
    const [showContactModal, setShowContactModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
    const [contactInfo, setContactInfo] = useState<ContactInfo>({ email: '', phone: '' });
    const [skipTrialParam, setSkipTrialParam] = useState(false);

    useEffect(() => {
        fetchPlans();
        fetchCurrentSubscription();
    }, []);

    const fetchPlans = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/subscriptions/plans', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setPlans(data);
            }
        } catch (error) {
            console.error('Error fetching plans:', error);
            addNotification({ title: 'Error', message: 'Failed to fetch subscription plans', type: 'error' });
        }
    };

    const fetchCurrentSubscription = async () => {
        try {
            if (!user?.organizationId) return;
            const token = localStorage.getItem('token');

            const summaryResponse = await fetch(
                `/api/subscriptions/organization/${user.organizationId}/summary`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (summaryResponse.ok) {
                const summary = await summaryResponse.json();
                setSubscriptionSummary(summary);

                if (summary?.hasActiveSubscription) {
                    const subResponse = await fetch(
                        `/api/subscriptions/organization/${user.organizationId}`,
                        { headers: { 'Authorization': `Bearer ${token}` } }
                    );
                    if (subResponse.ok) {
                        setCurrentSubscription(await subResponse.json());
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching subscription:', error);
        } finally {
            setLoading(false);
        }
    };

    // Open contact info modal when user clicks "Choose Plan"
    const handleSelectPlan = (plan: SubscriptionPlan, skipTrial: boolean = false) => {
        if (!user?.organizationId) return;
        setSelectedPlan(plan);
        setSkipTrialParam(skipTrial);
        setShowContactModal(true);
    };

    const handleContactSubmit = async () => {
        if (!selectedPlan || !user?.organizationId) return;
        setShowContactModal(false);
        setProcessingPayment(true);

        try {
            const token = localStorage.getItem('token');

            // ── PHASE 1: Initiate (creates Razorpay mandate, does NOT save to DB) ──
            const initiateResponse = await fetch(
                `/api/subscriptions/initiate?organizationId=${user.organizationId}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        planId: selectedPlan.id,
                        paymentMethod: 'upi',
                        autoRenewal: false,
                        customerName: user.username || user.organizationName,
                        contactEmail: contactInfo.email,
                        contactPhone: contactInfo.phone,
                        skipTrial: skipTrialParam
                    })
                }
            );

            if (!initiateResponse.ok) {
                const err = await initiateResponse.json();
                throw new Error(err.message || 'Failed to initiate subscription');
            }

            const initiateResult = await initiateResponse.json();
            const initiateData = initiateResult.data;

            // Handle both isNewSubscription and newSubscription keys to ensure compatibility with Jackson naming
            const isNew = initiateData.isNewSubscription !== undefined
                ? initiateData.isNewSubscription
                : initiateData.newSubscription;

            if (!isNew) {
                // ACTIVE subscription pile-up fallback (no new payment needed)
                await confirmSubscription(null, null, null, null, selectedPlan.id, initiateData.razorpayCustomerId);
                return;
            }

            // ── PHASE 2: Open Razorpay modal ──
            // Guard: ensure Razorpay SDK is loaded
            if (!window.Razorpay) {
                throw new Error(
                    'Razorpay checkout script is not loaded. ' +
                    'Please check your internet connection and disable any ad-blockers, then try again.'
                );
            }

            if (!initiateData.razorpayKeyId || (!initiateData.razorpaySubscriptionId && !initiateData.razorpayOrderId)) {
                throw new Error(
                    'Payment gateway configuration is missing. ' +
                    'Please contact support. (key, subscription_id or order_id is empty)'
                );
            }

            const options = {
                key: initiateData.razorpayKeyId,
                name: 'Vaidya LIMS',
                description: `${selectedPlan.planName} Plan`,
                ...(initiateData.razorpaySubscriptionId ? { subscription_id: initiateData.razorpaySubscriptionId } : {}),
                ...(initiateData.razorpayOrderId ? { order_id: initiateData.razorpayOrderId } : {}),
                handler: async (paymentResponse: any) => {
                    // ── PHASE 3: Confirm — verify signature, save to DB ──
                    await confirmSubscription(
                        paymentResponse.razorpay_payment_id,
                        paymentResponse.razorpay_subscription_id || null,
                        paymentResponse.razorpay_order_id || null,
                        paymentResponse.razorpay_signature,
                        selectedPlan.id,
                        initiateData.razorpayCustomerId
                    );
                },
                prefill: {
                    name: user.username || user.organizationName,
                    email: contactInfo.email,
                    contact: contactInfo.phone
                },
                theme: { color: '#0891b2' },
                modal: {
                    ondismiss: () => {
                        setProcessingPayment(false);
                        addNotification({
                            title: 'Payment Cancelled',
                            message: 'You closed the payment window. No charge was made.',
                            type: 'error'
                        });
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();

        } catch (error: any) {
            console.error('Error initiating subscription:', error);
            addNotification({ title: 'Error', message: error.message || 'Failed to initiate subscription', type: 'error' });
            setProcessingPayment(false);
        }
    };

    const confirmSubscription = async (
        paymentId: string | null,
        razorpaySubscriptionId: string | null,
        razorpayOrderId: string | null,
        signature: string | null,
        planId: number,
        razorpayCustomerId: string | null
    ) => {
        try {
            const token = localStorage.getItem('token');
            const confirmResponse = await fetch('/api/subscriptions/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    organizationId: user!.organizationId,
                    planId,
                    customerName: user!.username || user!.organizationName,
                    contactEmail: contactInfo.email,
                    contactPhone: contactInfo.phone,
                    paymentMethod: 'upi',
                    autoRenewal: false,
                    razorpayPaymentId: paymentId,
                    razorpaySubscriptionId,
                    razorpayOrderId,
                    razorpaySignature: signature,
                    razorpayCustomerId
                })
            });

            if (confirmResponse.ok) {
                addNotification({
                    title: 'Subscription Active!',
                    message: `Your ${selectedPlan?.planName} plan is now active.`,
                    type: 'success'
                });
                await fetchCurrentSubscription();
                await refreshSubscription();
            } else {
                const err = await confirmResponse.json();
                throw new Error(err.message || 'Failed to confirm subscription');
            }
        } catch (error: any) {
            addNotification({ title: 'Confirmation Failed', message: error.message || 'Could not save subscription.', type: 'error' });
        } finally {
            setProcessingPayment(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
                    <p className="mt-4 text-gray-600">Loading subscription plans...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8 pb-24">
            {/* Header */}
            <div className="mb-12">
                <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">Subscription Plans</h1>
                <p className="text-lg text-gray-600">Choose the perfect plan for your laboratory's growth</p>
            </div>

            {/* Current Subscription Status */}
            {subscriptionSummary && subscriptionSummary.hasActiveSubscription && (
                <div className="mb-8 p-6 bg-white border border-cyan-100 shadow-sm rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Zap className="w-24 h-24 text-cyan-600" />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-2xl font-bold text-gray-900">Current Plan: {subscriptionSummary.currentPlanName}</h2>
                                <span className="px-3 py-1 bg-cyan-100 text-cyan-700 text-xs font-bold uppercase rounded-full tracking-wider">
                                    {subscriptionSummary.status}
                                </span>
                            </div>

                            {subscriptionSummary.isOnTrial && (
                                <div className="flex items-center gap-2 text-amber-600 font-medium mb-3">
                                    <Clock className="w-5 h-5" />
                                    <span>{subscriptionSummary.daysRemainingInTrial} days remaining in your free trial</span>
                                </div>
                            )}

                            {!subscriptionSummary.isOnTrial && subscriptionSummary.nextBillingDate && (
                                <div className="flex items-center gap-2 text-gray-600 mb-3">
                                    <AlertCircle className="w-5 h-5 text-cyan-500" />
                                    <span>Next billing on {new Date(subscriptionSummary.nextBillingDate).toLocaleDateString()}</span>
                                </div>
                            )}

                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-cyan-600">₹{subscriptionSummary.discountedAmount.toFixed(2)}</span>
                                <span className="text-gray-500 text-sm line-through">₹{subscriptionSummary.monthlyAmount.toFixed(2)}</span>
                                <span className="text-gray-400 text-sm">/ month</span>
                            </div>
                        </div>

                        {!isSubscribed && (
                            <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-4 animate-pulse">
                                <AlertCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
                                <div>
                                    <p className="text-red-800 font-bold">Action Required</p>
                                    <p className="text-red-600 text-sm">Your access is currently restricted. Please renew below.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan) => (
                    <div
                        key={plan.id}
                        className={`group relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 flex flex-col overflow-hidden border-2 ${
                            currentSubscription?.planName === plan.planName ? 'border-cyan-500 ring-4 ring-cyan-50' : 'border-transparent'
                        }`}
                    >
                        {currentSubscription?.planName === plan.planName && (
                            <div className="absolute top-0 right-0 bg-cyan-500 text-white px-4 py-1 rounded-bl-xl text-xs font-bold uppercase tracking-widest z-10">
                                Active Plan
                            </div>
                        )}

                        {/* Top Section */}
                        <div className="p-8 bg-gradient-to-br from-gray-50 to-white border-b border-gray-100 flex-1">
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.planName}</h3>
                            <p className="text-gray-500 text-sm leading-relaxed mb-8 h-10 overflow-hidden">{plan.description}</p>

                            <div className="mb-8">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-5xl font-black text-gray-900 tracking-tight">₹{plan.discountedPrice.toLocaleString()}</span>
                                    <span className="text-gray-500 font-medium">/{plan.planName.toLowerCase()}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="text-gray-400 line-through text-lg">₹{plan.price.toLocaleString()}</span>
                                    <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-sm font-bold">
                                        {plan.discountPercentage}% OFF
                                    </span>
                                </div>
                            </div>

                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center gap-3 text-gray-700 font-medium">
                                    <div className="w-5 h-5 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Check className="w-3 h-3 text-cyan-600" />
                                    </div>
                                    <span>{plan.maxUsers || 'Unlimited'} Team Members</span>
                                </li>
                                <li className="flex items-center gap-3 text-gray-700 font-medium">
                                    <div className="w-5 h-5 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Check className="w-3 h-3 text-cyan-600" />
                                    </div>
                                    <span>{plan.maxTestsPerMonth?.toLocaleString() || 'Unlimited'} Tests / month</span>
                                </li>
                                <li className="flex items-center gap-3 text-gray-700 font-medium">
                                    <div className="w-5 h-5 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Check className="w-3 h-3 text-cyan-600" />
                                    </div>
                                    <span>Unlimited Digital Reports</span>
                                </li>
                                {plan.includesAdvancedAnalytics && (
                                    <li className="flex items-center gap-3 text-gray-700 font-medium">
                                        <div className="w-5 h-5 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0">
                                            <BarChart3 className="w-3 h-3 text-cyan-600" />
                                        </div>
                                        <span>Advanced Analytics</span>
                                    </li>
                                )}
                                {plan.includesPrioritySupport && (
                                    <li className="flex items-center gap-3 text-gray-700 font-medium">
                                        <div className="w-5 h-5 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0">
                                            <Shield className="w-3 h-3 text-cyan-600" />
                                        </div>
                                        <span>Priority 24/7 Support</span>
                                    </li>
                                )}
                            </ul>
                        </div>

                        {/* Button Section */}
                        <div className="p-8 bg-white mt-auto">
                            <button
                                onClick={() => handleSelectPlan(plan, false)}
                                disabled={processingPayment || currentSubscription?.planName === plan.planName}
                                className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 text-white shadow-lg disabled:opacity-50 ${
                                    currentSubscription?.planName === plan.planName
                                        ? 'bg-gray-400 cursor-not-allowed shadow-none'
                                        : 'bg-gradient-to-r from-cyan-600 to-teal-500 hover:shadow-cyan-200 hover:-translate-y-1 active:translate-y-0'
                                }`}
                            >
                                {processingPayment ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Zap className="w-5 h-5" />
                                )}
                                {currentSubscription?.planName === plan.planName 
                                    ? 'Current Active Plan' 
                                    : (subscriptionSummary?.hasUsedTrial ? 'Choose Plan & Subscribe' : 'Choose Plan (Free Trial)')}
                            </button>

                            {/* Pay Early / Pay Now button options */}
                            {currentSubscription?.planName === plan.planName && subscriptionSummary?.isOnTrial && (
                                <button
                                    onClick={() => handleSelectPlan(plan, true)}
                                    disabled={processingPayment}
                                    className="w-full mt-3 py-3 px-6 rounded-2xl font-bold text-md transition-all duration-300 flex items-center justify-center gap-2 text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 shadow-sm"
                                >
                                    <CreditCard className="w-4 h-4" />
                                    Pay Early & Activate
                                </button>
                            )}

                            {currentSubscription?.planName !== plan.planName && (
                                <button
                                    onClick={() => handleSelectPlan(plan, true)}
                                    disabled={processingPayment}
                                    className="w-full mt-3 py-3 px-6 rounded-2xl font-bold text-md transition-all duration-300 flex items-center justify-center gap-2 text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 shadow-sm"
                                >
                                    <CreditCard className="w-4 h-4" />
                                    Pay & Activate Now
                                </button>
                            )}

                            {!subscriptionSummary?.hasUsedTrial && (
                                <p className="text-center text-xs text-gray-400 mt-4 font-medium uppercase tracking-widest">
                                    includes {plan.trialDays} days free trial
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Trust Footer */}
            <div className="mt-16 flex flex-wrap items-center justify-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
                <div className="flex items-center gap-2 font-bold text-xl text-gray-600">
                    <Shield className="w-6 h-6" /> SECURE PAYMENTS
                </div>
                <div className="flex items-center gap-2 font-bold text-xl text-gray-600">
                    <Users className="w-6 h-6" /> 2500+ LABS
                </div>
                <div className="flex items-center gap-2 font-bold text-xl text-gray-600">
                    <Zap className="w-6 h-6" /> INSTANT ACTIVATION
                </div>
            </div>

            {/* Fix #7: Contact Info Modal — collect real email & phone before Razorpay */}
            {showContactModal && selectedPlan && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative">
                        <button
                            onClick={() => { setShowContactModal(false); setSelectedPlan(null); }}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
                                    <CreditCard className="w-5 h-5 text-cyan-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Confirm Your Details</h2>
                                    <p className="text-sm text-gray-500">{selectedPlan.planName} — ₹{selectedPlan.discountedPrice.toLocaleString()}</p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 mt-3">
                                Razorpay needs your contact info to set up the UPI auto-pay mandate and send payment notifications.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    value={contactInfo.email}
                                    onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="lab@example.com"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none text-gray-900 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                                <input
                                    type="tel"
                                    value={contactInfo.phone}
                                    onChange={(e) => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder="9876543210"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none text-gray-900 transition-all"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleContactSubmit}
                            disabled={!contactInfo.email || !contactInfo.phone}
                            className="mt-6 w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-500 text-white font-bold text-lg hover:shadow-lg hover:shadow-cyan-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Proceed to Payment →
                        </button>

                        <p className="text-center text-xs text-gray-400 mt-4">
                            🔒 Payments secured by Razorpay. No card info stored on our servers.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Subscription;
