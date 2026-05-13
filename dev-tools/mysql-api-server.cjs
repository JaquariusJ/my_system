const http = require('http')
const mysql = require('mysql2/promise')

const port = Number(process.env.API_PORT || 8080)
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '192.168.31.93',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USERNAME || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'asset_manager',
  waitForConnections: true,
  connectionLimit: 10
})

const send = (res, status, data) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  })
  res.end(data === undefined ? '' : JSON.stringify(data))
}

const readBody = (req) => new Promise((resolve, reject) => {
  let body = ''
  req.on('data', (chunk) => { body += chunk })
  req.on('end', () => resolve(body ? JSON.parse(body) : {}))
  req.on('error', reject)
})

const parseUrl = (req) => new URL(req.url, `http://${req.headers.host}`)
const monthDate = (month) => `${month}-01`
const normalizeActive = (value) => (value === false || value === 0 || value === '0' ? 0 : 1)
const blankToNull = (value) => (value == null || String(value).trim() === '' ? null : String(value).trim())

const accountSelect = `
  select id, name, institution, account_no_masked as accountNoMasked,
         asset_category as assetCategory, investment_type as investmentType,
         risk_level as riskLevel, cast(custom_fields as char) as customFields,
         remark, active, created_at as createdAt, updated_at as updatedAt
  from accounts
`

const accountNameSelect = `
  select id, name, identifier, sort_order as sortOrder, remark, active,
         created_at as createdAt, updated_at as updatedAt
  from account_names
`

const investmentTypeSelect = `
  select id, name, risk_level as riskLevel, sort_order as sortOrder, remark, active,
         created_at as createdAt, updated_at as updatedAt
  from investment_types
`

const companySelect = `
  select id, stock_code as stockCode, stock_name as stockName, exchange, industry,
         remark, active, created_at as createdAt, updated_at as updatedAt
  from stock_companies
`

const strategySelect = `
  select id, name, description, min_score as minScore,
         profitability_weight as profitabilityWeight, growth_weight as growthWeight,
         safety_weight as safetyWeight, cashflow_weight as cashflowWeight,
         valuation_weight as valuationWeight, min_roe as minRoe,
         max_debt_ratio as maxDebtRatio,
         min_cash_flow_profit_ratio as minCashFlowProfitRatio,
         max_pe_ratio as maxPeRatio, max_pb_ratio as maxPbRatio,
         min_dividend_yield as minDividendYield,
         exclude_negative_profit as excludeNegativeProfit,
         exclude_negative_cashflow as excludeNegativeCashflow,
         default_strategy as defaultStrategy, active,
         created_at as createdAt, updated_at as updatedAt
  from value_strategies
`

async function normalizeAccountFields(payload) {
  const assetCategory = payload.assetCategory
  const investmentType = blankToNull(payload.investmentType)
  const riskLevel = blankToNull(payload.riskLevel)

  if (assetCategory === 'LIABILITY') {
    return { investmentType: null, riskLevel: null }
  }

  if (!investmentType) {
    const error = new Error('资产类型为资产时，投资类型必填')
    error.status = 400
    throw error
  }

  const [types] = await pool.query('select count(*) as count from investment_types where name = ?', [investmentType])
  if (!types[0].count) {
    const error = new Error('所选投资类型不存在')
    error.status = 400
    throw error
  }

  if (!riskLevel) {
    const error = new Error('资产类型为资产时，风险等级必填')
    error.status = 400
    throw error
  }

  return { investmentType, riskLevel }
}

async function listAccounts(activeOnly) {
  const sql = `${accountSelect} ${activeOnly ? 'where active = 1' : ''} order by asset_category, investment_type, name`
  const [rows] = await pool.query(sql)
  return rows
}

async function summary(month) {
  const [accounts] = await pool.query(`
    select a.id as accountId, a.name, a.institution,
           coalesce(an.identifier, a.account_no_masked) as accountNoMasked,
           a.asset_category as assetCategory, a.investment_type as investmentType,
           a.risk_level as riskLevel, s.amount as amount, s.note
    from monthly_snapshots s
    join accounts a on a.id = s.account_id
    left join account_names an on an.name = a.name
    where a.active = 1
      and s.snapshot_month = ?
    order by a.asset_category, a.investment_type, a.name
  `, [monthDate(month)])

  const totals = accounts.reduce((acc, item) => {
    const amount = Number(item.amount || 0)
    if (item.assetCategory === 'LIABILITY') acc.totalLiabilities += amount
    else acc.totalAssets += amount
    return acc
  }, { totalAssets: 0, totalLiabilities: 0 })

  return {
    month,
    totalAssets: totals.totalAssets,
    totalLiabilities: totals.totalLiabilities,
    netAssets: totals.totalAssets - totals.totalLiabilities,
    accounts
  }
}

