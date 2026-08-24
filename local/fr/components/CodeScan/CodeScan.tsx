"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { BrowserMultiFormatReader, Result } from "@zxing/library";

interface CodeScanProps {
  onBarcodeScanned: (barcode: string) => void;
}

interface ZoomCapabilities {
  zoom?: {
    min: number;
    max: number;
    step: number;
  };
}

// Fix for Webcam component type issues
const FixedWebcam = Webcam as unknown as React.ComponentType<any>;

interface ScanLine {
  id: number;
  position: number;
  speed: number;
}

export default function BarcodeScanner({ onBarcodeScanned }: CodeScanProps) {
  const webcamRef = useRef<any>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cssZoom, setCssZoom] = useState(false);
  const [scanLines, setScanLines] = useState<ScanLine[]>([]);
  const [scanHistory, setScanHistory] = useState<string[]>([]);
  const isCooldownRef = useRef<boolean>(false);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Generate barcode visualization data
  const generateBarcodeBands = (code: string) => {
    const hash = code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const bands = [];
    
    for (let i = 0; i < 12; i++) {
      const width = 2 + (hash + i) % 8;
      const height = 20 + (hash * i) % 15;
      bands.push({ width, height });
    }
    
    return bands;
  };

  const barcodeBands = lastScanned ? generateBarcodeBands(lastScanned) : [];

  // Animated scan lines
  useEffect(() => {
    const lines: ScanLine[] = [];
    for (let i = 0; i < 2; i++) {
      lines.push({
        id: i,
        position: Math.random() * 100,
        speed: 0.8 + Math.random() * 1.2
      });
    }
    setScanLines(lines);

    const interval = setInterval(() => {
      setScanLines(prev => prev.map(line => ({
        ...line,
        position: (line.position + line.speed) % 100
      })));
    }, 20);

    return () => clearInterval(interval);
  }, []);

useEffect(() => {
  const codeReader = new BrowserMultiFormatReader();
  codeReaderRef.current = codeReader;
  let stopped = false;

  // FIX: Remove problematic hints - the scanner will work fine without them
  // The default settings are usually sufficient for most barcodes

  const startScanner = async () => {
    if (!webcamRef.current) return;

    try {
      const videoInputDevices = await codeReader.listVideoInputDevices();
      if (!videoInputDevices || videoInputDevices.length === 0) {
        console.error("No camera devices found");
        return;
      }

      const selectedDeviceId = videoInputDevices[0].deviceId;
      console.log("Using camera:", videoInputDevices[0].label);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: selectedDeviceId,
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 } // Reduced for better performance
        },
      });

      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];

      // FIX: Simplified zoom handling
      try {
        const capabilities = track.getCapabilities() as any;
        
        if (capabilities.zoom) {
          const zoomValue = Math.min(capabilities.zoom.max, 1.3);
          await track.applyConstraints({ 
            advanced: [{ zoom: zoomValue }] as any 
          });
          console.log("Applied camera zoom");
        } else {
          setCssZoom(true);
        }
      } catch (zoomError) {
        console.warn("Zoom not available, using CSS fallback");
        setCssZoom(true);
      }

      if (webcamRef.current?.video) {
        webcamRef.current.video.srcObject = stream;
        
        await new Promise<void>((resolve) => {
          if (webcamRef.current.video.readyState >= 3) {
            resolve();
            return;
          }
          webcamRef.current.video.onloadeddata = () => resolve();
        });
      }

      // Start the barcode scanning
      await codeReader.decodeFromVideoDevice(
        selectedDeviceId,
        webcamRef.current.video!,
        (result: Result | undefined | null, error: Error | undefined | null) => {
          if (stopped) return;

          if (result && !isCooldownRef.current) {
            const text = result.getText();
            console.log("✅ Barcode detected:", text);
            
            onBarcodeScanned(text);
            
            setLastScanned(text);
            setIsScanning(true);
            setScanHistory(prev => [text, ...prev.slice(0, 3)]);
            isCooldownRef.current = true;

            setTimeout(() => {
              setLastScanned(null);
              isCooldownRef.current = false;
              setIsScanning(false);
            }, 1500); // Faster reset
          }
          
          if (error && !stopped) {
            // Silent error handling - don't log every frame without barcode
          }
        }
      );
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  startScanner();

  return () => {
    stopped = true;
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };
}, [onBarcodeScanned]);

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <div className="relative w-full h-24 overflow-hidden bg-white">
        {/* Webcam feed */}
        <FixedWebcam
          ref={webcamRef}
          audio={false}
          mirrored={false}
          videoConstraints={{ facingMode: "environment" }}
          className={`absolute top-0 left-0 w-full h-full object-cover   ${
            isScanning ? "filter brightness-95 contrast-110 grayscale-40" : ""
          } ${cssZoom ? "scale-[2.4]" : ""}`}
          style={{ transformOrigin: "center center" }}
        />

        {/* Full-screen overlay when scanned */}
        {lastScanned && (
          <div className="absolute inset-0 bg-black/90 flex w-full flex-col items-center justify-center text-white  z-20">
            {/* Barcode Visualization */}
            <div className="bg-white w-full rounded-lg ">
              <div className="flex items-end justify-center gap-1 h-5 mb-3">
                {barcodeBands.map((band, index) => (
                  <div
                    key={index}
                    className="bg-black h-full"
                    style={{
                      width: `${band.width}px`
                    }}
                  />
                ))}
              </div>
              
              {/* Scanned Number */}
              <div className="text-center">
                <div className="text-sm sm:text-xs tracking-widest bg-white text-black py-2 rounded border border-white/30">
                  {lastScanned}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Original border lines */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute"
            style={{
              top: "30%",
              left: "10%",
              width: "80%",
              height: "40%",
              boxSizing: "border-box",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      {/* Fade animation */}
      <style jsx>{`
        @keyframes fade {
          0% {
            opacity: 0;
            transform: scale(0.95);
          }
          10% {
            opacity: 1;
            transform: scale(1);
          }
          90% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(1.02);
          }
        }
        . {
          animation: fade 1.8s -out forwards;
        }
      `}</style>
    </div>
  );
}
