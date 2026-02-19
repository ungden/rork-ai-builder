'use client';

import type { ReactNode } from 'react';
import { useAgentStore } from '@/stores/agentStore';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  FileCode2, 
  Lightbulb,
  TestTube,
  Bug,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import type { AgentPhase } from '@ai-engine/core';

const PHASE_INFO: Record<AgentPhase, { label: string; icon: ReactNode; color: string }> = {
  idle: { label: 'Ready', icon: <Sparkles className="w-4 h-4" />, color: 'text-gray-400' },
  planning: { label: 'Planning', icon: <Lightbulb className="w-4 h-4" />, color: 'text-yellow-400' },
  coding: { label: 'Coding', icon: <FileCode2 className="w-4 h-4" />, color: 'text-blue-400' },
  testing: { label: 'Testing', icon: <TestTube className="w-4 h-4" />, color: 'text-purple-400' },
  debugging: { label: 'Debugging', icon: <Bug className="w-4 h-4" />, color: 'text-orange-400' },
  complete: { label: 'Complete', icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-green-400' },
  error: { label: 'Error', icon: <XCircle className="w-4 h-4" />, color: 'text-red-400' },
};

export function AgentStatus() {
  const [expanded, setExpanded] = useState(false);
  const { 
    isRunning, 
    phase, 
    plan, 
    planProgress,
    progress, 
    currentTool,
    files,
    iterations,
    error,
    summary,
  } = useAgentStore();
  
  const phaseInfo = PHASE_INFO[phase];
  const createdCount = Object.values(files).filter(f => 
    f.status === 'created' || f.status === 'updated'
  ).length;
  const pendingCount = Object.values(files).filter(f => f.status === 'pending').length;
  
  if (phase === 'idle' && !isRunning) {
    return null;
  }
  
  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-lg overflow-hidden">
      {/* Header */}
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-[#27272a]/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isRunning ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          ) : (
            <span className={phaseInfo.color}>{phaseInfo.icon}</span>
          )}
          <span className={`text-sm font-medium ${phaseInfo.color}`}>
            {phaseInfo.label}
          </span>
          {isRunning && planProgress && planProgress.totalFiles > 0 && (
            <span className="text-xs text-gray-500">
              ({planProgress.completedFiles}/{planProgress.totalFiles}: {planProgress.currentFile.split('/').pop()})
            </span>
          )}
          {isRunning && !planProgress && currentTool && (
            <span className="text-xs text-gray-500">
              ({currentTool})
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {plan && (
            <span className="text-xs text-gray-500">
              {createdCount}/{plan.fileTree.length} files
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </button>
      
      {/* Progress bar */}
      <div className="h-1 bg-[#27272a]">
        <div 
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Expanded content */}
      {expanded && (
        <div className="p-3 border-t border-[#27272a] max-h-64 overflow-y-auto custom-scrollbar">
          {/* Plan info */}
          {plan && (
            <div className="mb-3 pb-3 border-b border-[#27272a]">
              <div className="text-xs text-gray-400 mb-1">Building: {plan.appName}</div>
              <div className="flex flex-wrap gap-1">
                {plan.features.slice(0, 5).map((feature, i) => (
                  <span 
                    key={i}
                    className="px-1.5 py-0.5 bg-[#27272a] rounded text-[10px] text-gray-400"
                  >
                    {feature}
                  </span>
                ))}
                {plan.features.length > 5 && (
                  <span className="text-[10px] text-gray-500">
                    +{plan.features.length - 5} more
                  </span>
                )}
              </div>
              {plan.planSteps && plan.planSteps.length > 0 && (
                <div className="mt-2 space-y-1">
                  {plan.planSteps.slice(0, 4).map((step, i) => (
                    <div key={`${step}-${i}`} className="text-[10px] text-gray-500">
                      {i + 1}. {step}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* File list */}
          {Object.keys(files).length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-gray-400 mb-2">Files</div>
              {Object.values(files).slice(0, 10).map((file) => (
                <div 
                  key={file.path}
                  className="flex items-center gap-2 text-xs"
                >
                  <span className={
                    file.status === 'created' ? 'text-green-400' :
                    file.status === 'updated' ? 'text-blue-400' :
                    file.status === 'error' ? 'text-red-400' :
                    'text-gray-500'
                  }>
                    {file.status === 'created' && '+'}
                    {file.status === 'updated' && '~'}
                    {file.status === 'pending' && '...'}
                    {file.status === 'error' && '!'}
                  </span>
                  <span className="text-gray-300 truncate">{file.path}</span>
                </div>
              ))}
              {Object.keys(files).length > 10 && (
                <div className="text-[10px] text-gray-500 pl-4">
                  +{Object.keys(files).length - 10} more files
                </div>
              )}
            </div>
          )}
          
          {/* Error display */}
          {error && (
            <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
              {error}
            </div>
          )}
          
          {/* Completion summary */}
          {phase === 'complete' && summary && (
            <div className="mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-400">
              {summary}
            </div>
          )}
          
          {/* Stats */}
          <div className="mt-3 pt-3 border-t border-[#27272a] flex gap-4 text-[10px] text-gray-500">
            <span>Iterations: {iterations}</span>
            <span>Created: {createdCount}</span>
            {pendingCount > 0 && <span>Pending: {pendingCount}</span>}
          </div>
        </div>
      )}
    </div>
  );
}


