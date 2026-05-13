<template>
  <div class="layout-shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">资</span>
        <div>
          <strong>我的资产</strong>
        </div>
      </div>

      <nav class="side-nav">
        <button :class="{ active: activeView === 'dashboard' }" @click="openDashboard">
          <LayoutDashboard :size="18" />
          首页
        </button>
        <button class="parent-nav" :class="{ active: isAssetManageActive }" @click="assetManageOpen = !assetManageOpen">
          <FolderCog :size="18" />
          我的资产
          <ChevronDown class="chevron" :class="{ open: assetManageOpen }" :size="16" />
        </button>
        <div v-if="assetManageOpen" class="sub-nav-wrap">
          <button class="sub-nav" :class="{ active: activeView === 'assetStats' }" @click="openAssetStats">
            <WalletCards :size="18" />
            资产管理
          </button>
          <button class="sub-nav" :class="{ active: activeView === 'accountNames' }" @click="openAccountNames">
            <BookUser :size="18" />
            账户名称管理
          </button>
          <button class="sub-nav" :class="{ active: activeView === 'investmentTypes' }" @click="openInvestmentTypes">
            <Tags :size="18" />
            投资类型管理
          </button>
        </div>
      </nav>
    </aside>

    <main class="app-shell">
      <section v-if="activeView === 'dashboard'">
        <header class="page-header page-header-inline">
          <h1>资产总览</h1>
          <a-button class="visibility-toggle" @click="hideSensitiveAmounts = !hideSensitiveAmounts">
            <template #icon>
              <EyeOff v-if="hideSensitiveAmounts" :size="16" />
              <Eye v-else :size="16" />
            </template>
          </a-button>
        </header>

        <section class="metric-grid">
          <article class="metric-card asset">
            <span>总资产</span>
            <strong>{{ sensitiveMoney(summary.totalAssets) }}</strong>
          </article>
          <article class="metric-card liability">
            <span>总负债</span>
            <strong>{{ sensitiveMoney(summary.totalLiabilities) }}</strong>
          </article>
          <article class="metric-card net">
            <span>净资产</span>
            <strong>{{ sensitiveMoney(summary.netAssets) }}</strong>
          </article>
          <article class="metric-card">
            <span>账户数量</span>
            <strong>{{ summary.accounts.length }}</strong>
          </article>
        </section>

        <section class="chart-grid">
          <div class="panel chart-panel half">
            <LineChart title="资产 / 负债曲线" :points="categoryTrend" :y-formatter="money" />
          </div>
          <div class="panel chart-panel half">
            <LineChart title="风险等级曲线" :points="riskTrend" :y-formatter="money" />
          </div>
          <div class="panel chart-panel full">
            <LineChart title="投资类型增长曲线" :points="investmentTrend" :y-formatter="money" />
          </div>
          <div class="panel chart-panel pie-half">
            <PieChart title="投资类型占比" :points="investmentDistribution" />
          </div>
          <div class="panel chart-panel pie-half">
            <PieChart title="风险等级占比" :points="riskDistribution" />
          </div>
        </section>
      </section>

      <section v-else-if="activeView === 'assetStats'">
        <header class="page-header">
          <h1>{{ accountMonth }} 资产管理</h1>
        </header>

        <section v-if="message" class="notice">{{ message }}</section>

        <section class="metric-grid">
          <article class="metric-card asset">
            <span>总资产</span>
            <strong>{{ money(accountSummary.totalAssets) }}</strong>
          </article>
          <article class="metric-card liability">
            <span>总负债</span>
            <strong>{{ money(accountSummary.totalLiabilities) }}</strong>
          </article>
          <article class="metric-card net">
            <span>净资产</span>
            <strong>{{ money(accountSummary.netAssets) }}</strong>
          </article>
          <article class="metric-card">
            <span>记录数量</span>
            <strong>{{ accountSummary.accounts.length }}</strong>
          </article>
        </section>

        <section class="chart-grid">
          <div class="panel chart-panel pie-half">
            <PieChart title="资产类型占比" :points="accountAssetCategoryDistribution" />
          </div>
          <div class="panel chart-panel pie-half">
            <PieChart title="投资类型占比" :points="accountInvestmentDistribution" />
          </div>
          <div class="panel chart-panel pie-half">
            <PieChart title="风险等级占比" :points="accountRiskDistribution" />
          </div>
          <div class="panel chart-panel pie-half">
            <PieChart title="账户占比" :points="accountNameDistribution" />
          </div>
        </section>

        <section class="filter-strip panel glass-panel">
          <div class="filters filter-strip-grid">
            <label>
              查看月份
              <input v-model="accountFiltersDraft.month" type="month" />
            </label>
            <label>
              账户名称
              <select v-model="accountFiltersDraft.name">
                <option value="">全部</option>
                <option v-for="item in accountNames" :key="item.id" :value="item.name">{{ item.name }}</option>
              </select>
            </label>
            <label>
              资产类型
              <select v-model="accountFiltersDraft.assetCategory">
                <option value="">全部</option>
                <option value="ASSET">资产</option>
                <option value="LIABILITY">负债</option>
              </select>
            </label>
            <label>
              投资类型
              <select v-model="accountFiltersDraft.investmentType">
                <option value="">全部</option>
                <option v-for="item in investmentTypes" :key="item.id" :value="item.name">{{ item.name }}</option>
              </select>
            </label>
            <label>
              风险等级
              <select v-model="accountFiltersDraft.riskLevel">
                <option value="">全部</option>
                <option value="LOW">低</option>
                <option value="MEDIUM">中</option>
                <option value="HIGH">高</option>
                <option value="NONE">无</option>
              </select>
            </label>
          </div>
          <div class="action-row">
            <a-button @click="resetAccountFilters">重置</a-button>
            <a-button @click="applyAccountFilters">搜索</a-button>
            <a-button type="primary" @click="accountEditorRef?.startCreate()">新增</a-button>
          </div>
        </section>

        <AccountEditor
          ref="accountEditorRef"
          :accounts="filteredAccountRows"
          :account-names="accountNames"
          :investment-types="investmentTypes"
          :month="accountMonth"
          @create-name="quickCreateAccountName"
          @save="saveAccount"
          @remove="removeAccount"
        />
      </section>

      <section v-else-if="activeView === 'accountNames'">
        <header class="page-header">
          <h1>账户名称管理</h1>
        </header>
        <section class="filter-strip panel glass-panel">
          <div class="filters filter-strip-grid">
            <label>
              账户名称
              <input v-model="accountNameFiltersDraft.keyword" type="text" placeholder="输入账户名称筛选" />
            </label>
            <label>
              创建时间
              <input v-model="accountNameFiltersDraft.month" type="month" />
            </label>
          </div>
          <div class="action-row">
            <a-button @click="resetAccountNameFilters">重置</a-button>
            <a-button @click="applyAccountNameFilters">搜索</a-button>
            <a-button danger :disabled="!filteredAccountNames.length" @click="accountNameManagerRef?.confirmBatchRemove()">批量删除</a-button>
            <a-button type="primary" @click="accountNameManagerRef?.startCreate()">新增</a-button>
          </div>
        </section>

        <section v-if="message" class="notice">{{ message }}</section>

        <AccountNameManager
          ref="accountNameManagerRef"
          :names="filteredAccountNames"
          @batch-remove="batchRemoveAccountNames"
          @save="saveAccountName"
          @remove="removeAccountName"
        />
      </section>

      <section v-else>
        <header class="page-header">
          <h1>投资类型管理</h1>
        </header>
        <section class="filter-strip panel glass-panel">
          <div class="filters filter-strip-grid">
            <label>
              名称
              <input v-model="investmentTypeFiltersDraft.keyword" type="text" placeholder="输入名称筛选" />
            </label>
            <label>
              风险等级
              <select v-model="investmentTypeFiltersDraft.riskLevel">
                <option value="">全部</option>
                <option value="LOW">低</option>
                <option value="MEDIUM">中</option>
                <option value="HIGH">高</option>
                <option value="NONE">无</option>
              </select>
            </label>
            <label>
              创建时间
              <input v-model="investmentTypeFiltersDraft.month" type="month" />
            </label>
          </div>
          <div class="action-row">
            <a-button @click="resetInvestmentTypeFilters">重置</a-button>
            <a-button @click="applyInvestmentTypeFilters">搜索</a-button>
            <a-button danger :disabled="!filteredInvestmentTypes.length" @click="investmentTypeManagerRef?.confirmBatchRemove()">批量删除</a-button>
            <a-button type="primary" @click="investmentTypeManagerRef?.startCreate()">新增</a-button>
          </div>
        </section>

        <section v-if="message" class="notice">{{ message }}</section>

        <InvestmentTypeManager
          ref="investmentTypeManagerRef"
          :types="filteredInvestmentTypes"
          @batch-remove="batchRemoveInvestmentTypes"
          @save="saveInvestmentType"
          @remove="removeInvestmentType"
        />
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { message as antMessage, Modal } from 'ant-design-vue'
import { BookUser, ChevronDown, Eye, EyeOff, FolderCog, LayoutDashboard, Tags, WalletCards } from 'lucide-vue-next'
import { accountApi, accountNameApi, analyticsApi, investmentTypeApi, snapshotApi } from './api/client'
import AccountEditor from './components/AccountEditor.vue'
import AccountNameManager from './components/AccountNameManager.vue'
import InvestmentTypeManager from './components/InvestmentTypeManager.vue'
import LineChart from './components/LineChart.vue'
import PieChart from './components/PieChart.vue'

