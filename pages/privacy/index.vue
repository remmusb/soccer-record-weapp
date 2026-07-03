<template>
  <view class="container">
    <view class="title">隐私政策</view>
    <view class="content">
      <view class="section">
        <view class="section-title">一、引言</view>
        <view class="section-text">野球记录小程序（以下简称"我们"或"本小程序"）高度重视用户的隐私保护。本隐私政策旨在向您说明我们如何收集、使用、存储和保护您的个人信息。请您在使用本小程序前仔细阅读本政策。</view>
      </view>

      <view class="section">
        <view class="section-title">二、我们收集的信息</view>
        <view class="section-text">2.1 微信授权信息：当您使用微信登录时，我们会获取您的微信昵称、头像和 openid。</view>
        <view class="section-text">2.2 您主动填写的信息：包括姓名、昵称、身高、体重、惯用脚、擅长位置、出生年月、康体通后四位等。</view>
        <view class="section-text">2.3 位置信息：仅在您使用地图选点功能时，经您授权后获取。</view>
        <view class="section-text">2.4 图片信息：您主动上传的截图、贴图等图片。</view>
        <view class="section-text">2.5 使用信息：包括您的报名记录、比赛数据、评分数据等。</view>
      </view>

      <view class="section">
        <view class="section-title">三、信息使用目的</view>
        <view class="section-text">3.1 提供核心服务：球队管理、比赛记录、球员统计、报名接龙、赛后评分等。</view>
        <view class="section-text">3.2 发送通知：比赛提醒、报名通知等，仅在您授权订阅后发送。</view>
        <view class="section-text">3.3 生成统计数据：生成球队内部的比赛统计、球员排名等。</view>
        <view class="section-text">3.4 改善服务：分析使用情况以优化产品体验。</view>
      </view>

      <view class="section">
        <view class="section-title">四、信息存储与安全</view>
        <view class="section-text">4.1 您的个人信息存储在微信云开发平台，由腾讯云提供安全保护。</view>
        <view class="section-text">4.2 我们采取合理的技术措施保护您的信息安全，防止未经授权的访问、泄露或篡改。</view>
        <view class="section-text">4.3 未经您的同意，我们不会将您的个人信息提供给任何第三方。</view>
      </view>

      <view class="section">
        <view class="section-title">五、您的权利</view>
        <view class="section-text">5.1 访问权：您可以随时查看和修改您的个人信息。</view>
        <view class="section-text">5.2 更正权：如您发现个人信息有误，可以自行修改或联系我们更正。</view>
        <view class="section-text">5.3 删除权：您可以删除您的账号及相关数据，删除后我们将不再保留您的个人信息。</view>
        <view class="section-text">5.4 撤回同意权：您可以随时撤回对本隐私政策的同意，但撤回后可能影响您使用部分功能。</view>
      </view>

      <view class="section">
        <view class="section-title">六、未成年人保护</view>
        <view class="section-text">本小程序主要面向成年足球爱好者。如您未满18周岁，请在监护人指导下使用，并确保监护人已阅读并同意本隐私政策。</view>
      </view>

      <view class="section">
        <view class="section-title">七、政策更新</view>
        <view class="section-text">我们可能根据需要更新本隐私政策。更新后的政策将在本小程序内公布，您继续使用即视为接受更新后的政策。</view>
      </view>

      <view class="section">
        <view class="section-title">八、联系我们</view>
        <view class="section-text">如您对本隐私政策有任何疑问或建议，请通过小程序内的反馈渠道联系我们。</view>
      </view>

      <view class="date">生效日期：2025年1月1日</view>
    </view>
  </view>
</template>

<style scoped>
.container { padding: 40rpx; background: #fff; min-height: 100vh; }
.title { font-size: 40rpx; font-weight: 700; text-align: center; margin-bottom: 40rpx; color: #1e293b; }
.content { font-size: 28rpx; line-height: 1.8; color: #334155; }
.section { margin-bottom: 32rpx; }
.section-title { font-size: 32rpx; font-weight: 700; color: #1e293b; margin-bottom: 12rpx; }
.section-text { margin-bottom: 8rpx; text-align: justify; }
.date { text-align: center; margin-top: 40rpx; font-size: 26rpx; color: #94a3b8; }
</style>
