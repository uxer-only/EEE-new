import { useEffect, useState } from 'react';
import { X, Share, Plus, DownloadSimple } from 'phosphor-react';

const DISMISS_KEY = 'lumiere-a2hs-dismissed';
const SESSION_KEY = 'lumiere-a2hs-shown-session';

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS legacy
    window.navigator.standalone === true
  );
}

function isIOSSafari() {
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
}

function inIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export default function AddToHomeScreen() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [platform, setPlatform] = useState(null); // 'ios' | 'android'

  useEffect(() => {
    if (inIframe()) return; // Don't show inside Emergent preview iframe
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === '1') return;
    if (sessionStorage.getItem(SESSION_KEY) === '1') return;

    let timer;

    // Android / Chrome path
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPlatform('android');
      timer = setTimeout(() => setShow(true), 6000);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // iOS Safari path
    if (isIOSSafari()) {
      setPlatform('ios');
      timer = setTimeout(() => setShow(true), 8000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const dismissSession = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setShow(false);
  };

  const dismissForever = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setShow(false);
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        dismissForever();
      } else {
        dismissSession();
      }
      setDeferredPrompt(null);
    }
  };

  if (!show || !platform) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] pb-safe"
      data-testid="a2hs-sheet"
      role="dialog"
      aria-label="Add High Class Companionship to home screen"
    >
      <div className="mx-auto max-w-md px-4 pb-4">
        <div className="relative rounded-2xl bg-[#141416] border border-[#27272A] shadow-2xl overflow-hidden animate-[slideUp_0.35s_ease-out]">
          <button
            onClick={dismissSession}
            className="absolute top-3 right-3 p-1.5 text-[#A1A1AA] hover:text-[#F2F0ED] transition-colors"
            aria-label="Dismiss"
            data-testid="a2hs-dismiss"
          >
            <X size={18} weight="bold" />
          </button>

          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-[#C6A87C] flex items-center justify-center shadow-lg shadow-[#C6A87C]/20">
                <span className="text-[#0A0A0C] italic text-2xl">L</span>
              </div>
              <div>
                <p className="text-[#F2F0ED] font-medium leading-tight">Install High Class Companionship</p>
                <p className="text-[#A1A1AA] text-xs mt-0.5">Faster access. Discreet icon. Offline viewing.</p>
              </div>
            </div>

            {platform === 'ios' ? (
              <>
                <div className="space-y-2 mb-4 text-sm text-[#A1A1AA]">
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-[#C6A87C] font-medium">1.</span>
                    <span>Tap the</span>
                    <Share size={16} weight="regular" className="text-[#C6A87C]" />
                    <span>Share icon below</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-[#C6A87C] font-medium">2.</span>
                    <span>Choose</span>
                    <Plus size={16} weight="bold" className="text-[#C6A87C]" />
                    <span>"Add to Home Screen"</span>
                  </div>
                </div>
                <button
                  onClick={dismissForever}
                  className="w-full text-center text-[#71717A] hover:text-[#A1A1AA] text-xs uppercase tracking-wider py-2 transition-colors"
                  data-testid="a2hs-hide-forever"
                >
                  Don't show again
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={dismissForever}
                  className="flex-1 btn-secondary text-sm py-2.5"
                  data-testid="a2hs-no-thanks"
                >
                  Not now
                </button>
                <button
                  onClick={handleInstall}
                  className="flex-1 btn-primary text-sm py-2.5 flex items-center justify-center gap-2"
                  data-testid="a2hs-install"
                >
                  <DownloadSimple size={16} weight="bold" />
                  Install
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
