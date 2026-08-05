import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserAttributes, getCurrentUser } from 'aws-amplify/auth';
import { getUserSubscription } from '../../graphql/queries';
import { getAmplifyClient } from '../../services/amplifyClient';
import { trackPageView, trackAccountPageButtonClick } from '../../utils/analytics';
import './Billing.css';

const plans = [
  { id: 'free', name: 'Free', description: 'Essential Care', price: 'No charge', hours: '1 hour/month', edits: 'Up to 15' },
  { id: 'standard', name: 'Standard', description: 'Enhanced Practice', price: '$19/mo', hours: '15 hours/month', edits: 'Unlimited' },
  { id: 'pro', name: 'Professional', description: 'Total Automation', price: '$75/mo', hours: 'Unlimited', edits: 'Unlimited' }
];

function Billing() {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [status, setStatus] = useState('loading');
  const [actionStatus, setActionStatus] = useState('idle');
  const [actionError, setActionError] = useState('');

  const loadSubscription = useCallback(async () => {
    setStatus('loading');
    try {
      const attributes = await fetchUserAttributes();
      const result = await getAmplifyClient().graphql({
        query: getUserSubscription,
        variables: { owner: attributes.sub }
      });
      setSubscription(result?.data?.getUserSubscription || {});
      setStatus('ready');
    } catch (error) {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    trackPageView('Account_Page');
    loadSubscription();
  }, [loadSubscription]);

  const currentPlan = String(subscription?.tier || 'free').toLowerCase();
  const remainingHours = Math.max(0, Number(subscription?.hoursleft) || 0);
  const smartEditsRemaining = Math.max(0, Number(subscription?.notesleft) || 0);

  const handlePlanAction = async () => {
    setActionError('');
    if (currentPlan === 'free') {
      trackAccountPageButtonClick('Click_Account_BrowsePlans');
      navigate('/app/pricingplans');
      return;
    }

    trackAccountPageButtonClick('Click_Account_ManageBilling');
    setActionStatus('loading');
    try {
      const userEmail = (await getCurrentUser()).signInDetails?.loginId;
      if (!userEmail) throw new Error('Missing email');
      const response = await fetch('https://uvhaoef2myno3o4wvgyb32e5ae0dlevu.lambda-url.us-east-2.on.aws/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userEmail })
      });
      if (!response.ok) throw new Error('Billing portal failed');
      const url = await response.text();
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setActionError('ChiroNote could not open the billing portal. Please try again.');
    } finally {
      setActionStatus('idle');
    }
  };

  return (
    <main className="billing-page">
      <div className="billing-page__heading">
        <h1>Billing</h1>
        <p>Review your plan, manage billing, and see this month&apos;s available usage.</p>
      </div>

      {status === 'loading' && (
        <div className="billing-status" role="status">
          <span className="billing-spinner" aria-hidden="true" />
          <span>Loading billing details…</span>
        </div>
      )}

      {status === 'error' && (
        <div className="billing-message billing-message--error" role="alert">
          <span className="material-symbols-rounded" aria-hidden="true">error</span>
          <div><strong>Billing details are unavailable.</strong><p>Your usage has not been changed.</p></div>
          <button type="button" className="billing-button billing-button--secondary" onClick={loadSubscription}>Retry</button>
        </div>
      )}

      {status === 'ready' && (
        <>
          <section className="billing-section" aria-labelledby="plans-title">
            <div className="billing-section__heading">
              <h2 id="plans-title">Current plan and available plans</h2>
              <p>Select the billing action below to compare plans or manage your subscription.</p>
            </div>
            <div className="billing-plans">
              {plans.map((plan) => {
                const isCurrent = currentPlan === plan.id;
                return (
                  <article className={`billing-plan${isCurrent ? ' billing-plan--current' : ''}`} key={plan.id}>
                    <div className="billing-plan__topline">
                      <div><h3>{plan.name}</h3><p>{plan.description}</p></div>
                      {isCurrent && <span className="billing-current"><span className="material-symbols-rounded" aria-hidden="true">check_circle</span>Current plan</span>}
                    </div>
                    <p className="billing-plan__price">{plan.price}</p>
                    <dl>
                      <div><dt>Recording and dictation</dt><dd>{plan.hours}</dd></div>
                      <div><dt>Smart Edits</dt><dd>{plan.edits}</dd></div>
                    </dl>
                  </article>
                );
              })}
            </div>
            {actionError && <p className="billing-inline-error" role="alert">{actionError}</p>}
            <button type="button" className="billing-button billing-button--primary" onClick={handlePlanAction} disabled={actionStatus === 'loading'}>
              {actionStatus === 'loading' ? 'Opening billing portal…' : currentPlan === 'free' ? 'Browse available plans' : 'Manage billing'}
            </button>
          </section>

          <section className="billing-section" aria-labelledby="usage-title">
            <div className="billing-section__heading"><h2 id="usage-title">Usage this month</h2><p>Available recording, dictation, and Smart Edit capacity for your current billing period.</p></div>
            <div className="billing-usage">
              <article className="billing-metric">
                <span className="material-symbols-rounded" aria-hidden="true">schedule</span>
                <div><p className="billing-metric__label">Recording and dictation hours remaining</p>
                  {currentPlan === 'pro'
                    ? <p className="billing-metric__value billing-metric__value--text"><span className="material-symbols-rounded" aria-hidden="true">all_inclusive</span>Unlimited</p>
                    : <p className="billing-metric__value">{remainingHours.toFixed(1)} <span>hours</span></p>}
                </div>
              </article>
              {currentPlan === 'free' && (
                <article className="billing-metric">
                  <span className="material-symbols-rounded" aria-hidden="true">auto_fix_high</span>
                  <div><p className="billing-metric__label">Smart Edits remaining</p><p className="billing-metric__value">{smartEditsRemaining}</p></div>
                </article>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

export default Billing;
