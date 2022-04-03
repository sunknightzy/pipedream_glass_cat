import discordWebhook from './app.mjs'

/* eslint-disable pipedream/required-properties-key, pipedream/required-properties-name,
  pipedream/required-properties-version, pipedream/required-properties-description */
export default {
    type: 'action',
    props: {
        discordWebhook,
        message: {
            propDefinition: [discordWebhook, 'message'],
        },
        threadID: {
            propDefinition: [discordWebhook, 'threadID'],
        },
        username: {
            propDefinition: [discordWebhook, 'username'],
        },
        avatarURL: {
            propDefinition: [discordWebhook, 'avatarURL'],
        },
    },
    methods: {
        getUserInputProps(omit = ['discordWebhook']) {
            return Object.keys(this)
                .filter((k) => typeof this[k] !== 'function' && !omit.includes(k))
                .reduce((props, key) => {
                    props[key] = this[key]
                    return props
                }, {})
        },
    },
}