async function trendByCategory(startMonth, endMonth) {
  const [rows] = await pool.query(`
    select date_format(s.snapshot_month, '%Y-%m') as month,
           a.asset_category as name,
           sum(s.amount) as value
    from monthly_snapshots s
    join accounts a on a.id = s.account_id
    where s.snapshot_month between ? and ?
    group by s.snapshot_month, a.asset_category
    order by s.snapshot_month, a.asset_category
  `, [monthDate(startMonth), monthDate(endMonth)])
  return rows
}

async function trendByField(field, startMonth, endMonth, assetCategory) {
  const allowed = { investment_type: 'a.investment_type', risk_level: 'a.risk_level' }
  const params = [monthDate(startMonth), monthDate(endMonth)]
  let where = 's.snapshot_month between ? and ?'
  if (assetCategory && assetCategory !== 'ALL') {
    where += ' and a.asset_category = ?'
    params.push(assetCategory)
  }
  const safeField = allowed[field]
  const [rows] = await pool.query(`
    select date_format(s.snapshot_month, '%Y-%m') as month,
           coalesce(nullif(${safeField}, ''), '未设置') as name,
           sum(s.amount) as value
    from monthly_snapshots s
    join accounts a on a.id = s.account_id
    where ${where}
    group by s.snapshot_month, coalesce(nullif(${safeField}, ''), '未设置')
    order by s.snapshot_month, coalesce(nullif(${safeField}, ''), '未设置')
  `, params)
  return rows
}

async function distributionByField(field, month, assetCategory) {
  const allowed = { investment_type: 'a.investment_type', risk_level: 'a.risk_level' }
  const params = [monthDate(month)]
  let where = 's.snapshot_month = ?'
  if (assetCategory && assetCategory !== 'ALL') {
    where += ' and a.asset_category = ?'
    params.push(assetCategory)
  }
  const safeField = allowed[field]
  const [rows] = await pool.query(`
    select coalesce(nullif(${safeField}, ''), '未设置') as name, sum(s.amount) as value
    from monthly_snapshots s
    join accounts a on a.id = s.account_id
    where ${where}
    group by coalesce(nullif(${safeField}, ''), '未设置')
    order by value desc
  `, params)
  const total = rows.reduce((sum, item) => sum + Number(item.value || 0), 0)
  return rows.map((item) => ({
    ...item,
    percent: total ? Number(((Number(item.value || 0) / total) * 100).toFixed(2)) : 0
  }))
}

async function saveSnapshot(payload) {
  await pool.query(`
    insert into monthly_snapshots (account_id, snapshot_month, amount, note)
    values (?, ?, ?, ?)
    on duplicate key update amount = values(amount), note = values(note)
  `, [payload.accountId, monthDate(payload.month), Number(payload.amount || 0), payload.note || null])
}

async function ensureAccountName(name) {
  if (!name) return
  await pool.query(`
    insert ignore into account_names (name, sort_order, remark, active)
    values (?, 100, '由资产记录自动导入', 1)
  `, [name])
}

