import { useState } from 'react'
import { callAIAgent, uploadFiles, type NormalizedAgentResponse } from '@/utils/aiAgent'
import { KnowledgeBaseUpload } from '@/components/KnowledgeBaseUpload'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  FileText,
  Upload,
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart,
  Shield,
  Loader2,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// =============================================================================
// Agent IDs (from workflow.json)
// =============================================================================

const DILIGENCE_COORDINATOR_AGENT_ID = '6970d8d41d92f5e2dd22a74a'
const LIQUIDITY_RISK_AGENT_ID = '6970d83dd6d0dcaec1118066'
const OPERATIONAL_EFFICIENCY_AGENT_ID = '6970d8581d92f5e2dd22a72a'
const SUSTAINABILITY_AGENT_ID = '6970d8781d92f5e2dd22a732'
const EXTERNAL_AUDITOR_AGENT_ID = '6970d8ae1d92f5e2dd22a73f'

const RAG_ID = '6970d82b42263af0ef9d3b9a'

// =============================================================================
// TypeScript Interfaces (from ACTUAL response schemas)
// =============================================================================

// Diligence Coordinator Response
interface DiligenceCoordinatorResult {
  executive_summary: string
  agent_findings: {
    liquidity_summary: string
    operational_summary: string
    sustainability_summary: string
    audit_summary: string
  }
  cross_cutting_themes: string[]
  critical_red_flags: string[]
  investment_recommendation: {
    decision: string
    confidence_level: string
    reasoning: string
    key_risks: string[]
    key_opportunities: string[]
  }
  required_actions: {
    immediate: string[]
    before_closing: string[]
    post_acquisition: string[]
  }
  deal_killers_identified: string[]
  valuation_considerations: string[]
}

// Liquidity Risk Agent Response
interface LiquidityRiskResult {
  cash_position: {
    current_cash: string
    burn_rate: string
    runway_months: string
  }
  working_capital: {
    current_ratio: string
    trends: any[]
    red_flags: any[]
  }
  debt_analysis: {
    total_debt: string
    covenant_status: string
    covenant_details: any[]
    refinancing_risks: any[]
  }
  liquidity_score: string
  immediate_concerns: any[]
  recommendations: any[]
}

// Operational Efficiency Agent Response
interface OperationalEfficiencyResult {
  margin_analysis: {
    gross_margin: string
    ebitda_margin: string
    margin_trends: string[]
    margin_concerns: string[]
  }
  cost_structure: {
    fixed_costs_pct: string
    variable_costs_pct: string
    cost_efficiency_rating: string
    cost_optimization_opportunities: string[]
  }
  operational_metrics: {
    capacity_utilization: string
    revenue_per_employee: string
    asset_turnover: string
    key_operational_kpis: Array<{
      metric: string
      value: string
      trend: string
    }>
  }
  operational_leverage: {
    rating: string
    scalability_assessment: string
  }
  cash_generation_sustainability: string
  findings: string[]
  recommendations: string[]
}

// Sustainability Agent Response
interface SustainabilityResult {
  one_time_items: Array<{
    description: string
    amount: string
    impact: string
  }>
  non_recurring_revenue: {
    total_amount: string
    percentage_of_revenue: string
    items: Array<{
      description: string
      amount: string
    }>
  }
  pro_forma_adjustments: {
    total_adjustments: string
    legitimate_adjustments: string[]
    questionable_adjustments: string[]
  }
  earnings_quality: {
    rating: string
    red_flags: string[]
    quality_concerns: string[]
  }
  sustainable_earnings: {
    normalized_ebitda: string
    sustainable_revenue_base: string
    sustainability_assessment: string
  }
  findings: string[]
  recommendations: string[]
}

// External Auditor Agent Response
interface ExternalAuditorResult {
  accounting_concerns: {
    aggressive_policies: string[]
    policy_changes: string[]
    accounting_risk_level: string
  }
  related_party_transactions: {
    identified_transactions: string[]
    total_rpt_value: string
    conflicts_of_interest: string[]
  }
  revenue_recognition: {
    issues_identified: string[]
    timing_concerns: string[]
    revenue_quality_rating: string
  }
  audit_trail: {
    documentation_quality: string
    gaps_identified: string[]
    control_weaknesses: string[]
  }
  verification_findings: {
    liquidity_verification: string
    operational_verification: string
    sustainability_verification: string
    discrepancies: string[]
  }
  overall_audit_opinion: string
  red_flags: string[]
  recommendations: string[]
}

