<script setup lang="ts">
import type { FriendLinkGroup, FriendLinkItem, LinksFrontmatter } from '../../types/links'
import { computed, inject, onBeforeUnmount, reactive, ref, type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import SakuraLinks from '../SakuraLinks.vue'
import { adminTopbarTargetKey } from '../../utils/adminShellContext'
import { serializeLinksFrontmatter } from '../../utils/linksFrontmatter'
import { useAdminToast } from '../../composables/useAdminToast'

const props = defineProps<{
  initialFrontmatter?: Partial<LinksFrontmatter>
  initialLinkGroups?: FriendLinkGroup[]
}>()

const emit = defineEmits<{
  save: [payload: { source: string }]
}>()

const title = ref(String(props.initialFrontmatter?.title || '来加入我们叭'))
const cover = ref(String(props.initialFrontmatter?.cover || ''))
const icon = ref(String(props.initialFrontmatter?.icon || 'i-ri-links-line'))
const comment = ref(props.initialFrontmatter?.comment !== false)
const random = ref(props.initialFrontmatter?.random === true)
const errorImg = ref(String(props.initialFrontmatter?.errorImg || ''))
const groups = ref<FriendLinkGroup[]>(cloneGroups(props.initialLinkGroups || []))
const saving = ref(false)
const adminToast = useAdminToast()
const showTopbar = ref(true)
const topbarTarget = inject<Ref<HTMLElement | null>>(adminTopbarTargetKey, ref(null))

const linkDialogOpen = ref(false)
const groupDialogOpen = ref(false)
const pageDialogOpen = ref(false)
const editingGroupIndex = ref(-1)
const editingLinkIndex = ref(-1)
const linkDraft = reactive(createEmptyLink())
const groupDraft = reactive({ name: '', desc: '' })

const linkCount = computed(() =>
  groups.value.reduce((sum, group) => sum + (group.links?.length || 0), 0),
)

const isNewLink = computed(() => editingLinkIndex.value < 0)

const linkDialogTitle = computed(() => isNewLink.value ? '新建友链' : '编辑友链')

function cloneGroups(input: FriendLinkGroup[]) {
  return input.map(group => ({
    name: group.name || '',
    desc: group.desc || '',
    links: (group.links || []).map(link => ({ ...link })),
  }))
}

function createEmptyLink(): FriendLinkItem {
  return {
    url: '',
    avatar: '',
    name: '',
    blog: '',
    desc: '',
    color: '#0078e7',
    siteshot: '',
  }
}

function createEmptyGroup(): FriendLinkGroup {
  return {
    name: '新分组',
    desc: '',
    links: [],
  }
}

function resetLinkDraft(link?: FriendLinkItem) {
  const source = link || createEmptyLink()
  linkDraft.url = source.url || ''
  linkDraft.avatar = source.avatar || ''
  linkDraft.name = source.name || ''
  linkDraft.blog = source.blog || ''
  linkDraft.desc = source.desc || source.descr || ''
  linkDraft.color = source.color || '#0078e7'
  linkDraft.siteshot = source.siteshot || ''
}

function resetGroupDraft(group?: FriendLinkGroup) {
  groupDraft.name = group?.name || ''
  groupDraft.desc = group?.desc || ''
}

function openLinkDialog(groupIndex: number, linkIndex = -1) {
  editingGroupIndex.value = groupIndex
  editingLinkIndex.value = linkIndex
  if (linkIndex >= 0)
    resetLinkDraft(groups.value[groupIndex].links[linkIndex])
  else
    resetLinkDraft()
  linkDialogOpen.value = true
}

function openGroupDialog(groupIndex: number) {
  editingGroupIndex.value = groupIndex
  resetGroupDraft(groups.value[groupIndex])
  groupDialogOpen.value = true
}

function closeLinkDialog() {
  linkDialogOpen.value = false
  editingGroupIndex.value = -1
  editingLinkIndex.value = -1
}

function closeGroupDialog() {
  groupDialogOpen.value = false
  editingGroupIndex.value = -1
}

function addGroup() {
  groups.value.push(createEmptyGroup())
  openGroupDialog(groups.value.length - 1)
}

function saveLinkDraft() {
  if (!linkDraft.url.trim() || !linkDraft.avatar.trim() || !linkDraft.name.trim()) {
    adminToast.error('请填写 URL、头像和名称')
    return
  }

  const groupIndex = editingGroupIndex.value
  if (groupIndex < 0)
    return

  const payload: FriendLinkItem = {
    url: linkDraft.url.trim(),
    avatar: linkDraft.avatar.trim(),
    name: linkDraft.name.trim(),
    blog: linkDraft.blog.trim() || undefined,
    desc: linkDraft.desc.trim() || undefined,
    color: linkDraft.color.trim() || undefined,
    siteshot: linkDraft.siteshot.trim() || undefined,
  }

  if (editingLinkIndex.value >= 0)
    groups.value[groupIndex].links[editingLinkIndex.value] = payload
  else
    groups.value[groupIndex].links.push(payload)

  closeLinkDialog()
  persistChanges()
}

function deleteCurrentLink() {
  const groupIndex = editingGroupIndex.value
  const linkIndex = editingLinkIndex.value
  if (groupIndex < 0 || linkIndex < 0)
    return
  if (!confirm('确定删除这条友链吗？'))
    return
  groups.value[groupIndex].links.splice(linkIndex, 1)
  closeLinkDialog()
  persistChanges()
}

function saveGroupDraft() {
  if (!groupDraft.name.trim()) {
    adminToast.error('请填写分组名称')
    return
  }

  const groupIndex = editingGroupIndex.value
  if (groupIndex < 0)
    return

  groups.value[groupIndex].name = groupDraft.name.trim()
  groups.value[groupIndex].desc = groupDraft.desc.trim()
  closeGroupDialog()
  persistChanges()
}

function deleteCurrentGroup() {
  const groupIndex = editingGroupIndex.value
  if (groupIndex < 0)
    return
  if (!confirm('确定删除该分组及其所有友链吗？'))
    return
  groups.value.splice(groupIndex, 1)
  closeGroupDialog()
  persistChanges()
}

function moveGroup(direction: -1 | 1) {
  const index = editingGroupIndex.value
  const target = index + direction
  if (index < 0 || target < 0 || target >= groups.value.length)
    return
  const [item] = groups.value.splice(index, 1)
  groups.value.splice(target, 0, item)
  editingGroupIndex.value = target
}

function buildSource() {
  const frontmatter: LinksFrontmatter = {
    layout: 'links',
    title: title.value.trim(),
    icon: icon.value.trim() || 'i-ri-links-line',
    cover: cover.value.trim() || undefined,
    comment: comment.value,
    random: random.value || undefined,
    errorImg: errorImg.value.trim() || undefined,
    linkGroups: groups.value.map(group => ({
      name: group.name?.trim() || '',
      desc: group.desc?.trim() || '',
      links: group.links
        .map(link => ({
          url: link.url.trim(),
          avatar: link.avatar.trim(),
          name: link.name.trim(),
          blog: link.blog?.trim() || undefined,
          desc: (link.desc || link.descr || '').trim() || undefined,
          color: link.color?.trim() || undefined,
          siteshot: link.siteshot?.trim() || undefined,
        }))
        .filter(link => link.url && link.avatar && link.name),
    })).filter(group => group.links.length > 0),
  }

  return serializeLinksFrontmatter(frontmatter)
}

function closePageDialog() {
  if (!title.value.trim()) {
    adminToast.error('请填写页面标题')
    return
  }
  pageDialogOpen.value = false
  persistChanges()
}

function persistChanges() {
  if (saving.value) {
    adminToast.error('正在保存，请稍候')
    return
  }

  if (!title.value.trim()) {
    adminToast.error('请填写页面标题')
    pageDialogOpen.value = true
    return
  }

  saving.value = true
  emit('save', { source: buildSource() })
}

function teardown() {
  showTopbar.value = false
}

onBeforeRouteLeave(() => {
  teardown()
  return true
})

onBeforeUnmount(() => {
  teardown()
})

defineExpose({
  setSaving(value: boolean) {
    saving.value = value
  },
  setError(message: string | null) {
    if (message)
      adminToast.error(message)
    saving.value = false
  },
  setSuccess(message: string) {
    adminToast.success(message)
    saving.value = false
  },
})
</script>

<template>
  <div class="admin-links">
    <Teleport v-if="showTopbar && topbarTarget" :to="topbarTarget">
      <header class="admin-links__header">
        <div class="admin-links__heading">
          <h1>友链管理</h1>
          <p>{{ groups.length }} 个分组 · {{ linkCount }} 条友链</p>
        </div>
        <div class="admin-links__actions">
          <button type="button" class="admin-links__btn admin-links__btn--ghost" @click="pageDialogOpen = true">
            页面设置
          </button>
          <button type="button" class="admin-links__btn admin-links__btn--ghost" @click="addGroup">
            新增分组
          </button>
        </div>
      </header>
    </Teleport>

    <div class="admin-links__board">
      <p v-if="groups.length === 0" class="admin-links__empty">
        暂无友链分组，点击顶部「新增分组」开始添加。
      </p>

      <SakuraLinks
        v-else
        admin
        :link-groups="groups"
        :error-img="errorImg || undefined"
        @select-link="({ groupIndex, linkIndex }) => openLinkDialog(groupIndex, linkIndex)"
        @add-link="groupIndex => openLinkDialog(groupIndex)"
        @edit-group="groupIndex => openGroupDialog(groupIndex)"
      />
    </div>

    <Teleport to="body">
      <div v-if="linkDialogOpen" class="admin-links-dialog" @click.self="closeLinkDialog">
        <div class="admin-links-dialog__panel" role="dialog" aria-modal="true" :aria-label="linkDialogTitle">
          <header class="admin-links-dialog__head">
            <h2>{{ linkDialogTitle }}</h2>
            <button type="button" class="admin-links-dialog__close" aria-label="关闭" @click="closeLinkDialog">
              <span class="i-mdi-close" aria-hidden="true" />
            </button>
          </header>

          <div class="admin-links-dialog__body">
            <label class="admin-links-dialog__field">
              <span>站点 URL *</span>
              <input v-model="linkDraft.url" type="url" placeholder="https://example.com">
            </label>
            <label class="admin-links-dialog__field">
              <span>头像 URL *</span>
              <input v-model="linkDraft.avatar" type="url" placeholder="https://...">
            </label>
            <label class="admin-links-dialog__field">
              <span>名称 *</span>
              <input v-model="linkDraft.name" type="text" placeholder="站点名称">
            </label>
            <label class="admin-links-dialog__field">
              <span>显示名称</span>
              <input v-model="linkDraft.blog" type="text" placeholder="默认同名称">
            </label>
            <label class="admin-links-dialog__field admin-links-dialog__field--wide">
              <span>描述</span>
              <input v-model="linkDraft.desc" type="text" placeholder="一句话介绍">
            </label>
            <label class="admin-links-dialog__field">
              <span>主题色</span>
              <input v-model="linkDraft.color" type="text" placeholder="#0078e7">
            </label>
            <label class="admin-links-dialog__field admin-links-dialog__field--wide">
              <span>站点截图 URL</span>
              <input v-model="linkDraft.siteshot" type="url" placeholder="留空则自动生成预览图">
            </label>
          </div>

          <footer class="admin-links-dialog__foot">
            <button
              v-if="!isNewLink"
              type="button"
              class="admin-links-dialog__btn admin-links-dialog__btn--danger"
              @click="deleteCurrentLink"
            >
              删除
            </button>
            <div class="admin-links-dialog__foot-spacer" />
            <button type="button" class="admin-links-dialog__btn admin-links-dialog__btn--ghost" @click="closeLinkDialog">
              取消
            </button>
            <button type="button" class="admin-links-dialog__btn admin-links-dialog__btn--primary" :disabled="saving" @click="saveLinkDraft">
              {{ saving ? '保存中…' : '确定' }}
            </button>
          </footer>
        </div>
      </div>

      <div v-if="groupDialogOpen" class="admin-links-dialog" @click.self="closeGroupDialog">
        <div class="admin-links-dialog__panel admin-links-dialog__panel--narrow" role="dialog" aria-modal="true" aria-label="编辑分组">
          <header class="admin-links-dialog__head">
            <h2>编辑分组</h2>
            <button type="button" class="admin-links-dialog__close" aria-label="关闭" @click="closeGroupDialog">
              <span class="i-mdi-close" aria-hidden="true" />
            </button>
          </header>

          <div class="admin-links-dialog__body">
            <label class="admin-links-dialog__field admin-links-dialog__field--wide">
              <span>分组名称 *</span>
              <input v-model="groupDraft.name" type="text" placeholder="例如：紧密相连">
            </label>
            <label class="admin-links-dialog__field admin-links-dialog__field--wide">
              <span>分组描述</span>
              <input v-model="groupDraft.desc" type="text" placeholder="可选描述">
            </label>
            <div class="admin-links-dialog__move">
              <button type="button" class="admin-links-dialog__btn admin-links-dialog__btn--ghost" :disabled="editingGroupIndex <= 0" @click="moveGroup(-1)">
                上移分组
              </button>
              <button type="button" class="admin-links-dialog__btn admin-links-dialog__btn--ghost" :disabled="editingGroupIndex >= groups.length - 1" @click="moveGroup(1)">
                下移分组
              </button>
            </div>
          </div>

          <footer class="admin-links-dialog__foot">
            <button type="button" class="admin-links-dialog__btn admin-links-dialog__btn--danger" @click="deleteCurrentGroup">
              删除分组
            </button>
            <div class="admin-links-dialog__foot-spacer" />
            <button type="button" class="admin-links-dialog__btn admin-links-dialog__btn--ghost" @click="closeGroupDialog">
              取消
            </button>
            <button type="button" class="admin-links-dialog__btn admin-links-dialog__btn--primary" :disabled="saving" @click="saveGroupDraft">
              {{ saving ? '保存中…' : '确定' }}
            </button>
          </footer>
        </div>
      </div>

      <div v-if="pageDialogOpen" class="admin-links-dialog" @click.self="closePageDialog">
        <div class="admin-links-dialog__panel admin-links-dialog__panel--narrow" role="dialog" aria-modal="true" aria-label="页面设置">
          <header class="admin-links-dialog__head">
            <h2>页面设置</h2>
            <button type="button" class="admin-links-dialog__close" aria-label="关闭" @click="closePageDialog">
              <span class="i-mdi-close" aria-hidden="true" />
            </button>
          </header>

          <div class="admin-links-dialog__body">
            <label class="admin-links-dialog__field admin-links-dialog__field--wide">
              <span>页面标题</span>
              <input v-model="title" type="text" placeholder="来加入我们叭">
            </label>
            <label class="admin-links-dialog__field admin-links-dialog__field--wide">
              <span>头图 URL</span>
              <input v-model="cover" type="url" placeholder="https://...">
            </label>
            <label class="admin-links-dialog__field admin-links-dialog__field--wide">
              <span>图标 class</span>
              <input v-model="icon" type="text" placeholder="i-ri-links-line">
            </label>
            <label class="admin-links-dialog__field admin-links-dialog__field--wide">
              <span>截图失败占位图</span>
              <input v-model="errorImg" type="url" placeholder="可选">
            </label>
            <label class="admin-links-dialog__check">
              <input v-model="comment" type="checkbox">
              <span>开启评论</span>
            </label>
            <label class="admin-links-dialog__check">
              <input v-model="random" type="checkbox">
              <span>随机排序友链</span>
            </label>
          </div>

          <footer class="admin-links-dialog__foot">
            <div class="admin-links-dialog__foot-spacer" />
            <button type="button" class="admin-links-dialog__btn admin-links-dialog__btn--ghost" :disabled="saving" @click="closePageDialog">
              {{ saving ? '保存中…' : '保存并关闭' }}
            </button>
          </footer>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.admin-links {
  --admin-pink: #e93d6d;
  --admin-border: 1px solid #000;

  &__header {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
    width: 100%;
    min-width: 0;
  }

  &__heading {
    min-width: 0;

    h1 {
      margin: 0 0 0.1rem;
      font-size: 1.0625rem;
      font-weight: 700;
      color: #222;
    }

    p {
      margin: 0;
      font-size: 0.75rem;
      color: #888;
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.4rem;
    flex-shrink: 0;
  }

  &__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    height: 2.125rem;
    padding: 0 0.85rem;
    border-radius: 8px;
    font-size: 0.8125rem;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    white-space: nowrap;

    &--ghost {
      border: var(--admin-border);
      background: #fff;
      color: #555;
    }

    &--primary {
      border: var(--admin-border);
      background: var(--admin-pink);
      color: #fff;
    }

    &:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
  }

  &__board {
    padding: 24px;
    border: var(--admin-border);
    border-radius: 12px;
    background: #fff;
  }

  &__empty {
    margin: 0;
    padding: 2.5rem 1rem;
    color: #777;
    font-size: 0.875rem;
    text-align: center;
  }
}

.admin-links-dialog {
  position: fixed;
  inset: 0;
  z-index: 10020;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgb(0 0 0 / 45%);

  &__panel {
    width: min(640px, 100%);
    max-height: min(88vh, 900px);
    display: flex;
    flex-direction: column;
    border: 1px solid #000;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 18px 48px rgb(0 0 0 / 18%);

    &--narrow {
      width: min(480px, 100%);
    }
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.85rem 1rem;
    border-bottom: 1px solid #000;

    h2 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: #222;
    }
  }

  &__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #666;
    cursor: pointer;

    &:hover {
      background: #f3f3f3;
      color: #222;
    }
  }

  &__body {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
    padding: 1rem;
    overflow: auto;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;

    span {
      font-size: 0.75rem;
      color: #666;
    }

    input {
      height: 2.125rem;
      padding: 0 0.75rem;
      border: 1px solid #000;
      border-radius: 8px;
      font-size: 0.875rem;
      background: #fff;
      color: #111;
    }

    &--wide {
      grid-column: 1 / -1;
    }
  }

  &__check {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    grid-column: 1 / -1;
    font-size: 0.875rem;
    color: #444;
  }

  &__move {
    display: flex;
    gap: 0.5rem;
    grid-column: 1 / -1;
  }

  &__foot {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.85rem 1rem;
    border-top: 1px solid #000;
  }

  &__foot-spacer {
    flex: 1;
  }

  &__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 2.125rem;
    padding: 0 1rem;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;

    &--ghost {
      border: 1px solid #000;
      background: #fff;
      color: #555;
    }

    &--primary {
      border: 1px solid #000;
      background: #e93d6d;
      color: #fff;
    }

    &--danger {
      border: 1px solid #000;
      background: #fff;
      color: #c0392b;
    }

    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
  }
}

@media (max-width: 768px) {
  .admin-links {
    &__board {
      padding: 0.85rem;
      border-radius: 10px;
    }

    &__empty {
      padding: 2rem 0.75rem;
    }
  }

  .admin-links-dialog {
    padding: 0;
    align-items: stretch;

    &__panel {
      width: 100%;
      max-height: 100dvh;
      min-height: 100dvh;
      border-radius: 0;
      border-left: none;
      border-right: none;
    }

    &__body {
      grid-template-columns: 1fr;
    }

    &__move {
      flex-direction: column;
    }
  }
}
</style>
