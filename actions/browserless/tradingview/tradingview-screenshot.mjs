import puppeteer from 'puppeteer-core'

export default {
    key: 'DEV_TRADINGVIEW_SCREENSHOT',
    name: 'TradingView截图 ClassCat开发版',
    version: '0.1.3',
    type: 'action',
    props: {
        browserless: {
            type: 'app',
            app: 'browserless',
        },
        chartId: {
            type: 'string',
            label: 'ChartId',
            optional: false,
            description: '输入TradingView的ChartID',
        },
        exchange: {
            type: 'string',
            label: 'Exchange',
            optional: false,
            description: '输入交易所的名称',
        },
        ticker: {
            type: 'string',
            label: 'Ticker',
            optional: false,
            description: '输入股票或者币种的名称',
        },
        interval: {
            type: 'string',
            label: 'Interval',
            optional: false,
            description: '输入想要查看的周期',
        },
        theme: {
            type: 'string',
            label: 'Theme',
            description: '选择主题颜色',
            optional: true,
            default: 'dark',
            options: ['default', 'dark'],
        },
        browserWidth: {
            type: 'integer',
            label: 'Image Width',
            description: '浏览器宽度,单位像素,决定图片清晰度',
            optional: false,
            default: 2560,
        },
        browserHeight: {
            type: 'integer',
            label: 'Image Height',
            description: '浏览器高度,单位像素,决定图片清晰度',
            optional: false,
            default: 2560,
        },
        waitTime: {
            type: 'integer',
            label: 'Wait Time',
            description:
                '单位: 秒,等待图片生成的时间,因为TradingView服务器生成图片需要一点时间,未生成之前去访问会报403',
            optional: false,
            default: 2,
        },
    },
    async run({$}) {
        const blockedResourceTypes = [
            'image',
            'media',
            'font',
            'texttrack',
            'object',
            'beacon',
            'csp_report',
            'imageset',
        ]

        const skippedResources = [
            'quantserve',
            'adzerk',
            'doubleclick',
            'adition',
            'exelator',
            'sharethrough',
            'cdn.api.twitter',
            'google-analytics',
            'googletagmanager',
            'google',
            'fontawesome',
            'facebook',
            'analytics',
            'optimizely',
            'clicktale',
            'mixpanel',
            'zedo',
            'clicksor',
            'tiqcdn',
        ]

        const chromeOptions = [
            '--start-maximized',
            '--force-dark-mode',
            '--no-sandbox',
            '--disable-dev-shm-usage',
        ]

        let browser = null
        let picUrl = null
        const {
            chartId,
            exchange,
            ticker,
            interval,
            theme,
            browserWidth,
            browserHeight,
            waitTime,
        } = this
        try {
            puppeteer.defaultArgs({
                headless: true,
                args: chromeOptions,
            })
            browser = await puppeteer.connect({
                browserWSEndpoint: `wss://chrome.browserless.io?token=${this.browserless.$auth.api_key}`,
            })
            const page = await browser.newPage()

            await page.setRequestInterception(true)
            await page.setUserAgent(
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36'
            )
            if (!browserHeight || !browserWidth) {
                await page.setViewport({
                    width: browserWidth,
                    height: browserHeight,
                })
            } else {
                await page.setViewport({
                    width: 2560,
                    height: 1600,
                })
            }

            page.on('request', (request) => {
                const requestUrl = request.url().split('?')[0].split('#')[0]
                if (
                    blockedResourceTypes.indexOf(request.resourceType()) !== -1 ||
                    skippedResources.some(
                        (resource) => requestUrl.indexOf(resource) !== -1
                    )
                ) {
                    request.abort()
                } else {
                    request.continue()
                }
            })

            const chartUrl = `https://www.tradingview.com/chart/${chartId}?symbol=${exchange}:${ticker}&interval=${interval}&theme=${theme}`
            await page.goto(chartUrl)
            // 图表放大快捷键 Ctrl + ↑
            await page.keyboard.down('ControlLeft')
            await page.keyboard.press('ArrowUp')
            await page.keyboard.press('ArrowUp')
            await page.keyboard.press('ArrowUp')
            await page.keyboard.press('ArrowUp')
            await page.keyboard.up('ControlLeft')
            const retrievedData = await page.evaluate(() => {
                return this._exposed_chartWidgetCollection.takeScreenshot()
            })

            const res = retrievedData.toString()
            picUrl = `https://s3.tradingview.com/snapshots/${res
                .substring(0, 1)
                .toLowerCase()}/${res}.png`
        } catch (error) {
            console.log(error.toString())
            if (browser) {
                await browser.close()
            }
            browser = null
        } finally {
            if (browser) {
                await browser.close()
            }
        }
        if (picUrl === null) {
            $.flow.exit('图片生成失败')
        }
        Atomics.wait(
            new Int32Array(new SharedArrayBuffer(4)),
            0,
            0,
            1000 * waitTime
        )
        return {picUrl}
    },
}
