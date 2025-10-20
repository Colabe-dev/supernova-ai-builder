import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Activity, Cpu, Database, Coins } from "lucide-react";
import { SharedHeader } from "@/components/shared-header";

type TimeRange = "day" | "week" | "month";
type ChartType = "area" | "line" | "bar";

interface UsageSummary {
  ok: boolean;
  tokens_in: number;
  tokens_out: number;
  tasks: number;
  credits_available: number;
}

interface UsageSeries {
  ok: boolean;
  rows: Array<{
    day: string;
    tokens_in: number;
    tokens_out: number;
    tasks: number;
  }>;
}

export default function UsagePage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [chartType, setChartType] = useState<ChartType>("area");
  
  // Mock workspace ID - in production, get from auth context
  const workspaceId = "00000000-0000-0000-0000-000000000000";

  // Fetch usage summary
  const { data: summary, isLoading: summaryLoading, isError: summaryError } = useQuery<UsageSummary>({
    queryKey: ["/api/usage/summary", { workspace_id: workspaceId, range: timeRange }],
    enabled: !!workspaceId,
  });

  // Calculate date range for series
  const getDateRange = () => {
    const to = new Date().toISOString().split('T')[0];
    const from = new Date();
    
    switch (timeRange) {
      case 'day':
        from.setDate(from.getDate() - 1);
        break;
      case 'week':
        from.setDate(from.getDate() - 7);
        break;
      case 'month':
        from.setDate(from.getDate() - 30);
        break;
    }
    
    return { from: from.toISOString().split('T')[0], to };
  };

  const { from, to } = getDateRange();

  // Fetch time series data
  const { data: series, isLoading: seriesLoading, isError: seriesError } = useQuery<UsageSeries>({
    queryKey: ["/api/usage/series", { workspace_id: workspaceId, from, to }],
    enabled: !!workspaceId,
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderChart = () => {
    if (seriesLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading chart data...</div>
        </div>
      );
    }
    
    if (seriesError) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-destructive">Error loading chart data</div>
        </div>
      );
    }
    
    if (!series?.rows?.length) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No usage data available for this time range
        </div>
      );
    }

    const chartData = series.rows.map(row => ({
      date: formatDate(row.day),
      "Tokens In": row.tokens_in || 0,
      "Tokens Out": row.tokens_out || 0,
      "Tasks": row.tasks || 0,
    }));

    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    };

    switch (chartType) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="Tokens In" 
                stackId="1"
                stroke="hsl(var(--chart-1))" 
                fill="hsl(var(--chart-1))" 
                fillOpacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="Tokens Out" 
                stackId="1"
                stroke="hsl(var(--chart-2))" 
                fill="hsl(var(--chart-2))" 
                fillOpacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="Tasks" 
                stackId="2"
                stroke="hsl(var(--chart-3))" 
                fill="hsl(var(--chart-3))" 
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="Tokens In" 
                stroke="hsl(var(--chart-1))" 
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line 
                type="monotone" 
                dataKey="Tokens Out" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line 
                type="monotone" 
                dataKey="Tasks" 
                stroke="hsl(var(--chart-3))" 
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="Tokens In" fill="hsl(var(--chart-1))" />
              <Bar dataKey="Tokens Out" fill="hsl(var(--chart-2))" />
              <Bar dataKey="Tasks" fill="hsl(var(--chart-3))" />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SharedHeader />
      
      <main className="flex-1 container py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Usage Analytics</h1>
          <p className="text-muted-foreground">
            Monitor your AI token consumption, task execution, and credit balance
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card data-testid="card-tokens-in">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tokens In</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="h-7 w-24 bg-muted animate-pulse rounded" />
              ) : summaryError ? (
                <div className="text-sm text-destructive">Error loading data</div>
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="text-tokens-in">
                    {formatNumber(summary?.tokens_in || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {timeRange === 'day' ? 'Last 24 hours' : timeRange === 'week' ? 'Last 7 days' : 'Last 30 days'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-tokens-out">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tokens Out</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="h-7 w-24 bg-muted animate-pulse rounded" />
              ) : summaryError ? (
                <div className="text-sm text-destructive">Error loading data</div>
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="text-tokens-out">
                    {formatNumber(summary?.tokens_out || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {timeRange === 'day' ? 'Last 24 hours' : timeRange === 'week' ? 'Last 7 days' : 'Last 30 days'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-tasks">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasks</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="h-7 w-24 bg-muted animate-pulse rounded" />
              ) : summaryError ? (
                <div className="text-sm text-destructive">Error loading data</div>
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="text-tasks">
                    {formatNumber(summary?.tasks || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {timeRange === 'day' ? 'Last 24 hours' : timeRange === 'week' ? 'Last 7 days' : 'Last 30 days'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-credits">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credits Available</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="h-7 w-24 bg-muted animate-pulse rounded" />
              ) : summaryError ? (
                <div className="text-sm text-destructive">Error loading data</div>
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="text-credits">
                    {formatNumber(summary?.credits_available || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Total balance</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chart Section */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Usage Trends</CardTitle>
                <CardDescription>Visualize your usage patterns over time</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Time Range Selector */}
                <div className="flex gap-1">
                  <Badge
                    variant={timeRange === "day" ? "default" : "outline"}
                    className="cursor-pointer hover-elevate"
                    onClick={() => setTimeRange("day")}
                    data-testid="badge-range-day"
                  >
                    Daily
                  </Badge>
                  <Badge
                    variant={timeRange === "week" ? "default" : "outline"}
                    className="cursor-pointer hover-elevate"
                    onClick={() => setTimeRange("week")}
                    data-testid="badge-range-week"
                  >
                    Weekly
                  </Badge>
                  <Badge
                    variant={timeRange === "month" ? "default" : "outline"}
                    className="cursor-pointer hover-elevate"
                    onClick={() => setTimeRange("month")}
                    data-testid="badge-range-month"
                  >
                    Monthly
                  </Badge>
                </div>

                {/* Chart Type Selector */}
                <div className="flex gap-1">
                  <Badge
                    variant={chartType === "area" ? "secondary" : "outline"}
                    className="cursor-pointer hover-elevate"
                    onClick={() => setChartType("area")}
                    data-testid="badge-chart-area"
                  >
                    Area
                  </Badge>
                  <Badge
                    variant={chartType === "line" ? "secondary" : "outline"}
                    className="cursor-pointer hover-elevate"
                    onClick={() => setChartType("line")}
                    data-testid="badge-chart-line"
                  >
                    Line
                  </Badge>
                  <Badge
                    variant={chartType === "bar" ? "secondary" : "outline"}
                    className="cursor-pointer hover-elevate"
                    onClick={() => setChartType("bar")}
                    data-testid="badge-chart-bar"
                  >
                    Bar
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {seriesLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading chart data...</div>
              </div>
            ) : (
              renderChart()
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