// =============================================================================
// Sample Questions
// =============================================================================

const SAMPLE_QUESTIONS = [
  'Identify red flags in this cash flow statement',
  'What could break the model?',
  'What would you diligence further?',
  'Are there any deal killers in the financials?',
  'Analyze the sustainability of reported EBITDA',
]

// =============================================================================
// Helper Functions
// =============================================================================

const getSeverityColor = (text: string): string => {
  const lowerText = text.toLowerCase()
  if (lowerText.includes('high') || lowerText.includes('critical') || lowerText.includes('killer')) {
    return 'border-red-500'
  }
  if (lowerText.includes('medium') || lowerText.includes('concern') || lowerText.includes('warning')) {
    return 'border-amber-500'
  }
  return 'border-green-500'
}

const getDecisionColor = (decision: string): string => {
  const lowerDecision = decision.toLowerCase()
  if (lowerDecision.includes('not') || lowerDecision.includes('no')) {
    return 'text-red-500 bg-red-500/10'
  }
  if (lowerDecision.includes('proceed') || lowerDecision.includes('yes')) {
    return 'text-green-500 bg-green-500/10'
  }
  return 'text-amber-500 bg-amber-500/10'
}

const isDataNotFound = (value: any): boolean => {
  if (typeof value === 'string') {
    return value.includes('Data not found') || value.includes('not found')
  }
  return false
}

// =============================================================================
// Sub-Components (defined inline)
// =============================================================================

function DocumentStatusBar({ documentCount }: { documentCount: number }) {
  return (
    <div className="bg-[#1a1f36] border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-white">Documents Uploaded</p>
            <p className="text-xs text-gray-400">Knowledge base active</p>
          </div>
          <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
            {documentCount} {documentCount === 1 ? 'document' : 'documents'}
          </Badge>
        </div>
      </div>
    </div>
  )
}

function QueryZone({
  query,
  setQuery,
  onSubmit,
  loading,
}: {
  query: string
  setQuery: (q: string) => void
  onSubmit: () => void
  loading: boolean
}) {
  return (
    <Card className="bg-[#1a1f36] border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Diligence Query</CardTitle>
        <CardDescription className="text-gray-400">
          Ask your due diligence question based on uploaded documents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Ask your diligence question..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-[120px] bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 resize-none"
          disabled={loading}
        />
        <div className="flex flex-wrap gap-2">
          {SAMPLE_QUESTIONS.map((q, i) => (
            <button
              key={i}
              onClick={() => setQuery(q)}
              disabled={loading}
              className="px-3 py-1.5 text-xs rounded-full bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {q}
            </button>
          ))}
        </div>
        <Button
          onClick={onSubmit}
          disabled={loading || !query.trim()}
          className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Analysis...
            </>
          ) : (
            <>
              Run Diligence Analysis
              <ChevronRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

function AnalysisProgress({ currentStep }: { currentStep: number }) {
  const steps = [
    { label: 'Liquidity', icon: DollarSign },
    { label: 'Operational', icon: BarChart },
    { label: 'Sustainability', icon: TrendingUp },
    { label: 'Auditor', icon: Shield },
    { label: 'Synthesis', icon: CheckCircle },
  ]

  return (
    <Card className="bg-[#1a1f36] border-gray-700">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, i) => {
            const Icon = step.icon
            const isActive = i === currentStep
            const isComplete = i < currentStep
            return (
              <div key={i} className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    'rounded-full p-2 mb-2',
                    isComplete
                      ? 'bg-green-500/20 text-green-400'
                      : isActive
                      ? 'bg-blue-500/20 text-blue-400 ring-2 ring-blue-500'
                      : 'bg-gray-800 text-gray-500'
                  )}
                >
                  {isComplete ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs',
                    isActive ? 'text-white font-medium' : 'text-gray-500'
                  )}
                >
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
        <Progress
          value={((currentStep + 1) / steps.length) * 100}
          className="h-2 bg-gray-800"
        />
      </CardContent>
    </Card>
  )
}

