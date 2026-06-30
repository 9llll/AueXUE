<script setup lang="ts">
import { useSiteConfig } from 'valaxy'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  siteshot?: string
}>(), {
  siteshot: 'https://r2tc.20030327.xyz/file/博客/主题/1780643226230_wallhaven-9d1yjk.png',
})

const siteConfig = useSiteConfig()

const ymlTemplate = `- name: #站点名称
  link: #站点链接
  avatar: #站长头像
  descr: #站点描述
  siteshot: #站点截图`

const ymlLines = computed(() => ymlTemplate.split('\n'))

const siteInfo = computed(() => {
  const url = siteConfig.value.url || ''
  return {
    name: `${siteConfig.value.title || 'AIOVTUE'}'s blog`,
    url: url.endsWith('/') ? url : `${url}/`,
    avatar: siteConfig.value.author?.avatar || '',
    desc: siteConfig.value.description || '',
    siteshot: props.siteshot,
  }
})

const rules = [
  { icon: '🎉', text: '本站支持交换友链，在您提出申请之前，请将本站添加到友链' },
  { icon: '🍵', text: '为了保障本站用户，本站仅支持个人网站的友链申请' },
  { icon: '💡', text: '申请本站友链需要拥有独立域名（非免费域名），建议开启全站 HTTPS' },
  { icon: '⌛', text: '如果友情链接已经添加，请保持网站的正常访问，会定期清理僵尸网站' },
  { icon: '🐚', text: '网站有一定的实质性内容和主题，不能是空壳网站和练手网站' },
  { icon: '💕', text: '感谢您对本站的支持，如果您已经满足上述要求，请在下方表单提交友链申请~~~' },
]

async function copyYml() {
  try {
    await navigator.clipboard.writeText(ymlTemplate)
  }
  catch (err) {
    console.error(err)
  }
}
</script>

<template>
  <section class="friend-link-notice">
    <header class="friend-link-notice__header">
      <h2 class="friend-link-notice__title">
        <span class="friend-link-notice__title-icon" aria-hidden="true">✦</span>
        加入本站友链方式
      </h2>
      <p class="friend-link-notice__subtitle">
        参照以下格式留言即可
      </p>
    </header>

    <div class="friend-link-code">
      <div class="friend-link-code__bar">
        <div class="friend-link-code__dots" aria-hidden="true">
          <span class="dot dot-red" />
          <span class="dot dot-yellow" />
          <span class="dot dot-green" />
        </div>
        <span class="friend-link-code__lang">YML</span>
        <button
          type="button"
          class="friend-link-code__copy"
          title="复制代码"
          @click="copyYml"
        >
          📋
        </button>
      </div>

      <pre class="friend-link-code__body"><code><span
        v-for="(line, index) in ymlLines"
        :key="index"
        class="friend-link-code__line"
      ><span class="friend-link-code__ln">{{ index + 1 }}</span><span class="friend-link-code__text">{{ line }}</span>
</span></code></pre>

      <span class="friend-link-code__cat" aria-hidden="true">🐱</span>
    </div>

    <div class="friend-link-rules">
      <span class="friend-link-rules__plus" aria-hidden="true">+</span>

      <ul class="friend-link-rules__list">
        <li
          v-for="(rule, index) in rules"
          :key="index"
          class="friend-link-rules__item"
        >
          <span class="friend-link-rules__icon">{{ rule.icon }}</span>
          <span>{{ rule.text }}</span>
        </li>
      </ul>

      <div class="friend-link-site-info">
        <p class="friend-link-site-info__title">
          <span aria-hidden="true">📍</span>
          本站友链信息如下：
        </p>
        <ul class="friend-link-site-info__list">
          <li>
            站点名称：<span class="friend-link-highlight">AIOVTUE-雪</span>
          </li>
          <li>
            站点链接：<span class="friend-link-highlight">https://live.yybb.us</span>
          </li>
          <li>
            站长头像：<span class="friend-link-highlight">{{ siteInfo.avatar }}</span>
          </li>
          <li>
            站点描述：<span class="friend-link-highlight">雨滴会记录生命中的每一个瞬间</span>
          </li>
          <li>
            站点截图：<span class="friend-link-highlight">https://r2tc.20030327.xyz/file/博客/主题/1780909850378_1780909790262.png</span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.friend-link-notice {
  --notice-accent: #c9a0dc;
  --notice-accent-deep: #9b7bb8;
  --notice-pink: #e8a4b8;
  --notice-title: #e07a96;

  width: 100%;
  box-sizing: border-box;

  @at-root html.dark & {
    --notice-accent: #9b7bb8;
    --notice-accent-deep: #b89fd0;
    --notice-title: #f0a8bc;
  }
}

