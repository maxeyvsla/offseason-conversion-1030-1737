'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ApiCall } from '@/types/api';

interface DebugPanelProps {
  apiCalls: ApiCall[];
}

export default function DebugPanel({ apiCalls }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(apiCalls[0]?.id || '');

  if (!apiCalls.length) return null;

  const renderStatusIndicator = (status: number) => {
    const isError = status >= 400;
    const statusClass = isError ? 'bg-red-500' : 'bg-green-500';
    return (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${statusClass}`} />
        <span className="text-xs">Status: {status}</span>
      </div>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-slate-50 z-50 max-h-[80vh] flex flex-col">
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="flex-1">
        <CollapsibleTrigger asChild>
          <div 
            className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-slate-800"
            role="button"
            tabIndex={0}
          >
            <h2 className="text-sm font-semibold">Debug Panel</h2>
            <Button variant="ghost" size="sm" className="w-9 p-0">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-slate-800 mx-4 mt-2 sticky top-0 z-10">
              {apiCalls.map((call) => (
                <TabsTrigger
                  key={call.id}
                  value={call.id}
                  className="data-[state=active]:bg-slate-700"
                >
                  {call.request.url.split('/').pop()}
                  {renderStatusIndicator(call.response.status)}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="overflow-auto max-h-[calc(80vh-80px)]">
              {apiCalls.map((call) => (
                <TabsContent key={call.id} value={call.id} className="p-4 space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-slate-400">Request</h3>
                    <div className="rounded bg-slate-800 p-4">
                      <pre className="text-xs">{JSON.stringify(call.request, null, 2)}</pre>
                    </div>
                  </div>

                  {call.acuityData && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-slate-400">Acuity Data</h3>
                      <div className="rounded bg-slate-800 p-4">
                        <pre className="text-xs">{JSON.stringify(call.acuityData, null, 2)}</pre>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-slate-400">Response</h3>
                    <div className="rounded bg-slate-800 p-4">
                      <pre className="text-xs">{JSON.stringify(call.response, null, 2)}</pre>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}