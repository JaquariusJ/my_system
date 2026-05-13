<template>
  <section class="panel glass-panel">
    <a-form v-if="editing" class="ant-form-card" layout="vertical">
      <a-row :gutter="16">
        <a-col :md="8" :xs="24">
          <a-form-item label="账户名称" required>
            <a-input v-model:value="form.name" placeholder="招商银行储蓄卡" />
          </a-form-item>
        </a-col>
        <a-col :md="8" :xs="24">
          <a-form-item label="标识">
            <a-input v-model:value="form.identifier" placeholder="尾号 8888 / A 股账户" />
          </a-form-item>
        </a-col>
        <a-col :md="6" :xs="24">
          <a-form-item label="备注">
            <a-input v-model:value="form.remark" placeholder="可选" />
          </a-form-item>
        </a-col>
        <a-col :md="2" :xs="24" class="form-actions ant-actions">
          <a-button @click="cancel">取消</a-button>
          <a-button type="primary" @click="submit">保存</a-button>
        </a-col>
      </a-row>
    </a-form>

    <a-table
      :columns="columns"
      :data-source="names"
      :pagination="{ pageSize: 8, showSizeChanger: false }"
      :row-key="(row) => row.id"
      :row-selection="rowSelection"
      class="apple-table"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'"><strong>{{ record.name }}</strong></template>
        <template v-else-if="column.key === 'identifier'">{{ record.identifier || '-' }}</template>
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
import { Modal } from 'ant-design-vue'

const props = defineProps({
  names: { type: Array, default: () => [] }
})

const emit = defineEmits(['save', 'remove', 'batch-remove'])
const editing = ref(false)
const editingId = ref(null)
const selectedRowKeys = ref([])

const columns = [
  { title: '账户名称', dataIndex: 'name', key: 'name' },
  { title: '标识', dataIndex: 'identifier', key: 'identifier' },
  { title: '备注', dataIndex: 'remark', key: 'remark' },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 210 },
  { title: '操作', key: 'actions', width: 150, align: 'right' }
]

const emptyForm = () => ({ name: '', identifier: '', remark: '' })
const form = reactive(emptyForm())

const selectedRows = computed(() => props.names.filter((item) => selectedRowKeys.value.includes(item.id)))
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

const startEdit = (name) => {
  editingId.value = name.id
  Object.assign(form, emptyForm(), name)
  editing.value = true
}

const cancel = () => {
  editing.value = false
}

const submit = () => {
  const payload = {
    name: (form.name || '').trim(),
    identifier: (form.identifier || '').trim(),
    remark: (form.remark || '').trim()
  }
  if (!payload.name) return
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
    title: '删除账户名称',
    content: `确定删除“${record.name}”吗？如果已在资产统计中使用，需要先删除对应资产项。`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    centered: true,
    onOk: () => emit('remove', record)
  })
}

const confirmBatchRemove = () => {
  Modal.confirm({
    title: '批量删除账户名称',
    content: `确定删除选中的 ${selectedRows.value.length} 个账户名称吗？已在资产统计中使用的名称会删除失败。`,
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

defineExpose({
  startCreate,
  confirmBatchRemove
})
</script>
