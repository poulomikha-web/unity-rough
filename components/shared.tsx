'use client';

import { useEffect, useRef } from 'react';
import { attachStream } from '@/lib/useCamera';
import { useJourney } from '@/lib/JourneyContext';

/** Inline <symbol> for the IDfy logo, rendered once at the app root. */
export function IdfyLogoDefs() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
      aria-hidden="true"
    >
      <symbol id="idfyLogo" viewBox="0 0 31 20">
        <path
          d="M27.8861 18.4626C27.962 18.4587 28.0765 18.4369 28.1517 18.4228C28.2622 18.402 28.3699 18.3681 28.4725 18.3219C28.7504 18.1979 29.0919 17.8983 29.224 17.4857C29.2667 17.3524 29.2899 17.2135 29.2928 17.0735C29.2935 17.0435 29.2928 17.0135 29.2928 16.9836C29.2928 16.4539 29.2928 15.9242 29.2928 15.3945C29.2928 15.3614 29.294 15.2996 29.2928 15.2664C29.2928 15.2664 29.2766 15.2761 29.2666 15.2822C29.2469 15.2947 29.2266 15.3061 29.2056 15.3162C29.0288 15.4069 28.8431 15.4787 28.6515 15.5306C28.4794 15.5785 28.3032 15.6099 28.1252 15.6243C28.0198 15.6334 27.914 15.6369 27.8083 15.6347C27.3518 15.6224 26.9182 15.5202 26.5148 15.2994C26.0244 15.0303 25.519 14.5327 25.2603 13.9269C25.1659 13.7065 25.1007 13.4746 25.0661 13.2371C25.0422 13.0689 25.0306 12.8992 25.0314 12.7293L25.0128 10.7252L22.2044 10.7499C22.2044 12.289 22.2044 14.0933 22.2044 15.6325H20.7657V6.86847C20.765 6.7319 20.7723 6.5954 20.7873 6.45967C20.8457 5.94828 21.027 5.48615 21.3427 5.07974C21.5278 4.84002 21.748 4.63005 21.9958 4.45701C22.3096 4.23839 22.6662 4.09004 23.0417 4.02196C23.1917 3.99415 23.343 3.98176 23.4947 3.97197C23.5177 3.97051 23.6021 3.97061 23.6251 3.97082L23.631 5.40918C23.5829 5.41126 23.5052 5.41814 23.4581 5.42147C23.4188 5.42626 23.3795 5.43105 23.3405 5.43813C23.1115 5.47955 22.8975 5.5816 22.7205 5.73382C22.5509 5.87703 22.4143 6.04628 22.3231 6.25074C22.2574 6.39666 22.2188 6.55352 22.2094 6.71349C22.2062 6.76994 22.2053 6.8267 22.2053 6.88326L22.214 9.49261L26.4715 9.49334L26.4737 12.8366C26.4834 13.1509 26.5882 13.4287 26.7881 13.6699C26.9502 13.8651 27.1456 14.0147 27.3847 14.1027C27.5119 14.1506 27.6458 14.1779 27.7814 14.1836C27.9005 14.1879 28.0191 14.186 28.1372 14.1653C28.3632 14.1265 28.5755 14.0296 28.7536 13.8841C28.8597 13.7988 28.9542 13.6997 29.0345 13.5894C29.2021 13.3593 29.2846 13.0998 29.2939 12.8161C29.2956 12.7661 29.2946 12.7161 29.2946 12.6663C29.2946 11.6568 29.2946 10.5175 29.2946 9.50812L30.7039 9.50188V16.6916C30.7016 16.802 30.7024 17.5769 30.6478 17.8538C30.5558 18.2064 30.3849 18.4914 30.1627 18.779C29.986 19.0084 29.7772 19.2106 29.5427 19.3793C29.1805 19.6397 28.778 19.7974 28.3379 19.8601C28.2329 19.875 28.1273 19.8809 28.022 19.8899C27.986 19.893 27.9237 19.8899 27.8876 19.8899L27.8861 18.4626Z"
          fill="#ECEDED"
        />
        <ellipse cx="10.0574" cy="10.1088" rx="8.99877" ry="9.04433" fill="#FAFAFB" />
        <path
          d="M15.0591 9.17239C14.9104 8.56643 14.6011 8.05649 14.143 7.63842C13.8705 7.38959 13.5558 7.19204 13.214 7.05517C12.842 6.90519 12.4559 6.8254 12.0544 6.8252C11.6809 6.8252 11.1864 6.8252 10.8125 6.8252V12.865C11.2124 12.865 11.7049 12.865 12.1048 12.865C12.2238 12.8641 12.3426 12.8548 12.4603 12.8372C12.8911 12.7764 13.2947 12.6361 13.6661 12.4073C14.2358 12.0563 14.6582 11.575 14.9179 10.9533C15.0339 10.6769 15.1047 10.3832 15.1274 10.0839C15.1335 10.0044 15.1388 9.92448 15.1398 9.84439C15.1406 9.7846 15.1331 9.72482 15.1308 9.66493C15.1236 9.49872 15.0996 9.33369 15.0591 9.17239Z"
          fill="#7D8187"
        />
        <path
          d="M9.92137 0C4.44173 0 0 4.47713 0 9.99995C0 15.5228 4.44204 19.9999 9.92168 19.9999C15.4013 19.9999 19.8434 15.5228 19.8434 9.99995C19.8434 4.47713 15.4009 0 9.92137 0ZM6.25529 15.6464H3.45021V6.67944C3.45021 5.22713 4.61792 4.04989 6.05926 4.04989H6.2556L6.25529 15.6464ZM17.8932 10.4069C17.8738 10.5991 17.8453 10.7901 17.8078 10.9797C17.7469 11.2832 17.6612 11.581 17.5516 11.8702C17.3313 12.4535 17.018 12.9966 16.624 13.478C15.8212 14.4606 14.7277 15.1586 13.5032 15.4701C13.3176 15.518 13.1296 15.556 12.9401 15.584C12.8257 15.6006 12.7111 15.6144 12.596 15.6265C12.4939 15.6369 12.3916 15.6384 12.2896 15.6463C12.1014 15.6609 11.913 15.6573 11.7246 15.6574C10.5378 15.6574 9.2161 15.6574 8.02928 15.6574L8.04126 6.42489C8.06256 6.18244 8.11824 5.94432 8.2066 5.7178C8.3498 5.34873 8.57344 5.0168 8.861 4.74654C9.14855 4.47627 9.49268 4.27457 9.86795 4.15633C10.0384 4.1027 10.214 4.067 10.3918 4.04978C10.4837 4.04072 10.5764 4.03625 10.6689 4.03593C11.1151 4.03458 11.5614 4.03385 12.0077 4.03593C12.1929 4.0369 12.3777 4.04555 12.5623 4.06187C13.8201 4.17171 15.0103 4.68326 15.9598 5.52209C16.4461 5.95052 16.8578 6.45803 17.1778 7.02356C17.4603 7.52152 17.6662 8.05975 17.7886 8.61992C17.8417 8.86045 17.8788 9.1043 17.8995 9.34982C17.9158 9.54886 17.9294 9.74852 17.9211 9.9485C17.9149 10.1013 17.9083 10.2543 17.8932 10.4069Z"
          fill="#7D8187"
        />
      </symbol>
    </svg>
  );
}

