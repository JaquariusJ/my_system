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
