import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, HeartPulse, TrendingDown, TrendingUp, DollarSign, Calculator } from 'lucide-react';

export default function App() {
  // Global Parameters
  const [discountRate, setDiscountRate] = useState<number>(0.03);
  const [standardLifeExpectancy, setStandardLifeExpectancy] = useState<number>(85);
  const [currentAge, setCurrentAge] = useState<number>(50);

  // Baseline Parameters
  const [baselineCost, setBaselineCost] = useState<number>(10000);
  const [baselineLifeExpectancy, setBaselineLifeExpectancy] = useState<number>(10);
  const [baselineUtility, setBaselineUtility] = useState<number>(0.6);
  const [baselineDisabilityWeight, setBaselineDisabilityWeight] = useState<number>(0.4);

  // Intervention Parameters
  const [interventionCost, setInterventionCost] = useState<number>(50000);
  const [interventionLifeExpectancy, setInterventionLifeExpectancy] = useState<number>(15);
  const [interventionUtility, setInterventionUtility] = useState<number>(0.85);
  const [interventionDisabilityWeight, setInterventionDisabilityWeight] = useState<number>(0.15);

  // Calculations
  const calculateQALYs = (le: number, utility: number, rate: number) => {
    let qalys = 0;
    for (let t = 0; t < le; t++) {
      qalys += utility / Math.pow(1 + rate, t);
    }
    return qalys;
  };

  const calculateDALYs = (le: number, dw: number, standardLe: number, age: number, rate: number) => {
    let yll = 0;
    const yearsLost = Math.max(0, standardLe - (age + le));
    for (let t = 0; t < yearsLost; t++) {
      yll += 1 / Math.pow(1 + rate, le + t);
    }

    let yld = 0;
    for (let t = 0; t < le; t++) {
      yld += dw / Math.pow(1 + rate, t);
    }

    return { yll, yld, total: yll + yld };
  };

  const results = useMemo(() => {
    const baseQALY = calculateQALYs(baselineLifeExpectancy, baselineUtility, discountRate);
    const intQALY = calculateQALYs(interventionLifeExpectancy, interventionUtility, discountRate);
    const incQALY = intQALY - baseQALY;

    const baseDALY = calculateDALYs(baselineLifeExpectancy, baselineDisabilityWeight, standardLifeExpectancy, currentAge, discountRate);
    const intDALY = calculateDALYs(interventionLifeExpectancy, interventionDisabilityWeight, standardLifeExpectancy, currentAge, discountRate);
    const avertedDALY = baseDALY.total - intDALY.total;

    const incCost = interventionCost - baselineCost;

    const icerQALY = incQALY > 0 ? incCost / incQALY : Infinity;
    const icerDALY = avertedDALY > 0 ? incCost / avertedDALY : Infinity;

    return {
      baseQALY, intQALY, incQALY,
      baseDALY, intDALY, avertedDALY,
      incCost, icerQALY, icerDALY
    };
  }, [
    baselineCost, baselineLifeExpectancy, baselineUtility, baselineDisabilityWeight,
    interventionCost, interventionLifeExpectancy, interventionUtility, interventionDisabilityWeight,
    discountRate, standardLifeExpectancy, currentAge
  ]);

  // Chart Data Generation
  const chartData = useMemo(() => {
    const data = [];
    const maxYears = Math.max(baselineLifeExpectancy, interventionLifeExpectancy, standardLifeExpectancy - currentAge);
    
    for (let t = 0; t <= maxYears; t++) {
      const discountFactor = Math.pow(1 + discountRate, t);
      
      // QALY Data
      const baseUtil = t < baselineLifeExpectancy ? baselineUtility : 0;
      const intUtil = t < interventionLifeExpectancy ? interventionUtility : 0;
      
      // DALY Data
      const baseDW = t < baselineLifeExpectancy ? baselineDisabilityWeight : (t < (standardLifeExpectancy - currentAge) ? 1 : 0);
      const intDW = t < interventionLifeExpectancy ? interventionDisabilityWeight : (t < (standardLifeExpectancy - currentAge) ? 1 : 0);

      data.push({
        year: t,
        age: currentAge + t,
        baseUtility: baseUtil / discountFactor,
        intUtility: intUtil / discountFactor,
        baseDisability: baseDW / discountFactor,
        intDisability: intDW / discountFactor,
      });
    }
    return data;
  }, [
    baselineLifeExpectancy, baselineUtility, baselineDisabilityWeight,
    interventionLifeExpectancy, interventionUtility, interventionDisabilityWeight,
    discountRate, standardLifeExpectancy, currentAge
  ]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  const formatNumber = (val: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(val);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Activity className="h-8 w-8 text-indigo-600" />
              Health Econ Analyzer
            </h1>
            <p className="text-slate-500 mt-1">Calculate and compare QALYs, DALYs, and ICER for medical interventions.</p>
          </div>
          <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex flex-col">
              <Label className="text-xs text-slate-500 mb-1">Discount Rate (%)</Label>
              <Input 
                type="number" 
                value={discountRate * 100} 
                onChange={e => setDiscountRate(Number(e.target.value) / 100)}
                className="w-24 h-8"
                step="0.1"
              />
            </div>
            <div className="flex flex-col">
              <Label className="text-xs text-slate-500 mb-1">Current Age</Label>
              <Input 
                type="number" 
                value={currentAge} 
                onChange={e => setCurrentAge(Number(e.target.value))}
                className="w-24 h-8"
              />
            </div>
            <div className="flex flex-col">
              <Label className="text-xs text-slate-500 mb-1">Target Life Exp.</Label>
              <Input 
                type="number" 
                value={standardLifeExpectancy} 
                onChange={e => setStandardLifeExpectancy(Number(e.target.value))}
                className="w-24 h-8"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Inputs Section */}
          <div className="lg:col-span-4 space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-slate-700">
                  <TrendingDown className="h-5 w-5 text-slate-400" />
                  Baseline (Standard of Care)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Total Cost ($)</Label>
                  <Input type="number" value={baselineCost} onChange={e => setBaselineCost(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Life Expectancy (Years)</Label>
                  <Input type="number" value={baselineLifeExpectancy} onChange={e => setBaselineLifeExpectancy(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Utility (0-1)</Label>
                    <span className="text-xs text-slate-500">{baselineUtility}</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.01" 
                    value={baselineUtility} 
                    onChange={e => setBaselineUtility(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Disability Weight (0-1)</Label>
                    <span className="text-xs text-slate-500">{baselineDisabilityWeight}</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.01" 
                    value={baselineDisabilityWeight} 
                    onChange={e => setBaselineDisabilityWeight(Number(e.target.value))}
                    className="w-full accent-rose-500"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-indigo-100 shadow-indigo-100/50">
              <CardHeader className="pb-4 bg-indigo-50/50 rounded-t-xl">
                <CardTitle className="flex items-center gap-2 text-indigo-700">
                  <TrendingUp className="h-5 w-5 text-indigo-500" />
                  New Intervention
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Total Cost ($)</Label>
                  <Input type="number" value={interventionCost} onChange={e => setInterventionCost(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Life Expectancy (Years)</Label>
                  <Input type="number" value={interventionLifeExpectancy} onChange={e => setInterventionLifeExpectancy(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Utility (0-1)</Label>
                    <span className="text-xs text-slate-500">{interventionUtility}</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.01" 
                    value={interventionUtility} 
                    onChange={e => setInterventionUtility(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Disability Weight (0-1)</Label>
                    <span className="text-xs text-slate-500">{interventionDisabilityWeight}</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.01" 
                    value={interventionDisabilityWeight} 
                    onChange={e => setInterventionDisabilityWeight(Number(e.target.value))}
                    className="w-full accent-rose-500"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results & Charts Section */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-slate-500">Incremental Cost</h3>
                    <div className="p-2 bg-slate-100 rounded-lg"><DollarSign className="h-4 w-4 text-slate-600" /></div>
                  </div>
                  <div className="text-3xl font-bold text-slate-900">{formatCurrency(results.incCost)}</div>
                  <p className="text-sm text-slate-500 mt-2">Difference in total costs</p>
                </CardContent>
              </Card>
              
              <Card className="bg-indigo-600 text-white border-indigo-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-indigo-100">ICER (per QALY)</h3>
                    <div className="p-2 bg-indigo-500 rounded-lg"><Calculator className="h-4 w-4 text-white" /></div>
                  </div>
                  <div className="text-3xl font-bold">
                    {results.icerQALY === Infinity || results.icerQALY < 0 ? 'Dominated' : formatCurrency(results.icerQALY)}
                  </div>
                  <p className="text-sm text-indigo-200 mt-2">
                    {formatNumber(results.incQALY)} QALYs gained
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-emerald-600 text-white border-emerald-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-emerald-100">ICER (per DALY)</h3>
                    <div className="p-2 bg-emerald-500 rounded-lg"><HeartPulse className="h-4 w-4 text-white" /></div>
                  </div>
                  <div className="text-3xl font-bold">
                    {results.icerDALY === Infinity || results.icerDALY < 0 ? 'Dominated' : formatCurrency(results.icerDALY)}
                  </div>
                  <p className="text-sm text-emerald-200 mt-2">
                    {formatNumber(results.avertedDALY)} DALYs averted
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">QALY Breakdown</CardTitle>
                  <CardDescription>Quality-Adjusted Life Years (Discounted)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-slate-500">Baseline QALYs</span>
                      <span className="font-medium">{formatNumber(results.baseQALY)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-slate-500">Intervention QALYs</span>
                      <span className="font-medium text-indigo-600">{formatNumber(results.intQALY)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-semibold text-slate-900">QALYs Gained</span>
                      <span className="font-bold text-lg text-emerald-600">+{formatNumber(results.incQALY)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">DALY Breakdown</CardTitle>
                  <CardDescription>Disability-Adjusted Life Years (Discounted)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-slate-500">Baseline DALYs</span>
                      <span className="font-medium">{formatNumber(results.baseDALY.total)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-slate-500">Intervention DALYs</span>
                      <span className="font-medium text-indigo-600">{formatNumber(results.intDALY.total)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-semibold text-slate-900">DALYs Averted</span>
                      <span className="font-bold text-lg text-emerald-600">{formatNumber(results.avertedDALY)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <Card>
              <CardHeader>
                <CardTitle>Utility & Disability Trajectories</CardTitle>
                <CardDescription>Discounted values over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorBaseUtil" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorIntUtil" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="age" 
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        label={{ value: 'Age', position: 'insideBottomRight', offset: -10, fill: '#64748b', fontSize: 12 }}
                      />
                      <YAxis 
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 1]}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        labelFormatter={(label) => `Age: ${label}`}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Area 
                        type="stepAfter" 
                        dataKey="baseUtility" 
                        name="Baseline Utility" 
                        stroke="#94a3b8" 
                        fillOpacity={1} 
                        fill="url(#colorBaseUtil)" 
                        strokeWidth={2}
                      />
                      <Area 
                        type="stepAfter" 
                        dataKey="intUtility" 
                        name="Intervention Utility" 
                        stroke="#4f46e5" 
                        fillOpacity={1} 
                        fill="url(#colorIntUtil)" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
