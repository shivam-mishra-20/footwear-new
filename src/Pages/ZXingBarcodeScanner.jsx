/* eslint-disable no-unused-vars */
import React, { useEffect, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

const ZXingBarcodeScanner = ({
  onResult,
  onClose,
  width = "100%",
  height = 200,
}) => {
  const videoRef = useRef(null);
  const codeReader = useRef(null);

  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();
    let isMounted = true;

    codeReader.current.decodeFromVideoDevice(
      null,
      videoRef.current,
      (result, err) => {
        if (result && isMounted) {
          onResult(result.getText());
          if (onClose) onClose();
        }
      }
    );

    return () => {
      isMounted = false;
      if (codeReader.current) {
        if (typeof codeReader.current.stopDecoding === "function") {
          codeReader.current.stopDecoding();
        } else if (
          typeof codeReader.current.stopContinuousDecode === "function"
        ) {
          codeReader.current.stopContinuousDecode();
        }
      }
    };
  }, [onResult, onClose]);

  return (
    <div
      className="relative flex items-center justify-center w-full"
      style={{ width, height }}
    >
      {/* Animated border and shadow */}
      <div
        className="absolute inset-0 z-10 pointer-events-none rounded-xl border-4 border-blue-400 shadow-2xl animate-pulse"
        style={{ boxShadow: "0 0 32px 4px rgba(59,130,246,0.25)" }}
      />
      {/* Scanning line animation */}
      <div
        className="absolute left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-blue-200 to-blue-400 opacity-80 z-20 animate-scanline rounded"
        style={{ animation: "scanline 2s linear infinite" }}
      />
      {/* Video feed */}
      <video
        ref={videoRef}
        className="relative z-0 w-full h-full object-cover rounded-xl transition-all duration-500 shadow-lg"
        autoPlay
        muted
      />
      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-30 bg-white/80 hover:bg-red-500 hover:text-white text-red-500 rounded-full p-2 shadow-md transition-colors duration-200"
          title="Close Scanner"
          type="button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
      {/* Keyframes for scanline animation */}
      <style>{`
        @keyframes scanline {
          0% { top: 10%; }
          100% { top: 80%; }
        }
      `}</style>
    </div>
  );
};

export default ZXingBarcodeScanner;
