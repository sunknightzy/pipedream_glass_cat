import common from '../common.mjs'
import axios from 'axios'
import fs from 'fs'

export default {
  ...common,
  key: 'DISCORD_SEND_FILE',
  name: '给Discord发送附件-RELEASE-1.0.1',
  description: '发送带有附件的消息',
  version: '1.0.1',
  type: 'action',
  props: {
    ...common.props,
    message: {
      propDefinition: [common.props.discordWebhook, 'message'],
      optional: true,
    },
    fileUrl: {
      type: 'string',
      label: 'File URL',
      description:
        '文件的网址URL,必须填写**File URL** 或者 **File Path**之中的一项',
      optional: true,
    },
    filePath: {
      type: 'string',
      label: 'File Path',
      description:
        '文件的物理绝对路径, 例如: `/tmp/myFile.csv`. 必须填写**File URL** 或者 **File Path**之中的一项',
      optional: true,
    },
  },
  async run({ $ }) {
    const { message, avatarURL, threadID, username, fileUrl, filePath } = this

    if (!fileUrl && !filePath) {
      throw new Error('必须填写**File URL** 或者 **File Path**之中的一项')
    }

    const file = fileUrl
      ? (
          await axios({
            method: 'get',
            url: fileUrl,
            responseType: 'stream',
          })
        ).data
      : fs.createReadStream(filePath)

    try {
      // No interesting data is returned from Discord
      await this.discordWebhook.sendMessageWithFile({
        avatarURL,
        threadID,
        username,
        file,
        content: message,
      })
      $.export('$summary', '消息发送成功 !!!')
    } catch (err) {
      const unsentMessage = this.getUserInputProps()
      $.export('unsent', unsentMessage)
      throw err
    }
  },
}
