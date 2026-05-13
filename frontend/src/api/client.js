import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

export const accountApi = {
  list: () => api.get('/accounts', { params: { activeOnly: false } }).then((res) => res.data),
  create: (payload) => api.post('/accounts', payload).then((res) => res.data),
  update: (id, payload) => api.put(`/accounts/${id}`, payload).then((res) => res.data),
  remove: (id) => api.delete(`/accounts/${id}`).then((res) => res.data)
}

export const accountNameApi = {
  list: () => api.get('/account-names').then((res) => res.data),
  create: (payload) => api.post('/account-names', payload).then((res) => res.data),
  update: (id, payload) => api.put(`/account-names/${id}`, payload).then((res) => res.data),
  remove: (id) => api.delete(`/account-names/${id}`).then((res) => res.data)
}

export const investmentTypeApi = {
  list: () => api.get('/investment-types').then((res) => res.data),
  create: (payload) => api.post('/investment-types', payload).then((res) => res.data),
  update: (id, payload) => api.put(`/investment-types/${id}`, payload).then((res) => res.data),
  remove: (id) => api.delete(`/investment-types/${id}`).then((res) => res.data)
}

export const snapshotApi = {
  months: () => api.get('/snapshots/months').then((res) => res.data),
  summary: (month) => api.get('/snapshots/summary', { params: { month } }).then((res) => res.data),
  save: (payload) => api.post('/snapshots', payload).then((res) => res.data)
}

export const analyticsApi = {
  categoryTrend: (startMonth, endMonth) =>
    api.get('/analytics/trend/category', { params: { startMonth, endMonth } }).then((res) => res.data),
  investmentTrend: (startMonth, endMonth, assetCategory) =>
    api.get('/analytics/trend/investment-type', { params: { startMonth, endMonth, assetCategory } }).then((res) => res.data),
  riskTrend: (startMonth, endMonth, assetCategory) =>
    api.get('/analytics/trend/risk', { params: { startMonth, endMonth, assetCategory } }).then((res) => res.data),
  investmentDistribution: (month, assetCategory) =>
    api.get('/analytics/distribution/investment-type', { params: { month, assetCategory } }).then((res) => res.data),
  riskDistribution: (month, assetCategory) =>
    api.get('/analytics/distribution/risk', { params: { month, assetCategory } }).then((res) => res.data)
}