function ConsolidatedRecommendationCard({ result }: { result: DiligenceCoordinatorResult }) {
  return (
    <Card className="bg-gradient-to-br from-[#1a1f36] to-[#0f1729] border-2 border-blue-500/50 shadow-2xl">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl text-white mb-2">
              Investment Recommendation
            </CardTitle>
            <CardDescription className="text-gray-400">
              Consolidated diligence synthesis
            </CardDescription>
          </div>
          <Badge
            className={cn('text-lg px-4 py-2', getDecisionColor(result.investment_recommendation.decision))}
          >
            {result.investment_recommendation.decision.replace(/_/g, ' ').toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Executive Summary */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">
            Executive Summary
          </h3>
          <p className="text-white leading-relaxed">{result.executive_summary}</p>
        </div>

        <Separator className="bg-gray-700" />

        {/* Investment Decision */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">
            Decision Rationale
          </h3>
          <p className="text-white mb-3">{result.investment_recommendation.reasoning}</p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Confidence Level:</span>
            <Badge variant="outline" className="border-blue-500 text-blue-400">
              {result.investment_recommendation.confidence_level.toUpperCase()}
            </Badge>
          </div>
        </div>

        <Separator className="bg-gray-700" />

        {/* Critical Red Flags */}
        {result.critical_red_flags && result.critical_red_flags.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-red-400 mb-3 uppercase tracking-wide flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Critical Red Flags
            </h3>
            <ul className="space-y-2">
              {result.critical_red_flags.map((flag, i) => (
                <li key={i} className="flex items-start gap-2 text-white">
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Deal Killers */}
        {result.deal_killers_identified && result.deal_killers_identified.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-red-400 mb-3 uppercase tracking-wide flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Deal Killers Identified
            </h3>
            <ul className="space-y-2">
              {result.deal_killers_identified.map((killer, i) => (
                <li key={i} className="text-red-300">
                  {killer}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Key Risks & Opportunities */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold text-amber-400 mb-3 uppercase tracking-wide">
              Key Risks
            </h3>
            <ul className="space-y-2">
              {result.investment_recommendation.key_risks?.map((risk, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                  <TrendingDown className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-green-400 mb-3 uppercase tracking-wide">
              Key Opportunities
            </h3>
            <ul className="space-y-2">
              {result.investment_recommendation.key_opportunities?.map((opp, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{opp}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Required Actions */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">
            What to Diligence Further
          </h3>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="immediate" className="border-gray-700">
              <AccordionTrigger className="text-white hover:text-blue-400">
                Immediate Actions ({result.required_actions.immediate?.length || 0})
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-1 text-gray-300">
                  {result.required_actions.immediate?.map((action, i) => (
                    <li key={i} className="text-sm">
                      • {action}
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="before-closing" className="border-gray-700">
              <AccordionTrigger className="text-white hover:text-blue-400">
                Before Closing ({result.required_actions.before_closing?.length || 0})
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-1 text-gray-300">
                  {result.required_actions.before_closing?.map((action, i) => (
                    <li key={i} className="text-sm">
                      • {action}
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="post-acquisition" className="border-gray-700 border-b-0">
              <AccordionTrigger className="text-white hover:text-blue-400">
                Post-Acquisition ({result.required_actions.post_acquisition?.length || 0})
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-1 text-gray-300">
                  {result.required_actions.post_acquisition?.map((action, i) => (
                    <li key={i} className="text-sm">
                      • {action}
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Cross-Cutting Themes */}
        {result.cross_cutting_themes && result.cross_cutting_themes.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">
              Cross-Cutting Themes
            </h3>
            <div className="flex flex-wrap gap-2">
              {result.cross_cutting_themes.map((theme, i) => (
                <Badge key={i} variant="outline" className="border-gray-600 text-gray-300">
                  {theme}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AgentAnalysisPanel({
  agentName,
  icon: Icon,
  severity,
  result,
  isOpen,
  onToggle,
}: {
  agentName: string
  icon: any
  severity: string
  result: any
  isOpen: boolean
  onToggle: () => void
}) {
  const severityClass = getSeverityColor(severity)

  return (
    <Card className={cn('bg-[#1a1f36] border-l-4', severityClass)}>
      <button
        onClick={onToggle}
        className="w-full text-left p-6 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className="h-6 w-6 text-blue-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">{agentName}</h3>
              <p className="text-sm text-gray-400">Click to expand analysis</p>
            </div>
          </div>
          <Badge variant="outline" className={cn('border-2', severityClass.replace('border-', 'text-'))}>
            {severity}
          </Badge>
        </div>
      </button>
      {isOpen && (
        <div className="px-6 pb-6 space-y-4">
          <Separator className="bg-gray-700" />
          <ScrollArea className="max-h-96">
            <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono bg-gray-900 p-4 rounded">
              {JSON.stringify(result, null, 2)}
            </pre>
          </ScrollArea>
        </div>
      )}
    </Card>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export default function Home() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(-1)
  const [response, setResponse] = useState<NormalizedAgentResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [documentCount, setDocumentCount] = useState(0)
  const [showDocumentManager, setShowDocumentManager] = useState(false)
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({})

  const handleRunAnalysis = async () => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setResponse(null)
    setCurrentStep(0)

    try {
      // Call the Diligence Coordinator Agent
      const result = await callAIAgent(query, DILIGENCE_COORDINATOR_AGENT_ID)

      // Simulate progress through steps
      for (let i = 0; i <= 4; i++) {
        setCurrentStep(i)
        await new Promise((resolve) => setTimeout(resolve, 800))
      }

      if (result.success) {
        setResponse(result.response)
      } else {
        setError(result.error || 'Analysis failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
      setCurrentStep(-1)
    }
  }

  const togglePanel = (agentName: string) => {
    setOpenPanels((prev) => ({ ...prev, [agentName]: !prev[agentName] }))
  }

  const coordinatorResult = response?.result as DiligenceCoordinatorResult | undefined

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#1a1f36] to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#1a1f36]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">PE Diligence Command Center</h1>
              <p className="text-sm text-gray-400">AI-powered due diligence analysis</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                className="border border-gray-700 text-white hover:bg-gray-800 hover:text-white"
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = '/sample_pe_deal_cim.txt'
                  link.download = 'sample_pe_deal_cim.txt'
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                Download Sample CIM
              </Button>
              <Dialog open={showDocumentManager} onOpenChange={setShowDocumentManager}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="border border-gray-700 text-white hover:bg-gray-800 hover:text-white">
                    <Upload className="mr-2 h-4 w-4" />
                    Manage Documents
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl bg-[#1a1f36] border-gray-700 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-white">Document Management</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Upload financial documents, statements, and reports for analysis
                    </DialogDescription>
                  </DialogHeader>
                  <KnowledgeBaseUpload
                    ragId={RAG_ID}
                    onUploadSuccess={(doc) => {
                      if (doc.documentCount !== undefined) {
                        setDocumentCount((prev) => prev + 1)
                      }
                    }}
                    onDeleteSuccess={() => {
                      setDocumentCount((prev) => Math.max(0, prev - 1))
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 space-y-6">
        {/* Document Status Bar */}
        <DocumentStatusBar documentCount={documentCount} />

        {/* Query Zone */}
        <QueryZone
          query={query}
          setQuery={setQuery}
          onSubmit={handleRunAnalysis}
          loading={loading}
        />

        {/* Analysis Progress */}
        {loading && currentStep >= 0 && <AnalysisProgress currentStep={currentStep} />}

        {/* Error Display */}
        {error && (
          <Card className="bg-red-500/10 border-red-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-red-400">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Zone */}
        {response && coordinatorResult && coordinatorResult.agent_findings && (
          <div className="space-y-6">
            {/* Consolidated Recommendation */}
            <ConsolidatedRecommendationCard result={coordinatorResult} />

            {/* Agent Analysis Panels */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Detailed Agent Analysis</h2>

              <AgentAnalysisPanel
                agentName="Liquidity Risk Analysis"
                icon={DollarSign}
                severity="View Details"
                result={coordinatorResult.agent_findings?.liquidity_summary || 'No data available'}
                isOpen={openPanels['liquidity'] || false}
                onToggle={() => togglePanel('liquidity')}
              />

              <AgentAnalysisPanel
                agentName="Operational Efficiency Analysis"
                icon={BarChart}
                severity="View Details"
                result={coordinatorResult.agent_findings?.operational_summary || 'No data available'}
                isOpen={openPanels['operational'] || false}
                onToggle={() => togglePanel('operational')}
              />

              <AgentAnalysisPanel
                agentName="Sustainability Analysis"
                icon={TrendingUp}
                severity="View Details"
                result={coordinatorResult.agent_findings?.sustainability_summary || 'No data available'}
                isOpen={openPanels['sustainability'] || false}
                onToggle={() => togglePanel('sustainability')}
              />

              <AgentAnalysisPanel
                agentName="External Audit Review"
                icon={Shield}
                severity="View Details"
                result={coordinatorResult.agent_findings?.audit_summary || 'No data available'}
                isOpen={openPanels['audit'] || false}
                onToggle={() => togglePanel('audit')}
              />
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !response && !error && (
          <Card className="bg-[#1a1f36]/50 border-gray-700 border-dashed">
            <CardContent className="py-12 text-center">
              <Shield className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">
                Ready for Diligence Analysis
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Upload your financial documents and ask a diligence question to get started with
                AI-powered due diligence analysis.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