/** "Secured by IDfy" footer, used across most screens. */
export function SecuredFooter({ variant = 'ob' }: { variant?: 'ob' | 'doc' }) {
  return (
    <div className={`${variant}-footer`}>
      <span className="sec-text">Secured by</span>
      <svg className="idfy-logo-svg" viewBox="0 0 31 20" role="img" aria-label="IDfy">
        <use href="#idfyLogo" />
      </svg>
    </div>
  );
}

/** Unity header bar with logo badge + "Self Video KYC" title. */
export function UniHeader() {
  return (
    <div className="uni-header">
      <span className="uni-logo-badge">
        <span className="uni-logo" />
      </span>
      <span className="uni-htitle">Self Video KYC</span>
    </div>
  );
}

/** The "Self Video KYC" header used on the redirect / welcome screens. */
export function RedirectHeader() {
  return (
    <div className="redirect-header">
      <div className="idfy-badge">
        <span className="uni-logo" />
      </div>
      <div className="rh-title">Self Video KYC</div>
    </div>
  );
}

/**
 * A <video> element wired to the shared camera stream. Always autoplay /
 * playsInline / muted, matching the prototype's markup.
 */
export function CamVideo({
  id,
  className,
  style,
}: {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const { camera } = useJourney();

  useEffect(() => {
    attachStream(ref.current, camera.stream);
  }, [camera.stream]);

  return (
    <video id={id} className={className} style={style} autoPlay playsInline muted ref={ref} />
  );
}

/**
 * A <video> showing the agent's live stream during a real call. Not muted —
 * this element is what plays the agent's voice.
 */
export function RemoteVideo({ id, className }: { id?: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const { call } = useJourney();

  useEffect(() => {
    const v = ref.current;
    attachStream(v, call.remoteStream);
    v?.play().catch(() => {});
  }, [call.remoteStream]);

  return <video id={id} className={className} autoPlay playsInline ref={ref} style={{ transform: 'none' }} />;
}