const nowMonth = new Date().toISOString().slice(0, 7)

const activeView = ref('dashboard')
const assetManageOpen = ref(true)
const hideSensitiveAmounts = ref(true)
const month = ref(nowMonth)
const accountMonth = ref(nowMonth)
const startMonth = ref(`${new Date().getFullYear()}-01`)
const endMonth = ref(nowMonth)
const assetCategoryFilter = ref('ALL')
const message = ref('')

const accountEditorRef = ref(null)
const accountNameManagerRef = ref(null)
const investmentTypeManagerRef = ref(null)

const defaultAccountFilters = () => ({ month: '', name: '', assetCategory: '', investmentType: '', riskLevel: '' })
const defaultAccountNameFilters = () => ({ keyword: '', month: '' })
const defaultInvestmentTypeFilters = () => ({ keyword: '', riskLevel: '', month: '' })

const accountFiltersDraft = ref(defaultAccountFilters())
const accountFiltersApplied = ref(defaultAccountFilters())
const accountNameFiltersDraft = ref(defaultAccountNameFilters())
const accountNameFiltersApplied = ref(defaultAccountNameFilters())
const investmentTypeFiltersDraft = ref(defaultInvestmentTypeFilters())
const investmentTypeFiltersApplied = ref(defaultInvestmentTypeFilters())

