import { useEffect, useRef } from 'react';
import { 
  IconTrash,
  IconBug
} from '@tabler/icons-react';

interface LogPanelProps {
  infoLogs: Array<{ timestamp: string; message: string }>;
  debugLogs: Array<{ timestamp: string; message: string }>;
  onClearInfo: () => void;
  onClearDebug: () => void;
}

export function LogPanel({ infoLogs, debugLogs, onClearInfo, onClearDebug }: LogPanelProps) {
  const infoContainerRef = useRef<HTMLDivElement>(null);
  const debugContainerRef = useRef<HTMLDivElement>(null);
  const prevInfoLengthRef = useRef(infoLogs.length);
  const prevDebugLengthRef = useRef(debugLogs.length);

  useEffect(() => {
    // Only auto-scroll if new logs were added
    if (infoContainerRef.current && infoLogs.length > prevInfoLengthRef.current) {
      infoContainerRef.current.scrollTop = infoContainerRef.current.scrollHeight;
    }
    prevInfoLengthRef.current = infoLogs.length;
  }, [infoLogs]);

  useEffect(() => {
    // Only auto-scroll if new logs were added
    if (debugContainerRef.current && debugLogs.length > prevDebugLengthRef.current) {
      debugContainerRef.current.scrollTop = debugContainerRef.current.scrollHeight;
    }
    prevDebugLengthRef.current = debugLogs.length;
  }, [debugLogs]);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Info Logs Section */}
      <div className="flex flex-col border-b border-gray-200">
        <div className="flex items-center justify-between pl-4 pr-8 py-2 bg-gray-50 shrink-0">
          <div className="text-xs font-semibold text-gray-700">Info</div>
          <button 
            onClick={onClearInfo}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-200 rounded transition-colors"
            title="Clear info log"
          >
            <IconTrash size={14} />
          </button>
        </div>
        <div ref={infoContainerRef} className="max-h-48 overflow-y-auto font-mono text-xs scrollbar-thin">
          {infoLogs.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-gray-400 text-xs">
              No info logs
            </div>
          ) : (
            <div>
              {infoLogs.map((log, i) => {
                const isError = log.message.includes('❌');
                
                return (
                  <div
                    key={`info-${log.timestamp}-${i}`}
                    className={`px-3 py-1.5 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      isError ? 'bg-red-50/30' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-[10px]">{log.timestamp}</span>
                      <span className={`font-medium ${
                        isError ? 'text-red-600' : 'text-gray-700'
                      }`}>
                        {log.message}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Debug Output Section */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between pl-4 pr-8 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
          <div className="text-xs font-semibold text-gray-700">Debug Output</div>
          <button 
            onClick={onClearDebug}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-200 rounded transition-colors"
            title="Clear debug output"
          >
            <IconTrash size={14} />
          </button>
        </div>
        
        <div ref={debugContainerRef} className="flex-1 overflow-y-auto font-mono text-xs scrollbar-thin pb-20">
          {debugLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
              <IconBug size={32} className="mb-2 opacity-20" />
              <div className="text-sm">No debug output</div>
            </div>
          ) : (
            <div>
              {debugLogs.map((log, i) => {
                // Check if this is a combined log [NodeName] data
                const combinedMatch = log.message.match(/^\[(.+?)\]\s+(.+)$/s);
                
                return (
                  <div
                    key={`debug-${log.timestamp}-${i}`}
                    className="p-2 border-b border-gray-100 hover:bg-blue-50 transition-colors"
                  >
                    <div className="text-gray-400 text-[10px] mb-0.5">
                      {log.timestamp}
                    </div>
                    
                    {combinedMatch ? (
                      <>
                        <div className="text-blue-800/70 font-medium mb-0.5">
                          [{combinedMatch[1]}]
                        </div>
                        <div className="whitespace-pre-wrap break-words font-medium text-blue-700">
                          {combinedMatch[2]}
                        </div>
                      </>
                    ) : (
                      <div className={`whitespace-pre-wrap break-words font-medium ${
                        log.message.includes('[Code]') ? 'text-purple-700' : 'text-gray-700'
                      }`}>
                        {log.message}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