async function createAccount(payload) {
  await ensureAccountName(payload.name)
  const normalized = await normalizeAccountFields(payload)
  const [result] = await pool.query(`
    insert into accounts (
      name, institution, account_no_masked, asset_category, investment_type,
      risk_level, custom_fields, remark, active
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    payload.name,
    payload.institution || null,
    payload.accountNoMasked || null,
    payload.assetCategory,
    normalized.investmentType,
    normalized.riskLevel,
    payload.customFields || null,
    payload.remark || null,
    normalizeActive(payload.active)
  ])
  const [rows] = await pool.query(`${accountSelect} where id = ?`, [result.insertId])
  return rows[0]
}

async function updateAccount(id, payload) {
  await ensureAccountName(payload.name)
  const normalized = await normalizeAccountFields(payload)
  await pool.query(`
    update accounts
    set name = ?, institution = ?, account_no_masked = ?, asset_category = ?,
        investment_type = ?, risk_level = ?, custom_fields = ?, remark = ?, active = ?
    where id = ?
  `, [
    payload.name,
    payload.institution || null,
    payload.accountNoMasked || null,
    payload.assetCategory,
    normalized.investmentType,
    normalized.riskLevel,
    payload.customFields || null,
    payload.remark || null,
    normalizeActive(payload.active),
    id
  ])
  const [rows] = await pool.query(`${accountSelect} where id = ?`, [id])
  return rows[0]
}

async function listAccountNames() {
  const [rows] = await pool.query(`${accountNameSelect} order by created_at desc, id desc`)
  return rows
}

async function createAccountName(payload) {
  const [result] = await pool.query(`
    insert into account_names (name, identifier, sort_order, remark, active)
    values (?, ?, ?, ?, ?)
  `, [payload.name, payload.identifier || null, 100, payload.remark || null, 1])
  const [rows] = await pool.query(`${accountNameSelect} where id = ?`, [result.insertId])
  return rows[0]
}

async function updateAccountName(id, payload) {
  const [existingRows] = await pool.query('select name from account_names where id = ?', [id])
  if (!existingRows.length) {
    const error = new Error('账户名称不存在')
    error.status = 404
    throw error
  }
  await pool.query(`
    update account_names
    set name = ?, identifier = ?, sort_order = ?, remark = ?, active = ?
    where id = ?
  `, [payload.name, payload.identifier || null, 100, payload.remark || null, 1, id])
  if (existingRows[0].name !== payload.name) {
    await pool.query('update accounts set name = ? where name = ?', [payload.name, existingRows[0].name])
  }
  const [rows] = await pool.query(`${accountNameSelect} where id = ?`, [id])
  return rows[0]
}

async function deleteAccountName(id) {
  const [rows] = await pool.query('select name from account_names where id = ?', [id])
  if (!rows.length) return
  const [[usage]] = await pool.query('select count(*) as count from accounts where name = ?', [rows[0].name])
  if (usage.count > 0) {
    const error = new Error('该账户名称已被资产记录使用，不能删除；请先修改相关记录后再删除。')
    error.status = 409
    throw error
  }
  await pool.query('delete from account_names where id = ?', [id])
}

async function listInvestmentTypes() {
  const [rows] = await pool.query(`${investmentTypeSelect} order by created_at desc, id desc`)
  return rows
}

async function createInvestmentType(payload) {
  const [result] = await pool.query(`
    insert into investment_types (name, risk_level, sort_order, remark, active)
    values (?, ?, ?, ?, ?)
  `, [payload.name, payload.riskLevel || null, 100, payload.remark || null, 1])
  const [rows] = await pool.query(`${investmentTypeSelect} where id = ?`, [result.insertId])
  return rows[0]
}

async function updateInvestmentType(id, payload) {
  const [existingRows] = await pool.query('select name from investment_types where id = ?', [id])
  if (!existingRows.length) {
    const error = new Error('投资类型不存在')
    error.status = 404
    throw error
  }
  await pool.query(`
    update investment_types
    set name = ?, risk_level = ?, sort_order = ?, remark = ?, active = ?
    where id = ?
  `, [payload.name, payload.riskLevel || null, 100, payload.remark || null, 1, id])
  await pool.query(
    'update accounts set investment_type = ?, risk_level = ? where investment_type = ?',
    [payload.name, payload.riskLevel || null, existingRows[0].name]
  )
  const [rows] = await pool.query(`${investmentTypeSelect} where id = ?`, [id])
  return rows[0]
}

async function deleteInvestmentType(id) {
  const [rows] = await pool.query('select name from investment_types where id = ?', [id])
  if (!rows.length) return
  const [[usage]] = await pool.query('select count(*) as count from accounts where investment_type = ?', [rows[0].name])
  if (usage.count > 0) {
    const error = new Error('该投资类型已被资产记录使用，不能删除；请先修改相关记录后再删除。')
    error.status = 409
    throw error
  }
  await pool.query('delete from investment_types where id = ?', [id])
}

async function listValueCompanies(keyword) {
  const params = []
  let where = ''
  if (keyword) {
    where = `where stock_code like concat('%', ?, '%') or stock_name like concat('%', ?, '%') or industry like concat('%', ?, '%')`
    params.push(keyword, keyword, keyword)
  }
  const [rows] = await pool.query(`${companySelect} ${where} order by stock_code`, params)
  return rows
}

async function createValueCompany(payload) {
  const [result] = await pool.query(`
    insert into stock_companies (stock_code, stock_name, exchange, industry, remark, active)
    values (?, ?, ?, ?, ?, ?)
  `, [
    String(payload.stockCode || '').trim().toUpperCase(),
    String(payload.stockName || '').trim(),
    String(payload.exchange || '').trim().toUpperCase(),
    blankToNull(payload.industry),
    blankToNull(payload.remark),
    normalizeActive(payload.active)
  ])
  const [rows] = await pool.query(`${companySelect} where id = ?`, [result.insertId])
  return rows[0]
}

async function updateValueCompany(id, payload) {
  await pool.query(`
    update stock_companies
    set stock_code = ?, stock_name = ?, exchange = ?, industry = ?, remark = ?, active = ?
    where id = ?
  `, [
    String(payload.stockCode || '').trim().toUpperCase(),
    String(payload.stockName || '').trim(),
    String(payload.exchange || '').trim().toUpperCase(),
    blankToNull(payload.industry),
    blankToNull(payload.remark),
    normalizeActive(payload.active),
    id
  ])
  const [rows] = await pool.query(`${companySelect} where id = ?`, [id])
  return rows[0]
}

async function upsertOfficialReportLead(companyId, reportYear) {
  const [companies] = await pool.query(`${companySelect} where id = ?`, [companyId])
  if (!companies.length) {
    const error = new Error('Company not found')
    error.status = 404
    throw error
  }
  const company = companies[0]
  const keyword = encodeURIComponent(`${company.stockCode} ${reportYear} 年度报告`)
  const sourceUrl = `https://www.cninfo.com.cn/new/fulltextSearch?notautosubmit=&keyWord=${keyword}`
  await pool.query(`
    insert into annual_reports (
      company_id, report_year, report_title, source_url, fetch_status, parse_status, remark
    ) values (?, ?, ?, ?, 'OFFICIAL_LEAD', 'MANUAL_PENDING', ?)
    on duplicate key update
      report_title = values(report_title),
      source_url = values(source_url),
      fetch_status = values(fetch_status),
      parse_status = values(parse_status),
      remark = values(remark)
  `, [companyId, reportYear, `${company.stockName} ${reportYear} 年度报告`, sourceUrl, '已生成巨潮资讯网官方检索入口'])
  const [rows] = await pool.query(`
    select id, company_id as companyId, report_year as reportYear, report_title as reportTitle,
           source_url as sourceUrl, file_path as filePath, fetch_status as fetchStatus,
           parse_status as parseStatus, published_at as publishedAt, remark,
           created_at as createdAt, updated_at as updatedAt
    from annual_reports
    where company_id = ? and report_year = ?
  `, [companyId, reportYear])
  return rows[0]
}

async function listValueReports(companyId, reportYear) {
  const params = []
  const where = []
  if (companyId) {
    where.push('company_id = ?')
    params.push(companyId)
  }
  if (reportYear) {
    where.push('report_year = ?')
    params.push(reportYear)
  }
  const [rows] = await pool.query(`
    select id, company_id as companyId, report_year as reportYear, report_title as reportTitle,
           source_url as sourceUrl, file_path as filePath, fetch_status as fetchStatus,
           parse_status as parseStatus, published_at as publishedAt, remark,
           created_at as createdAt, updated_at as updatedAt
    from annual_reports
    ${where.length ? `where ${where.join(' and ')}` : ''}
    order by report_year desc, id desc
  `, params)
  return rows
}

async function upsertValueMetrics(payload) {
  const debtRatio = payload.debtRatio ?? (payload.totalAssets > 0 && payload.totalLiabilities != null ? Number(payload.totalLiabilities) / Number(payload.totalAssets) : null)
  const roe = payload.roe ?? (payload.shareholderEquity > 0 && payload.netProfit != null ? Number(payload.netProfit) / Number(payload.shareholderEquity) : null)
  const cashFlowProfitRatio = payload.cashFlowProfitRatio ?? (payload.netProfit && payload.operatingCashFlow != null ? Number(payload.operatingCashFlow) / Number(payload.netProfit) : null)
  const peRatio = payload.peRatio ?? (payload.netProfit > 0 && payload.totalMarketValue != null ? Number(payload.totalMarketValue) / Number(payload.netProfit) : null)
  const pbRatio = payload.pbRatio ?? (payload.shareholderEquity > 0 && payload.totalMarketValue != null ? Number(payload.totalMarketValue) / Number(payload.shareholderEquity) : null)
  await pool.query(`
    insert into financial_metrics (
      company_id, report_year, revenue, revenue_growth_rate, net_profit,
      deducted_net_profit, net_profit_growth_rate, gross_margin, net_margin, roe,
      total_assets, total_liabilities, shareholder_equity, debt_ratio, goodwill,
      monetary_funds, interest_bearing_debt, operating_cash_flow, free_cash_flow,
      cash_flow_profit_ratio, current_price, total_market_value, pe_ratio, pb_ratio,
      dividend_yield, data_source, remark
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    on duplicate key update
      revenue = values(revenue),
      revenue_growth_rate = values(revenue_growth_rate),
      net_profit = values(net_profit),
      deducted_net_profit = values(deducted_net_profit),
      net_profit_growth_rate = values(net_profit_growth_rate),
      gross_margin = values(gross_margin),
      net_margin = values(net_margin),
      roe = values(roe),
      total_assets = values(total_assets),
      total_liabilities = values(total_liabilities),
      shareholder_equity = values(shareholder_equity),
      debt_ratio = values(debt_ratio),
      goodwill = values(goodwill),
      monetary_funds = values(monetary_funds),
      interest_bearing_debt = values(interest_bearing_debt),
      operating_cash_flow = values(operating_cash_flow),
      free_cash_flow = values(free_cash_flow),
      cash_flow_profit_ratio = values(cash_flow_profit_ratio),
      current_price = values(current_price),
      total_market_value = values(total_market_value),
      pe_ratio = values(pe_ratio),
      pb_ratio = values(pb_ratio),
      dividend_yield = values(dividend_yield),
      data_source = values(data_source),
      remark = values(remark)
  `, [
    payload.companyId, payload.reportYear, payload.revenue ?? null, payload.revenueGrowthRate ?? null,
    payload.netProfit ?? null, payload.deductedNetProfit ?? null, payload.netProfitGrowthRate ?? null,
    payload.grossMargin ?? null, payload.netMargin ?? null, roe, payload.totalAssets ?? null,
    payload.totalLiabilities ?? null, payload.shareholderEquity ?? null, debtRatio, payload.goodwill ?? null,
    payload.monetaryFunds ?? null, payload.interestBearingDebt ?? null, payload.operatingCashFlow ?? null,
    payload.freeCashFlow ?? null, cashFlowProfitRatio, payload.currentPrice ?? null,
    payload.totalMarketValue ?? null, peRatio, pbRatio, payload.dividendYield ?? null,
    payload.dataSource || 'MANUAL', blankToNull(payload.remark)
  ])
  const [rows] = await pool.query('select * from financial_metrics where company_id = ? and report_year = ?', [payload.companyId, payload.reportYear])
  return rows[0]
}

async function listValueMetrics(reportYear, stockCodes) {
  const params = [reportYear]
  let stockWhere = ''
  const codes = (stockCodes || '').split(',').map((code) => code.trim()).filter(Boolean)
  if (codes.length) {
    stockWhere = `and sc.stock_code in (${codes.map(() => '?').join(',')})`
    params.push(...codes)
  }
  const [rows] = await pool.query(`
    select fm.*, sc.stock_code as stockCode, sc.stock_name as stockName
    from financial_metrics fm
    join stock_companies sc on sc.id = fm.company_id
    where fm.report_year = ?
    ${stockWhere}
    order by sc.stock_code
  `, params)
  return rows
}

const defaultStrategyPayload = (payload) => ({
  name: String(payload.name || '').trim(),
  description: blankToNull(payload.description),
  minScore: payload.minScore ?? 65,
  profitabilityWeight: payload.profitabilityWeight ?? 25,
  growthWeight: payload.growthWeight ?? 20,
  safetyWeight: payload.safetyWeight ?? 20,
  cashflowWeight: payload.cashflowWeight ?? 20,
  valuationWeight: payload.valuationWeight ?? 15,
  minRoe: payload.minRoe ?? 0.12,
  maxDebtRatio: payload.maxDebtRatio ?? 0.6,
  minCashFlowProfitRatio: payload.minCashFlowProfitRatio ?? 0.8,
  maxPeRatio: payload.maxPeRatio ?? 30,
  maxPbRatio: payload.maxPbRatio ?? 5,
  minDividendYield: payload.minDividendYield ?? 0,
  excludeNegativeProfit: payload.excludeNegativeProfit === false ? 0 : 1,
  excludeNegativeCashflow: payload.excludeNegativeCashflow === false ? 0 : 1,
  defaultStrategy: payload.defaultStrategy ? 1 : 0,
  active: normalizeActive(payload.active)
})

async function listValueStrategies() {
  const [rows] = await pool.query(`${strategySelect} order by default_strategy desc, created_at desc, id desc`)
  return rows
}

async function createValueStrategy(payload) {
  const strategy = defaultStrategyPayload(payload)
  if (strategy.defaultStrategy) await pool.query('update value_strategies set default_strategy = 0')
  const [result] = await pool.query(`
    insert into value_strategies (
      name, description, min_score, profitability_weight, growth_weight, safety_weight,
      cashflow_weight, valuation_weight, min_roe, max_debt_ratio,
      min_cash_flow_profit_ratio, max_pe_ratio, max_pb_ratio, min_dividend_yield,
      exclude_negative_profit, exclude_negative_cashflow, default_strategy, active
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    strategy.name, strategy.description, strategy.minScore, strategy.profitabilityWeight,
    strategy.growthWeight, strategy.safetyWeight, strategy.cashflowWeight, strategy.valuationWeight,
    strategy.minRoe, strategy.maxDebtRatio, strategy.minCashFlowProfitRatio, strategy.maxPeRatio,
    strategy.maxPbRatio, strategy.minDividendYield, strategy.excludeNegativeProfit,
    strategy.excludeNegativeCashflow, strategy.defaultStrategy, strategy.active
  ])
  const [rows] = await pool.query(`${strategySelect} where id = ?`, [result.insertId])
  return rows[0]
}

async function updateValueStrategy(id, payload) {
  const strategy = defaultStrategyPayload(payload)
  if (strategy.defaultStrategy) await pool.query('update value_strategies set default_strategy = 0')
  await pool.query(`
    update value_strategies
    set name = ?, description = ?, min_score = ?, profitability_weight = ?, growth_weight = ?,
        safety_weight = ?, cashflow_weight = ?, valuation_weight = ?, min_roe = ?,
        max_debt_ratio = ?, min_cash_flow_profit_ratio = ?, max_pe_ratio = ?, max_pb_ratio = ?,
        min_dividend_yield = ?, exclude_negative_profit = ?, exclude_negative_cashflow = ?,
        default_strategy = ?, active = ?
    where id = ?
  `, [
    strategy.name, strategy.description, strategy.minScore, strategy.profitabilityWeight,
    strategy.growthWeight, strategy.safetyWeight, strategy.cashflowWeight, strategy.valuationWeight,
    strategy.minRoe, strategy.maxDebtRatio, strategy.minCashFlowProfitRatio, strategy.maxPeRatio,
    strategy.maxPbRatio, strategy.minDividendYield, strategy.excludeNegativeProfit,
    strategy.excludeNegativeCashflow, strategy.defaultStrategy, strategy.active, id
  ])
  const [rows] = await pool.query(`${strategySelect} where id = ?`, [id])
  return rows[0]
}

const ratioScore = (value, target, higherBetter) => {
  if (value == null || target == null) return 0.4
  if (Number(target) === 0) return higherBetter ? 1 : 0.75
  const raw = higherBetter ? Number(value) / Number(target) : Number(target) / Math.max(Number(value), 0.0001)
  return Math.min(1, Math.max(0, Math.min(1.2, raw) / 1.2))
}

const avg = (...values) => values.reduce((sum, item) => sum + Number(item || 0), 0) / values.length
const weighted = (score, weight) => Number((score * Number(weight || 0)).toFixed(2))
const levelText = (score) => score >= 80 ? '优秀候选' : score >= 65 ? '观察名单' : score >= 50 ? '谨慎观察' : '暂不考虑'

async function runValueScreening(payload) {
  const [[strategy]] = await pool.query(`${strategySelect} where id = ?`, [payload.strategyId])
  if (!strategy) {
    const error = new Error('Strategy not found')
    error.status = 404
    throw error
  }
  const metrics = await listValueMetrics(payload.reportYear, '')
  await pool.query('delete from value_screening_results where strategy_id = ? and report_year = ?', [payload.strategyId, payload.reportYear])
  for (const item of metrics) {
    const strengths = []
    const risks = []
    let profitability = avg(ratioScore(item.roe, strategy.minRoe, true), avg(ratioScore(item.gross_margin, 0.3, true), ratioScore(item.net_margin, 0.1, true)))
    let growth = avg(ratioScore(item.revenue_growth_rate, 0.08, true), ratioScore(item.net_profit_growth_rate, 0.08, true))
    const goodwillRatio = item.total_assets > 0 && item.goodwill != null ? Number(item.goodwill) / Number(item.total_assets) : null
    const safety = avg(ratioScore(item.debt_ratio, strategy.maxDebtRatio, false), ratioScore(goodwillRatio, 0.1, false))
    let cashflow = avg(ratioScore(item.cash_flow_profit_ratio, strategy.minCashFlowProfitRatio, true), item.free_cash_flow > 0 ? 1 : 0.35)
    const valuation = avg(ratioScore(item.pe_ratio, strategy.maxPeRatio, false), ratioScore(item.pb_ratio, strategy.maxPbRatio, false), ratioScore(item.dividend_yield, strategy.minDividendYield, true))
    if (item.roe >= strategy.minRoe) strengths.push('ROE 达到策略要求')
    else risks.push('ROE 偏低或缺失')
    if (item.debt_ratio <= strategy.maxDebtRatio) strengths.push('资产负债率处于策略安全线内')
    else risks.push('资产负债率偏高或缺失')
    if (item.cash_flow_profit_ratio >= strategy.minCashFlowProfitRatio) strengths.push('经营现金流对利润覆盖较好')
    else risks.push('现金流质量偏弱或缺失')
    if (item.pe_ratio <= strategy.maxPeRatio && item.pb_ratio <= strategy.maxPbRatio) strengths.push('估值处于策略阈值内')
    else risks.push('估值偏高或行情估值数据缺失')
    if (strategy.excludeNegativeProfit && (!(item.net_profit > 0))) {
      risks.push('净利润为负或缺失，触发排除条件')
      profitability = 0
      growth = 0
    }
    if (strategy.excludeNegativeCashflow && (!(item.operating_cash_flow > 0))) {
      risks.push('经营现金流为负或缺失，触发排除条件')
      cashflow = 0
    }
    const profitabilityScore = weighted(profitability, strategy.profitabilityWeight)
    const growthScore = weighted(growth, strategy.growthWeight)
    const safetyScore = weighted(safety, strategy.safetyWeight)
    const cashflowScore = weighted(cashflow, strategy.cashflowWeight)
    const valuationScore = weighted(valuation, strategy.valuationWeight)
    const totalScore = Number((profitabilityScore + growthScore + safetyScore + cashflowScore + valuationScore).toFixed(2))
    await pool.query(`
      insert into value_screening_results (
        strategy_id, company_id, report_year, total_score, level_text,
        profitability_score, growth_score, safety_score, cashflow_score, valuation_score,
        strengths, risks
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      payload.strategyId, item.company_id, payload.reportYear, totalScore, levelText(totalScore),
      profitabilityScore, growthScore, safetyScore, cashflowScore, valuationScore,
      strengths.join('；'), risks.join('；')
    ])
  }
  return listValueScreeningResults(payload.strategyId, payload.reportYear)
}

