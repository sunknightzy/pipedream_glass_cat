import axios from 'axios'
import FormData from 'form-data'

export default {
    type: 'app',
    app: 'discord_webhook',
    propDefinitions: {
        message: {
            type: 'string',
            label: 'Message',
            description:
                '输入想要发送的信息(最多2000个字符). Message是最常用的字段. 但是你也可以通过embed发送信息',
        },
        embeds: {
            type: 'any',
            label: 'Embeds',
            description:
                '这是除Message之外,另外一种发送消息的方式,Embeds更加高级,具体格式可以参考链接[array of embed objects](https://birdie0.github.io/discord-webhooks-guide/discord_webhook.html). 格式示例: ``{{ [{"description":"Use markdown including *Italic* **bold** __underline__ ~~strikeout~~ [hyperlink](https://google.com) `code`"}] }}``. ',
            optional: true,
        },
        username: {
            type: 'string',
            label: 'Username',
            description: '机器人的名字,可以随意更改',
            optional: true,
        },
        avatarURL: {
            type: 'string',
            label: 'Avatar URL',
            description: '机器人的头像网址,可以随意更改',
            optional: true,
        },
        threadID: {
            type: 'string',
            label: 'Thread ID',
            description: '子区ID,可以指定消息发送到哪个子区',
            optional: true,
        },
    },
    methods: {
        url() {
            return this.$auth.oauth_uid
        },
        async sendMessage({content, embeds, username, avatarURL, threadID}) {
            const serializedContent =
                typeof content !== 'string' ? JSON.stringify(content) : content
            if (!threadID) threadID = undefined
            const resp = await axios({
                method: 'POST',
                url: this.url(),
                headers: {
                    'Content-Type': 'application/json',
                },
                validateStatus: () => true,
                params: {
                    thread_id: threadID,
                },
                data: {
                    content: serializedContent,
                    embeds,
                    username,
                    avatar_url: avatarURL,
                },
            })
            if (resp.status >= 400) {
                throw new Error(JSON.stringify(resp.data))
            }
            return resp.data
        },
        async sendMessageWithFile({
                                      content,
                                      username,
                                      avatarURL,
                                      embeds,
                                      threadID,
                                      file,
                                  }) {
            const data = new FormData()
            const serializedContent =
                typeof content !== 'string' ? JSON.stringify(content) : content
            data.append(
                'payload_json',
                JSON.stringify({
                    content: serializedContent,
                    username,
                    avatar_url: avatarURL,
                    embeds,
                })
            )
            if (file) data.append('file', file)
            if (!threadID) threadID = undefined
            const resp = await axios({
                method: 'POST',
                url: this.url(),
                headers: {
                    'Content-Type': 'multipart/form-data; boundary=' + data._boundary,
                },
                validateStatus: () => true,
                params: {
                    thread_id: threadID,
                },
                data,
                file,
            })
            if (resp.status >= 400) {
                throw new Error(JSON.stringify(resp.data))
            }
            return resp.data
        },
    },
}
