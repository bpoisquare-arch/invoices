import fs from 'fs'
import path from 'path'
import { PREDEFINED_AGENTS } from '@/lib/constants/aimt-agents'

export type CommissionType = 'percentage' | 'fixed' | 'net_remainder'

export interface AgentCommissionRule {
  agentName: string
  type: CommissionType
  rate: number // If percentage: e.g. 35 for 35%. If fixed: e.g. 4000 for $4,000 AUD. If net_remainder: e.g. 4000 for College Retention Base ($ AUD)
  notes?: string
  updatedAt: string
}

const COMMISSION_SETTINGS_FILE = path.join(
  process.cwd(),
  'data',
  'aimt_agent_commissions.json'
)

// Initial predefined rules as requested from Excel sheet
export const DEFAULT_AGENT_COMMISSION_RULES: Record<string, AgentCommissionRule> = {
  'ABC Overseas Consultants': { agentName: 'ABC Overseas Consultants', type: 'fixed', rate: 4000, updatedAt: '2026-11-10T12:00:00.000Z' },
  'Abdul Education': { agentName: 'Abdul Education', type: 'fixed', rate: 4000, updatedAt: '2026-11-10T12:00:00.000Z' },
  'Brightpath Consultancy Group': { agentName: 'Brightpath Consultancy Group', type: 'fixed', rate: 4000, updatedAt: '2026-11-10T12:00:00.000Z' },
  'Dream Education': { agentName: 'Dream Education', type: 'fixed', rate: 4000, updatedAt: '2026-11-10T12:00:00.000Z' },
  'Edlink Australia': { agentName: 'Edlink Australia', type: 'percentage', rate: 35, updatedAt: '2026-11-10T12:00:00.000Z' },
  'Edlink Pakistan': { agentName: 'Edlink Pakistan', type: 'percentage', rate: 35, updatedAt: '2026-11-10T12:00:00.000Z' },
  'Grace International Education': { agentName: 'Grace International Education', type: 'fixed', rate: 4500, updatedAt: '2026-11-10T12:00:00.000Z' },
  'Marriott Education': { agentName: 'Marriott Education', type: 'fixed', rate: 4500, updatedAt: '2026-11-10T12:00:00.000Z' },
  'Muskan Consultants': { agentName: 'Muskan Consultants', type: 'fixed', rate: 4500, updatedAt: '2026-11-10T12:00:00.000Z' },
  'NexGen Consultants': { agentName: 'NexGen Consultants', type: 'fixed', rate: 4000, updatedAt: '2026-11-10T12:00:00.000Z' },
  'Oceanian Migration And Education Consultants': { agentName: 'Oceanian Migration And Education Consultants', type: 'fixed', rate: 4000, updatedAt: '2026-11-10T12:00:00.000Z' },
  'Rashi (Study Directions)': { agentName: 'Rashi (Study Directions)', type: 'percentage', rate: 35, updatedAt: '2026-11-10T12:00:00.000Z' },
  'Sanguine Migration': { agentName: 'Sanguine Migration', type: 'fixed', rate: 4500, updatedAt: '2026-11-10T12:00:00.000Z' },
  'Simran Consultant': { agentName: 'Simran Consultant', type: 'fixed', rate: 2000, updatedAt: '2026-11-10T12:00:00.000Z' },
  'Student Pro Education Consultancy': { agentName: 'Student Pro Education Consultancy', type: 'fixed', rate: 4000, updatedAt: '2026-11-10T12:00:00.000Z' },
  'Study Directions': { agentName: 'Study Directions', type: 'percentage', rate: 35, updatedAt: '2026-11-10T12:00:00.000Z' },
  'VicPak Education Migration': { agentName: 'VicPak Education Migration', type: 'fixed', rate: 4000, updatedAt: '2026-11-10T12:00:00.000Z' },
  'World Class Consultant': { agentName: 'World Class Consultant', type: 'fixed', rate: 4000, updatedAt: '2026-11-10T12:00:00.000Z' },
  'ZEN Migration & Education Services': { agentName: 'ZEN Migration & Education Services', type: 'percentage', rate: 35, updatedAt: '2026-11-10T12:00:00.000Z' },
  'Zunair Imtiaz': { agentName: 'Zunair Imtiaz', type: 'fixed', rate: 500, updatedAt: '2026-11-10T12:00:00.000Z' },
  'ASEES AHMED': { agentName: 'ASEES AHMED', type: 'fixed', rate: 500, updatedAt: '2026-11-10T12:00:00.000Z' },
  'Solve Education & Migration': { agentName: 'Solve Education & Migration', type: 'percentage', rate: 35, updatedAt: '2026-11-10T12:00:00.000Z' },
  'Suzzie Dollie': { agentName: 'Suzzie Dollie', type: 'percentage', rate: 35, updatedAt: '2026-11-10T12:00:00.000Z' },
  'AI Global Education & Migration': { agentName: 'AI Global Education & Migration', type: 'percentage', rate: 35, updatedAt: '2026-11-10T12:00:00.000Z' },
  'Optimistic Education': { agentName: 'Optimistic Education', type: 'percentage', rate: 35, updatedAt: '2026-11-10T12:00:00.000Z' },
  'UniKey Global': { agentName: 'UniKey Global', type: 'percentage', rate: 35, updatedAt: '2026-11-10T12:00:00.000Z' },
}