async function listValueScreeningResults(strategyId, reportYear) {
  const [rows] = await pool.query(`
    select vsr.*, sc.stock_code as stockCode, sc.stock_name as stockName, sc.exchange, sc.industry
    from value_screening_results vsr
    join stock_companies sc on sc.id = vsr.company_id
    where vsr.strategy_id = ? and vsr.report_year = ?
    order by vsr.total_score desc, sc.stock_code
  `, [strategyId, reportYear])
  return rows
}

async function route(req, res) {
  const url = parseUrl(req)
  const path = url.pathname

  if (req.method === 'OPTIONS') return send(res, 204)

  if (req.method === 'GET' && path === '/api/accounts') {
    return send(res, 200, await listAccounts(url.searchParams.get('activeOnly') === 'true'))
  }
  if (req.method === 'POST' && path === '/api/accounts') {
    return send(res, 200, await createAccount(await readBody(req)))
  }

  const accountMatch = path.match(/^\/api\/accounts\/(\d+)$/)
  if (accountMatch && req.method === 'PUT') {
    return send(res, 200, await updateAccount(Number(accountMatch[1]), await readBody(req)))
  }
  if (accountMatch && req.method === 'DELETE') {
    await pool.query('delete from accounts where id = ?', [Number(accountMatch[1])])
    return send(res, 200)
  }

  if (req.method === 'GET' && path === '/api/account-names') return send(res, 200, await listAccountNames())
  if (req.method === 'POST' && path === '/api/account-names') return send(res, 200, await createAccountName(await readBody(req)))

  const accountNameMatch = path.match(/^\/api\/account-names\/(\d+)$/)
  if (accountNameMatch && req.method === 'PUT') return send(res, 200, await updateAccountName(Number(accountNameMatch[1]), await readBody(req)))
  if (accountNameMatch && req.method === 'DELETE') {
    await deleteAccountName(Number(accountNameMatch[1]))
    return send(res, 200)
  }

  if (req.method === 'GET' && path === '/api/investment-types') return send(res, 200, await listInvestmentTypes())
  if (req.method === 'POST' && path === '/api/investment-types') return send(res, 200, await createInvestmentType(await readBody(req)))

  const investmentTypeMatch = path.match(/^\/api\/investment-types\/(\d+)$/)
  if (investmentTypeMatch && req.method === 'PUT') return send(res, 200, await updateInvestmentType(Number(investmentTypeMatch[1]), await readBody(req)))
  if (investmentTypeMatch && req.method === 'DELETE') {
    await deleteInvestmentType(Number(investmentTypeMatch[1]))
    return send(res, 200)
  }

  if (req.method === 'GET' && path === '/api/snapshots/summary') return send(res, 200, await summary(url.searchParams.get('month')))
  if (req.method === 'POST' && path === '/api/snapshots') {
    await saveSnapshot(await readBody(req))
    return send(res, 200)
  }
  if (req.method === 'GET' && path === '/api/snapshots/months') {
    const [rows] = await pool.query("select date_format(snapshot_month, '%Y-%m') as month from monthly_snapshots group by snapshot_month order by snapshot_month")
    return send(res, 200, rows.map((row) => row.month))
  }

  if (req.method === 'GET' && path === '/api/analytics/trend/category') {
    return send(res, 200, await trendByCategory(url.searchParams.get('startMonth'), url.searchParams.get('endMonth')))
  }
  if (req.method === 'GET' && path === '/api/analytics/trend/investment-type') {
    return send(res, 200, await trendByField('investment_type', url.searchParams.get('startMonth'), url.searchParams.get('endMonth'), url.searchParams.get('assetCategory')))
  }
  if (req.method === 'GET' && path === '/api/analytics/trend/risk') {
    return send(res, 200, await trendByField('risk_level', url.searchParams.get('startMonth'), url.searchParams.get('endMonth'), url.searchParams.get('assetCategory')))
  }
  if (req.method === 'GET' && path === '/api/analytics/distribution/investment-type') {
    return send(res, 200, await distributionByField('investment_type', url.searchParams.get('month'), url.searchParams.get('assetCategory')))
  }
  if (req.method === 'GET' && path === '/api/analytics/distribution/risk') {
    return send(res, 200, await distributionByField('risk_level', url.searchParams.get('month'), url.searchParams.get('assetCategory')))
  }

  if (req.method === 'GET' && path === '/api/value/companies') {
    return send(res, 200, await listValueCompanies(url.searchParams.get('keyword')))
  }
  if (req.method === 'POST' && path === '/api/value/companies') {
    return send(res, 200, await createValueCompany(await readBody(req)))
  }
  const valueCompanyMatch = path.match(/^\/api\/value\/companies\/(\d+)$/)
  if (valueCompanyMatch && req.method === 'PUT') {
    return send(res, 200, await updateValueCompany(Number(valueCompanyMatch[1]), await readBody(req)))
  }
  if (valueCompanyMatch && req.method === 'DELETE') {
    await pool.query('delete from stock_companies where id = ?', [Number(valueCompanyMatch[1])])
    return send(res, 200)
  }

  if (req.method === 'GET' && path === '/api/value/reports') {
    return send(res, 200, await listValueReports(url.searchParams.get('companyId'), url.searchParams.get('reportYear')))
  }
  if (req.method === 'POST' && path === '/api/value/reports/fetch') {
    return send(res, 200, await upsertOfficialReportLead(Number(url.searchParams.get('companyId')), Number(url.searchParams.get('reportYear'))))
  }

  if (req.method === 'GET' && path === '/api/value/metrics') {
    return send(res, 200, await listValueMetrics(Number(url.searchParams.get('reportYear')), url.searchParams.get('stockCodes')))
  }
  if (req.method === 'POST' && path === '/api/value/metrics') {
    return send(res, 200, await upsertValueMetrics(await readBody(req)))
  }

  if (req.method === 'GET' && path === '/api/value/strategies') {
    return send(res, 200, await listValueStrategies())
  }
  if (req.method === 'POST' && path === '/api/value/strategies') {
    return send(res, 200, await createValueStrategy(await readBody(req)))
  }
  const valueStrategyMatch = path.match(/^\/api\/value\/strategies\/(\d+)$/)
  if (valueStrategyMatch && req.method === 'PUT') {
    return send(res, 200, await updateValueStrategy(Number(valueStrategyMatch[1]), await readBody(req)))
  }
  if (valueStrategyMatch && req.method === 'DELETE') {
    await pool.query('delete from value_strategies where id = ?', [Number(valueStrategyMatch[1])])
    return send(res, 200)
  }

  if (req.method === 'POST' && path === '/api/value/screenings/run') {
    return send(res, 200, await runValueScreening(await readBody(req)))
  }
  if (req.method === 'GET' && path === '/api/value/screenings/results') {
    return send(res, 200, await listValueScreeningResults(Number(url.searchParams.get('strategyId')), Number(url.searchParams.get('reportYear'))))
  }

  return send(res, 404, { message: 'Not found' })
}

const server = http.createServer((req, res) => {
  route(req, res).catch((error) => {
    let resolvedError = error
    if (resolvedError && resolvedError.code === 'ER_DUP_ENTRY') {
      const duplicateError = new Error('名称已存在，请换一个名称')
      duplicateError.status = 409
      resolvedError = duplicateError
    }
    console.error(resolvedError)
    send(res, resolvedError.status || 500, { message: resolvedError.message })
  })
})

server.listen(port, () => {
  console.log(`MySQL API server listening on http://127.0.0.1:${port}`)
})