const accounts = ref([])
const accountNames = ref([])
const investmentTypes = ref([])
const snapshotMonths = ref([])
const summary = ref({ totalAssets: 0, totalLiabilities: 0, netAssets: 0, accounts: [] })
const accountSummary = ref({ totalAssets: 0, totalLiabilities: 0, netAssets: 0, accounts: [] })
const categoryTrend = ref([])
const investmentTrend = ref([])
const riskTrend = ref([])
const investmentDistribution = ref([])
const riskDistribution = ref([])

const isAssetManageActive = computed(() => ['assetStats', 'accountNames', 'investmentTypes'].includes(activeView.value))
const latestSnapshotMonth = computed(() => snapshotMonths.value.at(-1) || '')

const accountRows = computed(() =>
  (accountSummary.value.accounts || []).map((account) => ({
    ...account,
    id: account.accountId,
    snapshotNote: account.note || ''
  }))
)

const filteredAccountRows = computed(() =>
  accountRows.value.filter((item) => {
    const filters = accountFiltersApplied.value
    if (filters.name && item.name !== filters.name) return false
    if (filters.assetCategory && item.assetCategory !== filters.assetCategory) return false
    if (filters.investmentType && item.investmentType !== filters.investmentType) return false
    if (filters.riskLevel && item.riskLevel !== filters.riskLevel) return false
    return true
  })
)

