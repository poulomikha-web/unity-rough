'use client';

import { useJourney } from '@/lib/JourneyContext';
import { SecuredFooter } from '@/components/shared';
import { asset } from '@/lib/asset';

/** SS1 — KYC welcome. "Accept & Proceed" kicks off the onboarding sequence. */
export function KycWelcomeScreen() {
  const { startOnboarding } = useJourney();

  return (
    <div className="screen screen-kyc active" id="screenKycWelcome">
      <div className="redirect-header">
        <div className="idfy-badge">
          <span className="uni-logo" />
        </div>
        <div className="rh-title">Self Video KYC</div>
      </div>
      <div className="kyc-body">
        <div className="kyc-h1">Welcome to your KYC verification</div>
        <div className="kyc-illus-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="kyc-illus" src={asset('/assets/kyc-welcome.png')} alt="" />
        </div>
        <div className="kyc-p">
          <span className="lead">
            You will be asked to capture some of your documents. Your information will be used only
            for verification.
          </span>
        </div>
        <div className="kyc-p kyc-list">
          <div className="kyc-ensure">Please ensure that:</div>
          <ul className="kyc-ul">
            <li>Document images are readable</li>
            <li>Selfie matches with the document</li>
            <li>Have a blank sheet of paper and a pen ready before the call.</li>
          </ul>
        </div>
      </div>
      <div className="kyc-footer-sheet">
        <div className="kyc-safe">
          <svg viewBox="0 0 24 24">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
          </svg>
          <span>Your information is safe with us</span>
        </div>
        <button className="kyc-accept" onClick={startOnboarding}>
          Accept &amp; Proceed
        </button>
      </div>
      <SecuredFooter variant="ob" />
    </div>
  );
}
