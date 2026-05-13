<template>
  <section class="panel glass-panel">
    <a-form v-if="editing" class="ant-form-card" layout="vertical">
      <a-row :gutter="16">
        <a-col :lg="8" :md="12" :xs="24">
          <a-form-item label="账户名称" required>
            <div class="inline-control">
              <a-select v-model:value="form.name" placeholder="请选择账户名称">
                <a-select-option v-for="name in accountNameOptions" :key="name.name" :value="name.name">
                  {{ name.name }}
                </a-select-option>
              </a-select>
              <a-button @click="quickAddingName = !quickAddingName">+</a-button>
            </div>
          </a-form-item>
        </a-col>

        <a-col v-if="quickAddingName" :lg="8" :md="12" :xs="24">
          <a-form-item label="新账户名称">
            <div class="inline-control">
              <a-input v-model:value="quickName" placeholder="招商银行储蓄卡" />
              <a-button type="primary" @click="submitQuickName">添加</a-button>
            </div>
          </a-form-item>
        </a-col>

        <a-col :lg="8" :md="12" :xs="24">
          <a-form-item label="资产类型">
            <a-select v-model:value="form.assetCategory">
              <a-select-option value="ASSET">资产</a-select-option>
              <a-select-option value="LIABILITY">负债</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>

        <a-col :lg="8" :md="12" :xs="24">
          <a-form-item :required="isAsset" label="投资类型">
            <a-select
              v-model:value="form.investmentType"
              :allow-clear="!isAsset"
              :placeholder="isAsset ? '请选择投资类型' : '负债可不选择'"
            >
              <a-select-option v-for="type in investmentTypeOptions" :key="type.name" :value="type.name">
                {{ type.name }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>

        <a-col :lg="8" :md="12" :xs="24">
          <a-form-item label="风险等级">
            <a-input :value="selectedRiskText" disabled />
          </a-form-item>
        </a-col>

        <a-col :lg="8" :md="12" :xs="24">
          <a-form-item label="备注">
            <a-input v-model:value="form.remark" placeholder="可选" />
          </a-form-item>
        </a-col>

        <a-col :lg="8" :md="12" :xs="24">
          <a-form-item label="当月金额" required>
            <a-input-number v-model:value="form.amount" :min="0" :precision="2" class="full-input" />
          </a-form-item>
        </a-col>

        <a-col :lg="8" :md="12" :xs="24" class="form-actions ant-actions">
          <a-button @click="cancel">取消</a-button>
          <a-button type="primary" @click="submit">保存</a-button>
        </a-col>
      </a-row>
    </a-form>

    <a-table
      :columns="columns"
      :data-source="displayAccounts"
      :pagination="{ pageSize: 8, showSizeChanger: false }"
      :row-key="(row) => row.id"
      class="apple-table"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'"><strong>{{ record.name }}</strong></template>
        <template v-else-if="column.key === 'identifier'">{{ record.identifier || '-' }}</template>
        <template v-else-if="column.key === 'assetCategory'">{{ categoryText(record.assetCategory) }}</template>
        <template v-else-if="column.key === 'investmentType'">{{ record.investmentType || '-' }}</template>
        <template v-else-if="column.key === 'riskLevel'">{{ riskText(record.riskLevel) }}</template>
        <template v-else-if="column.key === 'remark'">{{ record.remark || '-' }}</template>
        <template v-else-if="column.key === 'amount'"><span class="amount-cell">{{ money(record.amount) }}</span></template>
        <template v-else-if="column.key === 'actions'">
          <div class="actions">
            <a-tooltip title="编辑">
              <a-button class="action-icon" shape="circle" size="small" @click="startEdit(record)">
                <template #icon><EditOutlined /></template>
              </a-button>
            </a-tooltip>
            <a-tooltip title="删除">
              <a-button class="action-icon danger" shape="circle" size="small" @click="$emit('remove', record.id)">
                <template #icon><DeleteOutlined /></template>
              </a-button>
            </a-tooltip>
          </div>
        </template>
      </template>
    </a-table>
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { DeleteOutlined, EditOutlined } from '@ant-design/icons-vue'
import { message as antMessage } from 'ant-design-vue'

const props = defineProps({
  accounts: { type: Array, default: () => [] },
  accountNames: { type: Array, default: () => [] },
  investmentTypes: { type: Array, default: () => [] },
  month: { type: String, required: true }
})

const emit = defineEmits(['save', 'remove', 'create-name'])
const editing = ref(false)
const editingId = ref(null)
const quickAddingName = ref(false)
const quickName = ref('')

const columns = [
  { title: '账户名称', dataIndex: 'name', key: 'name' },
  { title: '标识', dataIndex: 'identifier', key: 'identifier' },
  { title: '资产类型', dataIndex: 'assetCategory', key: 'assetCategory' },
  { title: '投资类型', dataIndex: 'investmentType', key: 'investmentType' },
  { title: '风险', dataIndex: 'riskLevel', key: 'riskLevel' },
  { title: '备注', dataIndex: 'remark', key: 'remark' },
  { title: '当月余额', dataIndex: 'amount', key: 'amount', align: 'right' },
  { title: '操作', key: 'actions', width: 150, align: 'right' }
]

const emptyForm = () => ({
  name: props.accountNames[0]?.name || '',
  amount: 0,
  assetCategory: 'ASSET',
  investmentType: props.investmentTypes[0]?.name || '',
  remark: ''
})

const form = reactive(emptyForm())
const isAsset = computed(() => form.assetCategory === 'ASSET')

const accountNameOptions = computed(() => {
  const options = [...props.accountNames]
  if (form.name && !options.some((item) => item.name === form.name)) {
    options.unshift({ name: form.name, identifier: '' })
  }
  return options
})

const investmentTypeOptions = computed(() => {
  const options = [...props.investmentTypes]
  if (form.investmentType && !options.some((item) => item.name === form.investmentType)) {
    options.unshift({ id: `custom-${form.investmentType}`, name: form.investmentType, riskLevel: undefined })
  }
  return options
})

const selectedInvestmentType = computed(() =>
  props.investmentTypes.find((item) => item.name === form.investmentType)
)

const selectedRiskText = computed(() => {
  if (!isAsset.value) return '-'
  return riskText(selectedInvestmentType.value?.riskLevel) || '未设置'
})

const accountNameMap = computed(() => new Map(props.accountNames.map((item) => [item.name, item])))
const displayAccounts = computed(() =>
  props.accounts.map((account) => ({
    ...account,
    identifier: accountNameMap.value.get(account.name)?.identifier || account.accountNoMasked || ''
  }))
)

const assignForm = (data) => {
  const { snapshotNote, accountId, createdAt, updatedAt, customFields, institution, accountNoMasked, identifier, riskLevel, ...editable } = data
  Object.assign(form, emptyForm(), editable, {
    investmentType: editable.investmentType || undefined,
    amount: Number(data.amount || 0)
  })
}

const startCreate = () => {
  editingId.value = null
  quickAddingName.value = false
  quickName.value = ''
  assignForm({})
  editing.value = true
}

const startEdit = (account) => {
  editingId.value = account.id
  quickAddingName.value = false
  quickName.value = ''
  assignForm(account)
  editing.value = true
}

const submitQuickName = () => {
  if (!quickName.value) return
  form.name = quickName.value.trim()
  emit('create-name', quickName.value.trim())
  quickName.value = ''
  quickAddingName.value = false
}

const cancel = () => {
  editing.value = false
}

const submit = () => {
  if (!form.name) {
    antMessage.warning('请选择账户名称')
    return
  }
  if (isAsset.value && !form.investmentType) {
    antMessage.warning('资产类型为资产时，投资类型必填')
    return
  }
  if (isAsset.value && !selectedInvestmentType.value?.riskLevel) {
    antMessage.warning('当前投资类型还没有配置风险等级，请先去投资类型管理中设置')
    return
  }
  const { amount, ...accountPayload } = form
  emit('save', {
    id: editingId.value,
    amount: Number(amount || 0),
    payload: {
      ...accountPayload,
      riskLevel: isAsset.value ? selectedInvestmentType.value?.riskLevel || null : null,
      accountNoMasked: '',
      institution: '',
      customFields: '',
      active: true
    },
    done: (success) => {
      if (success) editing.value = false
    }
  })
}

const money = (value) => `¥${Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const categoryText = (value) => (value === 'LIABILITY' ? '负债' : '资产')
const riskText = (value) => ({ LOW: '低', MEDIUM: '中', HIGH: '高', NONE: '无' }[value] || '')

watch(
  () => form.assetCategory,
  (value) => {
    if (value === 'LIABILITY') {
      form.investmentType = undefined
      return
    }
    if (!form.investmentType && props.investmentTypes.length) {
      form.investmentType = props.investmentTypes[0].name
    }
  }
)

defineExpose({
  startCreate
})
</script>
