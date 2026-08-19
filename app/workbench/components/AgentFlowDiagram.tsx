import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Sparkles, 
  Terminal, 
  Cpu, 
  Zap, 
  Layers, 
  Play,
  RotateCcw,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgentWorkspace } from '../../context/AgentContext';

export function AgentFlowDiagram() {
  const { state } = useAgentWorkspace();
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState<number>(0);

  const agentName = state.manifest.name || 'agent-orchestrator';
  const tools = state.manifest.tools || ['file_search', 'code_runner'];

  const runSimulation = () => {
    setIsSimulating(true);
    setSimStep(1);
    const intervals = [
      setTimeout(() => setSimStep(2), 600),
      setTimeout(() => setSimStep(3), 1300),
      setTimeout(() => setSimStep(4), 2000),
      setTimeout(() => setSimStep(5), 2700),
      setTimeout(() => {
        setIsSimulating(false);
        setSimStep(0);
      }, 3500)
    ];
    return () => intervals.forEach(clearTimeout);
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0F19] text-[#F3F4F6] p-4 overflow-y-auto rounded-xl border border-[#222E47] shadow-inner font-sans select-none">
      {/* Header with Title & Simulation */}
      <div className="flex items-center justify-between pb-3 border-b border-[#222E47]/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#A855F7] animate-pulse" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#A855F7]">
              Gateway Orchestration Flow
            </h4>
            <span className="text-[9px] font-mono bg-[#1E293B] text-[#94A3B8] px-1.5 py-0.5 rounded border border-[#2E3B52]">
              REV 2.0
            </span>
          </div>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">
            Functional color token mapping & deterministic worker routing
          </p>
        </div>

        <button
          onClick={runSimulation}
          disabled={isSimulating}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm",
            isSimulating
              ? "bg-[#A855F7]/30 text-[#A855F7] cursor-wait"
              : "bg-[#A855F7] hover:bg-[#9333EA] text-white hover:scale-[1.02] active:scale-[0.98]"
          )}
        >
          {isSimulating ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                <RotateCcw className="h-3.5 w-3.5" />
              </motion.div>
              Simulating Packet...
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current" />
              Simulate Pipeline
            </>
          )}
        </button>
      </div>

      {/* Main Flow Container */}
      <div className="flex-1 flex flex-col justify-center py-4 min-h-[360px]">
        <div className="grid grid-cols-12 gap-3 items-center">
          {/* 1. Raw Input Node (Muted Ink #9CA3AF) */}
          <div 
            onClick={() => setActiveStep(1)}
            className={cn(
              "col-span-12 lg:col-span-2 p-3 rounded-lg border transition-all cursor-pointer",
              "bg-[#1A2338] border-[#374151]",
              (activeStep === 1 || simStep === 1) && "ring-2 ring-[#9CA3AF] shadow-lg shadow-[#9CA3AF]/20"
            )}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-bold text-[#9CA3AF]">RAW INPUT</span>
              <Terminal className="h-3.5 w-3.5 text-[#9CA3AF]" />
            </div>
            <div className="text-xs font-bold text-[#E5E7EB] truncate">
              User / API Payload
            </div>
            <div className="mt-2 text-[10px] font-mono text-[#9CA3AF] bg-[#111827]/80 p-1.5 rounded border border-[#374151]">
              Token: #9CA3AF<br />
              (Muted Ink)
            </div>
          </div>

          {/* Connection Arrow */}
          <div className="hidden lg:flex col-span-1 justify-center">
            <ArrowRight className={cn("h-4 w-4 transition-colors", simStep >= 2 ? "text-[#A855F7]" : "text-[#4B5563]")} />
          </div>

          {/* 2. Central Orchestration & Workers Box (Deep Indigo Surface) */}
          <div className="col-span-12 lg:col-span-6 bg-[#131B2E] border border-[#2E3B52] rounded-xl p-3.5 relative shadow-xl">
            <div className="absolute -top-2.5 left-3 px-2 py-0.5 bg-[#0B0F19] text-[9px] font-mono font-bold text-[#A855F7] border border-[#A855F7]/40 rounded">
              CENTRAL ORCHESTRATOR & WORKERS
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
              {/* Central Routing Logic (Bruised Orchid #A855F7) */}
              <div 
                onClick={() => setActiveStep(2)}
                className={cn(
                  "p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between",
                  "bg-[#1F1633] border-[#A855F7]/40 text-[#F3F4F6]",
                  (activeStep === 2 || simStep === 2) && "ring-2 ring-[#A855F7] shadow-lg shadow-[#A855F7]/30"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-[#D8B4FE]">ORCHESTRATOR</span>
                    <Cpu className="h-3.5 w-3.5 text-[#A855F7]" />
                  </div>
                  <div className="text-xs font-bold text-white">
                    {agentName}
                  </div>
                  <div className="text-[10px] text-[#D8B4FE]/80 mt-1">
                    Central Routing Logic (`#A855F7`)
                  </div>
                </div>

                {/* Glass Box Internal Terminal Snippet */}
                <div className="mt-3 bg-[#0B0F19]/90 border border-[#A855F7]/30 rounded p-1.5 font-mono text-[9px] text-[#A855F7] leading-tight overflow-hidden">
                  <div className="text-[#9CA3AF]">// schema validation</div>
                  <span className="text-[#A3E635]">"status":</span> "routed",<br />
                  <span className="text-[#FB923C]">"worker":</span> "parallel"
                </div>
              </div>

              {/* Workers Stack */}
              <div className="space-y-2">
                {/* Validation Worker (Lime Green #A3E635) */}
                <div 
                  onClick={() => setActiveStep(3)}
                  className={cn(
                    "p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between",
                    "bg-[#13281E] border-[#A3E635]/40",
                    (activeStep === 3 || simStep === 3) && "ring-2 ring-[#A3E635] shadow-md shadow-[#A3E635]/20"
                  )}
                >
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono font-bold text-[#A3E635]">
                      Validation Worker
                    </div>
                    <div className="text-[10px] text-[#86EFAC] truncate">
                      Contract & Schema (`#A3E635`)
                    </div>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-[#A3E635] shrink-0" />
                </div>

                {/* Processing Worker (Orange #FB923C) */}
                <div 
                  onClick={() => setActiveStep(4)}
                  className={cn(
                    "p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between",
                    "bg-[#2C1C13] border-[#FB923C]/40",
                    (activeStep === 4 || simStep === 3) && "ring-2 ring-[#FB923C] shadow-md shadow-[#FB923C]/20"
                  )}
                >
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono font-bold text-[#FB923C]">
                      Processing Worker
                    </div>
                    <div className="text-[10px] text-[#FDBA74] truncate">
                      Transformation (`#FB923C`)
                    </div>
                  </div>
                  <Zap className="h-4 w-4 text-[#FB923C] shrink-0" />
                </div>

                {/* Security Worker (Coral Red #F87171) */}
                <div 
                  onClick={() => setActiveStep(5)}
                  className={cn(
                    "p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between",
                    "bg-[#2C1518] border-[#F87171]/40",
                    (activeStep === 5 || simStep === 3) && "ring-2 ring-[#F87171] shadow-md shadow-[#F87171]/20"
                  )}
                >
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono font-bold text-[#F87171]">
                      Security Worker
                    </div>
                    <div className="text-[10px] text-[#FCA5A5] truncate">
                      Critique & Safety (`#F87171`)
                    </div>
                  </div>
                  <ShieldAlert className="h-4 w-4 text-[#F87171] shrink-0" />
                </div>
              </div>
            </div>
          </div>

          {/* Connection Arrow */}
          <div className="hidden lg:flex col-span-1 justify-center">
            <ArrowRight className={cn("h-4 w-4 transition-colors", simStep >= 4 ? "text-[#FBBF24]" : "text-[#4B5563]")} />
          </div>

          {/* 3. Aggregation & Formatted Output */}
          <div className="col-span-12 lg:col-span-2 space-y-3">
            {/* Aggregation Node (Amber Gold #FBBF24) */}
            <div 
              onClick={() => setActiveStep(6)}
              className={cn(
                "p-2.5 rounded-lg border transition-all cursor-pointer",
                "bg-[#292211] border-[#FBBF24]/50",
                (activeStep === 6 || simStep === 4) && "ring-2 ring-[#FBBF24] shadow-md shadow-[#FBBF24]/20"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono font-bold text-[#FBBF24]">SYNTHESIS</span>
                <Layers className="h-3.5 w-3.5 text-[#FBBF24]" />
              </div>
              <div className="text-[11px] font-bold text-[#FEF08A]">
                Aggregation Node
              </div>
              <div className="text-[9px] text-[#FDE047] font-mono mt-0.5">
                Token: `#FBBF24`
              </div>
            </div>

            {/* Formatted Output (Sage Green #A1B281) */}
            <div 
              onClick={() => setActiveStep(7)}
              className={cn(
                "p-2.5 rounded-lg border transition-all cursor-pointer",
                "bg-[#17241E] border-[#A1B281]/50",
                (activeStep === 7 || simStep === 5) && "ring-2 ring-[#A1B281] shadow-md shadow-[#A1B281]/30"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono font-bold text-[#A1B281]">OUTPUT</span>
                <Sparkles className="h-3.5 w-3.5 text-[#A1B281]" />
              </div>
              <div className="text-[11px] font-bold text-[#D1FAE5]">
                Formatted Response
              </div>
              <div className="text-[9px] text-[#A1B281] font-mono mt-0.5">
                Ink Primary (`#F3F4F6`)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info & Verification Spec Notes */}
      <div className="mt-2 pt-2.5 border-t border-[#222E47]/70 flex flex-wrap items-center justify-between text-[11px] text-[#9CA3AF] gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="h-2 w-2 rounded-full bg-[#A855F7]" />
            Bruised Orchid (AA Pass)
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="h-2 w-2 rounded-full bg-[#A3E635]" />
            Validation
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="h-2 w-2 rounded-full bg-[#FB923C]" />
            Transform
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="h-2 w-2 rounded-full bg-[#F87171]" />
            Security
          </span>
        </div>

        <div className="font-mono text-[10px] text-[#6B7280]">
          Approved for Agent Handoff • [OTHER STEVE]
        </div>
      </div>
    </div>
  );
}