const filteredAccountNames = computed(() =>
  accountNames.value.filter((item) => {
    const filters = accountNameFiltersApplied.value
    if (filters.keyword && !item.name.includes(filters.keyword.trim())) return false
    if (filters.month && !sameMonth(item.createdAt, filters.month)) return false
    return true
  })
)

const filteredInvestmentTypes = computed(() =>
  investmentTypes.value.filter((item) => {
    const filters = investmentTypeFiltersApplied.value
    if (filters.keyword && !item.name.includes(filters.keyword.trim())) return false
    if (filters.riskLevel && item.riskLevel !== filters.riskLevel) return false
    if (filters.month && !sameMonth(item.createdAt, filters.month)) return false
    return true
  })
)

const buildAmountDistribution = (items, getKey, getName) => {
  const grouped = new Map()
  for (const item of items || []) {
    const key = getKey(item)
    if (!key || key === '未设置') continue
    const amount = Number(item.amount || 0)
    if (!amount) continue
    grouped.set(key, (grouped.get(key) || 0) + amount)
  }
  return Array.from(grouped.entries())
    .map(([key, value]) => ({ name: getName(key), value }))
    .sort((a, b) => Number(b.value) - Number(a.value))
}

const accountAssetCategoryDistribution = computed(() =>
  buildAmountDistribution(
    accountSummary.value.accounts,
    (item) => item.assetCategory,
    (key) => ({ ASSET: '资产', LIABILITY: '负债' }[key] || key)
  )
)

const accountInvestmentDistribution = computed(() =>
  buildAmountDistribution(accountSummary.value.accounts, (item) => item.investmentType, (key) => key)
)

const accountRiskDistribution = computed(() =>
  buildAmountDistribution(
    accountSummary.value.accounts,
    (item) => item.riskLevel,
    (key) => ({ LOW: '低风险', MEDIUM: '中风险', HIGH: '高风险', NONE: '无' }[key] || key)
  )
)

const accountNameDistribution = computed(() =>
  buildAmountDistribution(accountSummary.value.accounts, (item) => item.name, (key) => key)
)

