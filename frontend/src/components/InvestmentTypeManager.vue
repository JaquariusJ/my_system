<template>
  <section class="panel glass-panel">
    <a-form v-if="editing" class="ant-form-card" layout="vertical">
      <a-row :gutter="16">
        <a-col :md="7" :xs="24">
          <a-form-item label="名称" required>
            <a-input v-model:value="form.name" placeholder="银行理财" />
          </a-form-item>
        </a-col>
        <a-col :md="5" :xs="24">
          <a-form-item label="风险等级" required>
            <a-select v-model:value="form.riskLevel" placeholder="请选择风险等级">
              <a-select-option value="LOW">低</a-select-option>
              <a-select-option value="MEDIUM">中</a-select-option>
              <a-select-option value="HIGH">高</a-select-option>
              <a-select-option value="NONE">无</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :md="8" :xs="24">
          <a-form-item label="备注">
            <a-input v-model:value="form.remark" placeholder="可选" />
          </a-form-item>
        </a-col>
        <a-col :md="4" :xs="24" class="form-actions ant-actions">
          <a-button @click="cancel">取消</a-button>
          <a-button type="primary" @click="submit">保存</a-button>
        </a-col>
      </a-row>
    </a-form>

    <a-table
      :columns="columns"
      :data-source="types"
      :pagination="{ pageSize: 8, showSizeChanger: false }"
      :row-key="(row) => row.id"
      :row-selection="rowSelection"
      class="apple-table"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'"><strong>{{ record.name }}</strong></template>
        <template v-else-if="column.key === 'riskLevel'">{{ riskText(record.riskLevel) }}</template>
        <template v-else-if="column.key === 'remark'">{{ record.remark || '-' }}</template>
        <template v-else-if="column.key === 'createdAt'">{{ formatDate(record.createdAt) }}</template>
        <template v-else-if="column.key === 'actions'">
          <div class="actions">
            <a-tooltip title="编辑">
              <a-button class="action-icon" shape="circle" size="small" @click="startEdit(record)">
                <template #icon><EditOutlined /></template>
              </a-button>
            </a-tooltip>
            <a-tooltip title="删除">
              <a-button class="action-icon danger" shape="circle" size="small" @click="confirmRemove(record)">
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
import { computed, reactive, ref } from 'vue'
import { DeleteOutlined, EditOutlined } from '@ant-design/icons-vue'
import { message as antMessage, Modal } from 'ant-design-vue'

const props = defineProps({
  types: { type: Array, default: () => [] }
})

const emit = defineEmits(['save', 'remove', 'batch-remove'])
const editing = ref(false)
const editingId = ref(null)
const selectedRowKeys = ref([])

const columns = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '风险等级', dataIndex: 'riskLevel', key: 'riskLevel', width: 120 },
  { title: '备注', dataIndex: 'remark', key: 'remark' },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 210 },
  { title: '操作', key: 'actions', width: 150, align: 'right' }
]

const emptyForm = () => ({ name: '', riskLevel: undefined, remark: '' })
const form = reactive(emptyForm())

const selectedRows = computed(() => props.types.filter((item) => selectedRowKeys.value.includes(item.id)))
const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  }
}))

const startCreate = () => {
  editingId.value = null
  Object.assign(form, emptyForm())
  editing.value = true
}

const startEdit = (type) => {
  editingId.value = type.id
  Object.assign(form, emptyForm(), type)
  editing.value = true
}

const cancel = () => {
  editing.value = false
}

const submit = () => {
  const payload = {
    name: (form.name || '').trim(),
    riskLevel: form.riskLevel,
    remark: (form.remark || '').trim()
  }
  if (!payload.name) {
    antMessage.warning('请输入投资类型名称')
    return
  }
  if (!payload.riskLevel) {
    antMessage.warning('请选择风险等级')
    return
  }
  emit('save', {
    id: editingId.value,
    payload,
    done: (success) => {
      if (success) editing.value = false
    }
  })
}

const confirmRemove = (record) => {
  Modal.confirm({
    title: '删除投资类型',
    content: `确定删除“${record.name}”吗？如果该类型已被资产统计使用，需要先删除对应资产项。`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    centered: true,
    onOk: () => emit('remove', record)
  })
}

const confirmBatchRemove = () => {
  Modal.confirm({
    title: '批量删除投资类型',
    content: `确定删除选中的 ${selectedRows.value.length} 个投资类型吗？已被资产统计使用的类型会删除失败。`,
    okText: '批量删除',
    okType: 'danger',
    cancelText: '取消',
    centered: true,
    onOk: () => {
      emit('batch-remove', selectedRows.value)
      selectedRowKeys.value = []
    }
  })
}

const formatDate = (value) => (value ? new Date(value).toLocaleString('zh-CN') : '-')
const riskText = (value) => ({ LOW: '低', MEDIUM: '中', HIGH: '高', NONE: '无' }[value] || '-')

defineExpose({
  startCreate,
  confirmBatchRemove
})
</script>
