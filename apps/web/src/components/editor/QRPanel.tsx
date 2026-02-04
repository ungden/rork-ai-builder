'use client';

import { useState } from 'react';
import { Smartphone, AlertCircle, ChevronDown, ChevronUp, Share2, Code } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface QRPanelProps {
  expoURL?: string;
  connectedDevices?: number;
  onShowCode?: () => void;
}

export function QRPanel({ expoURL, connectedDevices = 0, onShowCode }: QRPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] border-l border-[#27272a]">
      {/* Header */}
      <div className="p-4 pb-3 border-b border-[#27272a]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">
              Test on your phone
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Scan QR code to test</p>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-[#27272a] rounded text-gray-400"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
        
        {connectedDevices > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </div>
            <span className="text-xs text-green-400">
              {connectedDevices} device{connectedDevices > 1 ? 's' : ''} connected
            </span>
          </div>
        )}
      </div>
      
      {/* QR Code Section */}
      {isExpanded && (
        <div className="flex-1 p-4 overflow-y-auto">
          {expoURL ? (
            <div className="space-y-4">
              {/* QR Code */}
              <div className="bg-white p-5 rounded-2xl mx-auto w-fit shadow-lg">
                <QRCodeSVG
                  value={expoURL}
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              </div>
              
              {/* Instructions */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="bg-[#27272a] text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">
                    1
                  </span>
                  <div>
                    <p className="text-sm text-gray-200">Open Camera app</p>
                    <p className="text-xs text-gray-500">On your iPhone or Android device</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="bg-[#27272a] text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">
                    2
                  </span>
                  <div>
                    <p className="text-sm text-gray-200">Scan QR code</p>
                    <p className="text-xs text-gray-500">Point camera at the code above</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="bg-[#27272a] text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">
                    3
                  </span>
                  <div>
                    <p className="text-sm text-gray-200">Open in Expo Go</p>
                    <p className="text-xs text-gray-500">Tap the notification to launch</p>
                  </div>
                </div>
              </div>
              
              {/* Warning */}
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <p className="text-xs text-amber-400/90 flex items-start gap-2 leading-relaxed">
                  <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                  <span>
                    Browser preview lacks native functions &amp; looks different. Test on device for the best results.
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="w-12 h-12 rounded-full bg-[#18181b] flex items-center justify-center mb-4">
                <Smartphone size={24} className="text-gray-500" />
              </div>
              <p className="text-sm text-gray-400 mb-2">Generating QR code...</p>
              <p className="text-xs text-gray-500">Please wait while the preview loads</p>
            </div>
          )}
        </div>
      )}
      
      {/* Bottom Actions */}
      <div className="p-4 border-t border-[#27272a] space-y-2">
        {onShowCode && (
          <button
            onClick={onShowCode}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#18181b] border border-[#27272a] text-gray-300 rounded-lg text-sm font-medium hover:bg-[#27272a] transition-colors"
          >
            <Code size={14} />
            View Code
          </button>
        )}
        
        <button
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          <Share2 size={14} />
          Share App
        </button>
      </div>
    </div>
  );
}