const money = (value) =>
  `¥${Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const sensitiveMoney = (value) => (hideSensitiveAmounts.value ? '****' : money(value))

const flash = (text) => {
  message.value = text
  antMessage.success(text)
  window.setTimeout(() => {
    if (message.value === text) message.value = ''
  }, 2400)
}

const warn = (text) => {
  message.value = text
  antMessage.warning(text)
  window.setTimeout(() => {
    if (message.value === text) message.value = ''
  }, 3200)
}

const sameMonth = (value, monthValue) => {
  if (!value || !monthValue) return false
  return new Date(value).toISOString().slice(0, 7) === monthValue
}

const isVisiblePointName = (name) => {
  if (!name) return false
  const text = String(name).trim()
  return text !== '未设置'
}

const normalizePointName = (name) => {
  if (!isVisiblePointName(name)) return ''
  return {
    ASSET: '资产',
    LIABILITY: '负债',
    LOW: '低风险',
    MEDIUM: '中风险',
    HIGH: '高风险',
    NONE: '无'
  }[name] || name
}

const cleanChartPoints = (items) =>
  items
    .map((item) => ({ ...item, name: normalizePointName(item.name) }))
    .filter((item) => isVisiblePointName(item.name))

const loadAccounts = async () => {
  accounts.value = await accountApi.list()
}

const loadAccountNames = async () => {
  accountNames.value = await accountNameApi.list()
}

const loadInvestmentTypes = async () => {
  investmentTypes.value = await investmentTypeApi.list()
}

const loadSnapshotMonths = async () => {
  snapshotMonths.value = await snapshotApi.months()
}

const loadMonthData = async () => {
  summary.value = await snapshotApi.summary(month.value)
  await loadAnalytics()
}

const loadAccountMonthData = async () => {
  accountSummary.value = await snapshotApi.summary(accountMonth.value)
}

const loadAnalytics = async () => {
  if (!startMonth.value || !endMonth.value) return
  const filter = assetCategoryFilter.value
  const [category, investment, risk, investmentPie, riskPie] = await Promise.all([
    analyticsApi.categoryTrend(startMonth.value, endMonth.value),
    analyticsApi.investmentTrend(startMonth.value, endMonth.value, filter),
    analyticsApi.riskTrend(startMonth.value, endMonth.value, filter),
    analyticsApi.investmentDistribution(month.value, filter),
    analyticsApi.riskDistribution(month.value, filter)
  ])
  categoryTrend.value = cleanChartPoints(category)
  investmentTrend.value = cleanChartPoints(investment)
  riskTrend.value = cleanChartPoints(risk)
  investmentDistribution.value = cleanChartPoints(investmentPie)
  riskDistribution.value = cleanChartPoints(riskPie)
}

const syncToLatestMonthWithData = () => {
  if (!latestSnapshotMonth.value) return
  month.value = latestSnapshotMonth.value
  accountMonth.value = latestSnapshotMonth.value
  endMonth.value = latestSnapshotMonth.value
  accountFiltersDraft.value.month = latestSnapshotMonth.value
  accountFiltersApplied.value.month = latestSnapshotMonth.value
  const [year] = latestSnapshotMonth.value.split('-')
  startMonth.value = `${year}-01`
}

const resetDashboardState = () => {
  month.value = nowMonth
  assetCategoryFilter.value = 'ALL'
  startMonth.value = snapshotMonths.value[0] || nowMonth
  endMonth.value = snapshotMonths.value.at(-1) || nowMonth
}

const resetAssetStatsState = () => {
  const defaultMonth = latestSnapshotMonth.value || nowMonth
  accountMonth.value = defaultMonth
  accountFiltersDraft.value = { ...defaultAccountFilters(), month: defaultMonth }
  accountFiltersApplied.value = { ...defaultAccountFilters(), month: defaultMonth }
}

const resetAccountNamesState = () => {
  accountNameFiltersDraft.value = defaultAccountNameFilters()
  accountNameFiltersApplied.value = defaultAccountNameFilters()
}

const resetInvestmentTypesState = () => {
  investmentTypeFiltersDraft.value = defaultInvestmentTypeFilters()
  investmentTypeFiltersApplied.value = defaultInvestmentTypeFilters()
}

const applyAccountFilters = async () => {
  accountFiltersApplied.value = { ...accountFiltersDraft.value }
  if (accountFiltersDraft.value.month && accountFiltersDraft.value.month !== accountMonth.value) {
    accountMonth.value = accountFiltersDraft.value.month
    await loadAccountMonthData()
  }
}

const resetAccountFilters = async () => {
  accountFiltersDraft.value = { ...defaultAccountFilters(), month: accountMonth.value }
  accountFiltersApplied.value = { ...accountFiltersDraft.value }
  await loadAccountMonthData()
}

const applyAccountNameFilters = () => {
  accountNameFiltersApplied.value = { ...accountNameFiltersDraft.value }
}

const resetAccountNameFilters = () => {
  accountNameFiltersDraft.value = defaultAccountNameFilters()
  accountNameFiltersApplied.value = defaultAccountNameFilters()
}

const applyInvestmentTypeFilters = () => {
  investmentTypeFiltersApplied.value = { ...investmentTypeFiltersDraft.value }
}

const resetInvestmentTypeFilters = () => {
  investmentTypeFiltersDraft.value = defaultInvestmentTypeFilters()
  investmentTypeFiltersApplied.value = defaultInvestmentTypeFilters()
}

const openDashboard = async () => {
  activeView.value = 'dashboard'
  resetDashboardState()
  await loadMonthData()
}

const openAssetStats = async () => {
  activeView.value = 'assetStats'
  assetManageOpen.value = true
  await loadSnapshotMonths()
  resetAssetStatsState()
  await loadAccountMonthData()
}

const openAccountNames = async () => {
  activeView.value = 'accountNames'
  assetManageOpen.value = true
  resetAccountNamesState()
  await loadAccountNames()
}

const openInvestmentTypes = async () => {
  activeView.value = 'investmentTypes'
  assetManageOpen.value = true
  resetInvestmentTypesState()
  await loadInvestmentTypes()
}

const quickCreateAccountName = async (name) => {
  try {
    await accountNameApi.create({ name, identifier: '', remark: '' })
    await loadAccountNames()
    flash('账户名称已新增')
  } catch (error) {
    warn(error.response?.data?.message || '账户名称新增失败')
  }
}

const saveAccount = async ({ id, payload, amount, done }) => {
  try {
    const savedAccount = id ? await accountApi.update(id, payload) : await accountApi.create(payload)
    await snapshotApi.save({
      accountId: savedAccount.id,
      month: accountMonth.value,
      amount,
      note: ''
    })
    await loadAccounts()
    await loadAccountNames()
    await loadSnapshotMonths()
    if (latestSnapshotMonth.value) {
      month.value = latestSnapshotMonth.value
      endMonth.value = latestSnapshotMonth.value
    }
    await loadMonthData()
    await loadAccountMonthData()
    flash('资产记录已保存')
    done?.(true)
  } catch (error) {
    warn(error.response?.data?.message || '资产记录保存失败')
    done?.(false)
  }
}

const removeAccount = async (id) => {
  Modal.confirm({
    title: '删除资产记录',
    content: '确定删除这条资产记录吗？对应月度快照也会被删除。',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    centered: true,
    async onOk() {
      await accountApi.remove(id)
      await loadAccounts()
      await loadSnapshotMonths()
      if (latestSnapshotMonth.value) {
        month.value = latestSnapshotMonth.value
        accountMonth.value = latestSnapshotMonth.value
        endMonth.value = latestSnapshotMonth.value
      }
      await loadMonthData()
      await loadAccountMonthData()
      flash('资产记录已删除')
    }
  })
}

const saveAccountName = async ({ id, payload, done }) => {
  try {
    if (id) await accountNameApi.update(id, payload)
    else await accountNameApi.create(payload)
    await loadAccountNames()
    await loadAccounts()
    await loadMonthData()
    await loadAccountMonthData()
    flash('账户名称已保存')
    done?.(true)
  } catch (error) {
    warn(error.response?.data?.message || '账户名称保存失败')
    done?.(false)
  }
}

const removeAccountName = async (name) => {
  try {
    await accountNameApi.remove(name.id)
    await loadAccountNames()
    flash('账户名称已删除')
  } catch (error) {
    warn(error.response?.data?.message || '账户名称删除失败')
  }
}

const batchRemoveAccountNames = async (rows) => {
  let success = 0
  let failed = 0
  for (const row of rows) {
    try {
      await accountNameApi.remove(row.id)
      success += 1
    } catch {
      failed += 1
    }
  }
  await loadAccountNames()
  if (failed) warn(`已删除 ${success} 个，${failed} 个因已被资产管理使用未删除`)
  else flash(`已删除 ${success} 个账户名称`)
}

const saveInvestmentType = async ({ id, payload, done }) => {
  try {
    if (id) await investmentTypeApi.update(id, payload)
    else await investmentTypeApi.create(payload)
    await loadInvestmentTypes()
    await loadAccounts()
    await loadAnalytics()
    flash('投资类型已保存')
    done?.(true)
  } catch (error) {
    warn(error.response?.data?.message || '投资类型保存失败')
    done?.(false)
  }
}

const removeInvestmentType = async (type) => {
  try {
    await investmentTypeApi.remove(type.id)
    await loadInvestmentTypes()
    await loadAnalytics()
    flash('投资类型已删除')
  } catch (error) {
    warn(error.response?.data?.message || '投资类型删除失败')
  }
}

const batchRemoveInvestmentTypes = async (rows) => {
  let success = 0
  let failed = 0
  for (const row of rows) {
    try {
      await investmentTypeApi.remove(row.id)
      success += 1
    } catch {
      failed += 1
    }
  }
  await loadInvestmentTypes()
  await loadAnalytics()
  if (failed) warn(`已删除 ${success} 个，${failed} 个因已被资产管理使用未删除`)
  else flash(`已删除 ${success} 个投资类型`)
}

onMounted(async () => {
  await Promise.all([loadAccounts(), loadAccountNames(), loadInvestmentTypes(), loadSnapshotMonths()])
  resetDashboardState()
  resetAssetStatsState()
  await Promise.all([loadMonthData(), loadAccountMonthData()])
})
</script>
