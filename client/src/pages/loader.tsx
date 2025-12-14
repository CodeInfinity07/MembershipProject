import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, LogIn, LogOut } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BotStatus {
  botId: string;
  name: string;
  gc: string;
  source: string;
  connected: boolean;
  inClub: boolean;
  membership?: boolean;
}

interface StatsResponse {
  success: boolean;
  stats: {
    totalBots: number;
    connected: number;
    inClub: number;
  };
  bots: BotStatus[];
}

export default function LoaderPage() {
  const { toast } = useToast();
  const [clubCode, setClubCode] = useState("6684622");
  
  // Fetch connected bots from bot management
  const { data, isLoading, error } = useQuery<StatsResponse>({
    queryKey: ['/api/bots'],
    refetchInterval: 2000,
  });

  // Join mutation - joins all connected bots to the specified club
  const joinMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/loader/join', { clubCode });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message);
      }
      return result;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/bots'] });
      toast({ title: "Joining club", description: data.message });
    },
    onError: (error: any) => {
      toast({ title: "Failed to join club", description: error.message, variant: "destructive" });
    },
  });

  // Leave/Stop mutation
  const stopMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/loader/stop'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bots'] });
      toast({ title: "Left club and disconnected" });
    },
    onError: () => {
      toast({ title: "Failed to stop", variant: "destructive" });
    },
  });

  const stats = data?.stats || { totalBots: 0, connected: 0, inClub: 0 };
  const bots = data?.bots || [];
  
  // Filter to only show connected bots
  const connectedBots = bots.filter(bot => bot.connected);
  const inClubBots = bots.filter(bot => bot.inClub);
  
  // Can join if there are connected bots and club code is set
  const canJoin = connectedBots.length > 0 && clubCode.trim().length > 0;
  const hasBotsInClub = inClubBots.length > 0;

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Loader</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Loader</h1>
          <p className="text-destructive">Error loading status: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Loader</h1>
        <p className="text-muted-foreground">Join connected bots to a club</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Control Card */}
        <Card data-testid="card-loader-control">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-info/20 text-info">
              <User className="h-4 w-4" />
            </div>
            <CardTitle className="text-base">Loader Control</CardTitle>
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
                data-testid="input-club-code"
              />
            </div>

            <div className="rounded-md bg-muted p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Status
              </div>
              <div className="font-semibold font-mono" data-testid="text-loader-status">
                {hasBotsInClub ? `${inClubBots.length} bots in club` : connectedBots.length > 0 ? `${connectedBots.length} bots ready` : 'No connected bots'}
              </div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={() => joinMutation.mutate()}
                disabled={!canJoin || joinMutation.isPending}
                className="w-full"
                variant="default"
                data-testid="button-join"
              >
                <LogIn className="h-4 w-4 mr-2" />
                {joinMutation.isPending ? "Joining..." : `Join Club (${connectedBots.length} bots)`}
              </Button>

              <Button
                onClick={() => stopMutation.mutate()}
                disabled={!hasBotsInClub || stopMutation.isPending}
                className="w-full"
                variant="destructive"
                data-testid="button-stop"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {stopMutation.isPending ? "Leaving..." : "Leave Club"}
              </Button>
            </div>

            {connectedBots.length === 0 && (
              <div className="text-sm text-muted-foreground text-center p-2 bg-muted rounded-md">
                Connect bots first from the "Connect Bots" page
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Connection Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-muted p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Connected
                  </div>
                  <div className="font-semibold font-mono text-info" data-testid="text-connected">
                    {stats.connected}
                  </div>
                </div>
                <div className="rounded-md bg-muted p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    In Club
                  </div>
                  <div className="font-semibold font-mono text-success" data-testid="text-in-club">
                    {stats.inClub}
                  </div>
                </div>
                <div className="rounded-md bg-muted p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Total Bots
                  </div>
                  <div className="font-semibold font-mono" data-testid="text-total">
                    {stats.totalBots}
                  </div>
                </div>
                <div className="rounded-md bg-muted p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Target Club
                  </div>
                  <div className="font-semibold font-mono" data-testid="text-target-club">
                    {clubCode || 'Not Set'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress Card */}
          {connectedBots.length > 0 && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">In Club</span>
                    <span className="font-semibold">{inClubBots.length} / {connectedBots.length}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-success h-2 rounded-full transition-all"
                      style={{ width: `${connectedBots.length > 0 ? (inClubBots.length / connectedBots.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Connected Bots List */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-info/20 text-info">
            <User className="h-4 w-4" />
          </div>
          <CardTitle className="text-base">Connected Bots ({connectedBots.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {connectedBots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No connected bots. Go to "Connect Bots" page to connect bots first.
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {connectedBots.map((bot, index) => (
                <div key={bot.botId || index} className="flex items-center justify-between p-3 rounded-md bg-muted">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${
                      bot.inClub ? 'bg-success' : 'bg-info'
                    }`} />
                    <div>
                      <div className="font-semibold text-sm">{bot.name || `Bot ${index + 1}`}</div>
                      <div className="text-xs text-muted-foreground font-mono">{bot.gc || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {bot.inClub ? 'In Club' : 'Connected'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}