function readRulesFromFile(): Record<string, AgentCommissionRule> {
  try {
    if (!fs.existsSync(COMMISSION_SETTINGS_FILE)) {
      writeRulesToFile(DEFAULT_AGENT_COMMISSION_RULES)
      return { ...DEFAULT_AGENT_COMMISSION_RULES }
    }
    const raw = fs.readFileSync(COMMISSION_SETTINGS_FILE, 'utf-8')
    const parsed = JSON.parse(raw) || {}
    // Merge defaults with saved rules so all initial rules are present
    const merged = { ...DEFAULT_AGENT_COMMISSION_RULES, ...parsed }
    return merged
  } catch (error) {
    console.error('Error reading agent commission rules file:', error)
    return { ...DEFAULT_AGENT_COMMISSION_RULES }
  }
}

function writeRulesToFile(rules: Record<string, AgentCommissionRule>): void {
  try {
    const dir = path.dirname(COMMISSION_SETTINGS_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(COMMISSION_SETTINGS_FILE, JSON.stringify(rules, null, 2), 'utf-8')
  } catch (error) {
    console.error('Error writing agent commission rules file:', error)
  }
}

/**
 * Get all configured agent commission rules mapped by agent name.
 */
export async function getAllAgentCommissionRules(): Promise<Record<string, AgentCommissionRule>> {
  const rules = readRulesFromFile()
  return rules
}

/**
 * Get the commission rule for a specific agent.
 */
export async function getAgentCommissionRule(agentName: string): Promise<AgentCommissionRule | null> {
  const rules = await getAllAgentCommissionRules()
  return rules[agentName] || null
}

/**
 * Save or update the commission rule for a specific agent.
 */
export async function saveAgentCommissionRule(params: {
  agentName: string
  type: CommissionType
  rate: number
  notes?: string
}): Promise<AgentCommissionRule> {
  const rules = await getAllAgentCommissionRules()

  const updatedRule: AgentCommissionRule = {
    agentName: params.agentName.trim(),
    type: params.type,
    rate: Math.max(0, Number(params.rate) || 0),
    notes: params.notes?.trim() || '',
    updatedAt: new Date().toISOString(),
  }

  rules[params.agentName.trim()] = updatedRule
  writeRulesToFile(rules)

  return updatedRule
}

/**
 * Reset / delete commission rule for a specific agent.
 */
export async function deleteAgentCommissionRule(agentName: string): Promise<boolean> {
  const rules = await getAllAgentCommissionRules()
  if (rules[agentName]) {
    delete rules[agentName]
    writeRulesToFile(rules)
    return true
  }
  return false
}
