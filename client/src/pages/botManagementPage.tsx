import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Network, Link as LinkIcon, LogIn, LogOut, Power, PowerOff } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Bot {
  botId: string;
  name: string;
  gc: string;
  source: 'main' | 'loader';
  connected: boolean;
  inClub: boolean;
  clubCode: string | null;
  status: string;
  uptime: number;
}

interface BotsResponse {
  success: boolean;
  bots: Bot[];
  stats: {
    totalBots: number;
    connected: number;
    mainBots: number;
    loaderBots: number;
  };
}

interface AuthPrompt {
  botId: string;
  botName: string;
  message: any;
  timestamp: string;
}

export default function BotManagementPage() {
  const { toast } = useToast();
  const [clubCode, setClubCode] = useState("2341357");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "connected" | "disconnected" | "inClub">("all");
  const [filterSource, setFilterSource] = useState<"all" | "main" | "loader">("all");
  const [authPrompts, setAuthPrompts] = useState<AuthPrompt[]>([]);
  const [selectedAuthPrompt, setSelectedAuthPrompt] = useState<AuthPrompt | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  
  // Fetch all bots with status
  const { data, isLoading, error } = useQuery<BotsResponse>({
    queryKey: ['/api/bots'],
    refetchInterval: 2000,
  });

  // Fetch auth prompts
  const { data: promptsData } = useQuery<{ success: boolean; prompts: AuthPrompt[] }>({
    queryKey: ['/api/bots/auth/prompts'],
    refetchInterval: 1000,
  });

  // Update auth prompts state and show modal
  useEffect(() => {
    if (promptsData?.prompts && promptsData.prompts.length > 0) {
      setAuthPrompts(promptsData.prompts);
      if (!selectedAuthPrompt && promptsData.prompts.length > 0) {
        setSelectedAuthPrompt(promptsData.prompts[0]);
        setTokenInput("");
      }
    } else {
      setAuthPrompts([]);
      if (selectedAuthPrompt && promptsData?.prompts && promptsData.prompts.length === 0) {
        setSelectedAuthPrompt(null);
      }
    }
  }, [promptsData]);

  // Connect bot mutation
  const connectMutation = useMutation({
    mutationFn: (botId: string) => apiRequest('POST', `/api/bots/${botId}/connect`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bots'] });
      toast({ title: "Bot connecting..." });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to connect bot", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Disconnect bot mutation
  const disconnectMutation = useMutation({
    mutationFn: (botId: string) => apiRequest('POST', `/api/bots/${botId}/disconnect`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bots'] });
      toast({ title: "Bot disconnected" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to disconnect bot", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Join club mutation
  const joinMutation = useMutation({
    mutationFn: (botId: string) => 
      apiRequest('POST', `/api/bots/${botId}/join`, { clubCode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bots'] });
      toast({ title: "Bot joining club..." });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to join club", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Leave club mutation
  const leaveMutation = useMutation({
    mutationFn: (botId: string) => apiRequest('POST', `/api/bots/${botId}/leave`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bots'] });
      toast({ title: "Bot left club" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to leave club", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Send auth token mutation
  const sendTokenMutation = useMutation({
    mutationFn: (token: string) => {
      if (!selectedAuthPrompt) throw new Error("No auth prompt selected");
      return apiRequest('POST', `/api/bots/${selectedAuthPrompt.botId}/auth/token`, { token });
    },
    onSuccess: () => {
      toast({ title: "Token sent successfully" });
      setTokenInput("");
      setSelectedAuthPrompt(null);
      queryClient.invalidateQueries({ queryKey: ['/api/bots/auth/prompts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bots'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to send token", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Connect all disconnected bots
  const connectAllMutation = useMutation({
    mutationFn: async () => {
      if (!data?.bots) return;
      const disconnectedBots = data.bots
        .filter(bot => !bot.connected)
        .map(bot => bot.botId);
      
      return apiRequest('POST', '/api/bots/bulk/connect', { botIds: disconnectedBots });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bots'] });
      toast({ title: "Connecting all bots..." });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to connect all bots", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Disconnect all connected bots
  const disconnectAllMutation = useMutation({
    mutationFn: async () => {
      if (!data?.bots) return;
      const connectedBots = data.bots
        .filter(bot => bot.connected)
        .map(bot => bot.botId);
      
      return apiRequest('POST', '/api/bots/bulk/disconnect', { botIds: connectedBots });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bots'] });
      toast({ title: "Disconnecting all bots..." });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to disconnect all bots", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Format uptime
  const formatUptime = (ms: number) => {
    if (ms === 0) return "N/A";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  // Filter and search bots
  const filteredBots = data?.bots?.filter(bot => {
    // Search filter
    const matchesSearch = bot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bot.gc.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = 
      filterStatus === "all" ||
      (filterStatus === "connected" && bot.connected) ||
      (filterStatus === "disconnected" && !bot.connected) ||
      (filterStatus === "inClub" && bot.inClub);

    // Source filter
    const matchesSource = 
      filterSource === "all" || bot.source === filterSource;
    
    return matchesSearch && matchesStatus && matchesSource;
  }) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Bot Management</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Bot Management</h1>
          <p className="text-destructive">Error loading bots: {error.message}</p>
        </div>
      </div>
    );
  }

  const { stats } = data || { stats: { totalBots: 0, connected: 0, mainBots: 0, loaderBots: 0 } };
  const disconnectedCount = stats.totalBots - stats.connected;
  const inClubCount = data?.bots?.filter(b => b.inClub).length || 0;

  return (
    <>
      {/* Auth Prompt Modal */}
      <Dialog open={!!selectedAuthPrompt} onOpenChange={(open) => {
        if (!open) setSelectedAuthPrompt(null);
      }}>
        <DialogContent className="sm:max-w-xl flex flex-col max-h-[85vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>Authentication Required - {selectedAuthPrompt?.botName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-w-0 space-y-3 px-1">
            <div className="space-y-1">
              <Label className="text-xs">WebSocket Message Data (Base64)</Label>
              <div className="bg-muted p-2 rounded-md text-xs font-mono overflow-x-auto border border-border max-h-[200px] overflow-y-auto">
                <pre className="whitespace-pre-wrap break-all m-0 text-xs">
                  {selectedAuthPrompt?.message}
                </pre>
              </div>
            </div>
            <div className="space-y-1 shrink-0">
              <Label htmlFor="auth-token" className="text-xs">Authentication Token</Label>
              <Input
                id="auth-token"
                placeholder="Enter token"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                disabled={sendTokenMutation.isPending}
                data-testid="input-auth-token"
                className="text-sm h-8"
              />
            </div>
          </div>
          <div className="flex gap-2 shrink-0 pt-2 border-t">
            <Button
              onClick={() => sendTokenMutation.mutate(tokenInput)}
              disabled={!tokenInput.trim() || sendTokenMutation.isPending}
              className="flex-1"
              size="sm"
              data-testid="button-send-token"
            >
              {sendTokenMutation.isPending ? "Sending..." : "Send Token"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedAuthPrompt(null)}
              disabled={sendTokenMutation.isPending}
              className="flex-1"
              size="sm"
              data-testid="button-cancel-auth"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Bot Management</h1>
        <p className="text-muted-foreground">Manage all bot connections centrally</p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Bots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBots}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.mainBots} main + {stats.loaderBots} loader
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Connected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{stats.connected}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Disconnected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{disconnectedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Club</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{inClubCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bulk Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clubCode" className="text-xs text-muted-foreground uppercase">
              Club Code
            </Label>
            <Input
              id="clubCode"
              type="text"
              value={clubCode}
              onChange={(e) => setClubCode(e.target.value)}
              placeholder="Enter club code..."
              className="font-mono"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              onClick={() => connectAllMutation.mutate()}
              disabled={connectAllMutation.isPending || disconnectedCount === 0}
              className="w-full"
              variant="default"
            >
              <Power className="h-4 w-4 mr-2" />
              Connect All ({disconnectedCount})
            </Button>

            <Button
              onClick={() => {
                if (confirm(`Disconnect all ${stats.connected} connected bots?`)) {
                  disconnectAllMutation.mutate();
                }
              }}
              disabled={disconnectAllMutation.isPending || stats.connected === 0}
              className="w-full"
              variant="destructive"
            >
              <PowerOff className="h-4 w-4 mr-2" />
              Disconnect All ({stats.connected})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="search" className="text-xs text-muted-foreground uppercase">
                Search
              </Label>
              <Input
                id="search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or GC..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filterStatus" className="text-xs text-muted-foreground uppercase">
                Status Filter
              </Label>
              <select
                id="filterStatus"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="all">All Bots ({stats.totalBots})</option>
                <option value="connected">Connected Only ({stats.connected})</option>
                <option value="disconnected">Disconnected Only ({disconnectedCount})</option>
                <option value="inClub">In Club Only ({inClubCount})</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filterSource" className="text-xs text-muted-foreground uppercase">
                Source Filter
              </Label>
              <select
                id="filterSource"
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value as any)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="all">All Sources ({stats.totalBots})</option>
                <option value="main">Main Bots ({stats.mainBots})</option>
                <option value="loader">Loader Bots ({stats.loaderBots})</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bot List */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-info/20 text-info">
            <Network className="h-4 w-4" />
          </div>
          <CardTitle className="text-base">
            Bots ({filteredBots.length} {searchTerm || filterStatus !== "all" || filterSource !== "all" ? "filtered" : "total"})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || filterStatus !== "all" || filterSource !== "all"
                ? "No bots match your filters" 
                : "No bots available"}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBots.map((bot) => (
                <Card key={bot.botId} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Bot Info */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`h-3 w-3 rounded-full mt-1 flex-shrink-0 ${
                          bot.inClub ? 'bg-success animate-pulse' : 
                          bot.connected ? 'bg-info' : 
                          'bg-muted-foreground'
                        }`} />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-sm truncate">{bot.name}</div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              bot.source === 'main' 
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                                : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                            }`}>
                              {bot.source}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground font-mono truncate">
                            GC: {bot.gc}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              bot.inClub ? 'bg-success/20 text-success' :
                              bot.connected ? 'bg-info/20 text-info' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {bot.inClub ? 'In Club' : bot.connected ? 'Connected' : 'Disconnected'}
                            </span>
                            
                            {bot.clubCode && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                Club: {bot.clubCode}
                              </span>
                            )}
                            
                            {bot.connected && (
                              <span className="text-xs text-muted-foreground">
                                Uptime: {formatUptime(bot.uptime)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {!bot.connected ? (
                          <Button
                            size="sm"
                            onClick={() => connectMutation.mutate(bot.botId)}
                            disabled={connectMutation.isPending}
                            className="w-24"
                          >
                            <LinkIcon className="h-3 w-3 mr-1" />
                            Connect
                          </Button>
                        ) : (
                          <>
                            {!bot.inClub ? (
                              <Button
                                size="sm"
                                onClick={() => joinMutation.mutate(bot.botId)}
                                disabled={joinMutation.isPending || !clubCode.trim()}
                                className="w-24"
                              >
                                <LogIn className="h-3 w-3 mr-1" />
                                Join
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => leaveMutation.mutate(bot.botId)}
                                disabled={leaveMutation.isPending}
                                className="w-24"
                              >
                                <LogOut className="h-3 w-3 mr-1" />
                                Leave
                              </Button>
                            )}
                            
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => disconnectMutation.mutate(bot.botId)}
                              disabled={disconnectMutation.isPending}
                              className="w-24"
                            >
                              <PowerOff className="h-3 w-3 mr-1" />
                              Disconnect
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>• All bots (main + loader) are managed from this central location</div>
            <div>• Connected bots remain connected until manually disconnected</div>
            <div>• All tasks (membership, messages, mic) use these persistent connections</div>
            <div>• Use "Connect All" to connect all disconnected bots at once</div>
            <div>• Bots automatically send keepalive messages to maintain connections</div>
            <div className="pt-2 border-t">
              <span className="font-semibold">Main Bots:</span> {stats.mainBots} | <span className="font-semibold">Loader Bots:</span> {stats.loaderBots}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
}