.friend-link-notice__header {
  margin-bottom: 14px;
}

.friend-link-notice__title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 6px;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--notice-title);
}

.friend-link-notice__title-icon {
  font-size: 0.95rem;
  line-height: 1;
}

.friend-link-notice__subtitle {
  margin: 0;
  font-size: 0.82rem;
  color: #888;

  @at-root html.dark & {
    color: #b0b0b8;
  }
}

.friend-link-code {
  position: relative;
  overflow: hidden;
  margin-bottom: 16px;
  border-radius: 12px;
  border: 1px solid oklch(0% 0 0 / 12%);
  box-shadow: 0 8px 22px oklch(0% 0 0 / 10%);
  background: #2b303b;
}

.friend-link-code__bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #232733;
  border-bottom: 1px solid oklch(100% 0 0 / 6%);
}

.friend-link-code__dots {
  display: flex;
  gap: 6px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot-red {
  background: #ff5f57;
}

.dot-yellow {
  background: #febc2e;
}

.dot-green {
  background: #28c840;
}

.friend-link-code__lang {
  flex: 1;
  font-size: 0.82rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.06em;
}

.friend-link-code__copy {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #c8d0dc;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;

  &:hover {
    background: oklch(100% 0 0 / 8%);
    color: #fff;
  }
}

.friend-link-code__body {
  margin: 0;
  padding: 14px 12px 16px;
  overflow-x: auto;
  background: #2b303b;
}

.friend-link-code__body code {
  display: block;
  font-family: 'JetBrains Mono', 'Cascadia Code', Consolas, monospace;
  font-size: 0.78rem;
  line-height: 1.75;
  color: #e6edf3;
  white-space: pre;
}

.friend-link-code__line {
  display: block;
}

.friend-link-code__ln {
  display: inline-block;
  width: 1.6em;
  margin-right: 0.8em;
  color: #6e7681;
  user-select: none;
  text-align: right;
}

.friend-link-code__text {
  color: #e6edf3;
}

.friend-link-code__cat {
  position: absolute;
  right: -4px;
  bottom: 8px;
  font-size: 1.6rem;
  line-height: 1;
  pointer-events: none;
  transform: rotate(-8deg);
}

.friend-link-rules {
  position: relative;
  padding: 16px 14px 16px 18px;
  border-radius: 0 12px 12px 0;
  border-left: 4px solid var(--notice-accent-deep);
  background: oklch(96% 0.015 310 / 88%);

  @at-root html.dark & {
    background: oklch(24% 0.02 300);
    border-left-color: #b89fd0;
  }
}

.friend-link-rules__plus {
  position: absolute;
  left: -13px;
  bottom: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--notice-accent-deep);
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 2px 8px oklch(0% 0 0 / 15%);
}

.friend-link-rules__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.friend-link-rules__item {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
  font-size: 0.82rem;
  line-height: 1.65;
  color: #4a4a52;

  @at-root html.dark & {
    color: #e4e4ea;
  }
}

.friend-link-rules__icon {
  flex-shrink: 0;
}

.friend-link-site-info {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed oklch(0% 0 0 / 10%);

  @at-root html.dark & {
    border-top-color: oklch(100% 0 0 / 14%);
  }
}

.friend-link-site-info__title {
  margin: 0 0 10px;
  font-size: 0.84rem;
  font-weight: 600;
  color: #3a3a42;

  @at-root html.dark & {
    color: #f0f0f4;
  }
}

.friend-link-site-info__list {
  margin: 0;
  padding-left: 1.1em;
  list-style: circle;
}

.friend-link-site-info__list li {
  margin-bottom: 8px;
  font-size: 0.8rem;
  line-height: 1.6;
  color: #4a4a52;
  word-break: break-all;

  @at-root html.dark & {
    color: #d8d8e0;
  }
}

.friend-link-highlight {
  display: inline;
  padding: 1px 6px;
  border-radius: 4px;
  background: oklch(92% 0.04 350);
  color: #3a3a42;

  @at-root html.dark & {
    background: oklch(38% 0.06 350);
    color: #ffe8f0;
  }
}

</style>
