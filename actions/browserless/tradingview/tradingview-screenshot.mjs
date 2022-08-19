import puppeteer from 'puppeteer-core'

export default {
  key: 'TRADINGVIEW_SCREENSHOT',
  name: 'TradingView截图-RELEASE-1.0.3',
  version: '1.0.3',
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
      description: '输入交易所的名称,必须和TradingView上保持一致',
    },
    ticker: {
      type: 'string',
      label: 'Ticker',
      optional: false,
      description: '输入股票或者币种的名称,必须和TradingView上保持一致',
    },
    interval: {
      type: 'string',
      label: 'Interval',
      optional: false,
      description: '输入想要查看的周期,必须和TradingView上保持一致',
    },
    theme: {
      type: 'string',
      label: 'Theme',
      description: '选择主题颜色,默认dark深色,可选light亮色',
      optional: false,
      default: 'dark',
      options: ['light', 'dark'],
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
      default: 1600,
    },
    waitTime: {
      type: 'integer',
      label: 'Wait Time',
      description:
        '单位: 秒,等待图片生成的时间,因为TradingView服务器生成图片需要一点时间,未生成之前去访问会报403',
      optional: false,
      default: 2,
    },
    resetChart: {
      type: 'boolean',
      label: 'Reset Chart',
      description: '截图前重置图表缩放,默认:false',
      optional: false,
      default: false,
    },
    rightMargin: {
      type: 'integer',
      label: 'Right Margin',
      description: '最近的K线需要往左调整多少根K线的距离',
      optional: false,
      default: 1,
    },
    zoomOutTimes: {
      type: 'integer',
      label: 'Zoom Out Times',
      description: '图表放大几次，默认不放大',
      optional: false,
      default: 0,
    },
  },
  async run({ $ }) {
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
      resetChart,
      rightMargin,
      zoomOutTimes,
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

      await Promise.all([
        page.setRequestInterception(true),
        page.setUserAgent(
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36'
        ),
        page.setViewport({
          width: browserWidth,
          height: browserHeight,
        }),
      ])

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

      // 修改主题
      // 1、展开菜单
      await page
        .waitForSelector('div.layout__area--topleft')
        .then(async (ele) => await ele.click())
        .catch((err) => console.log('click menu error, cause:', err))
      // 2、修改主题
      await page.waitForSelector('input#theme-switcher').then(async (ele) => {
        // TODO 判断要切换的主题颜色
        const darkSwitcher = await page.$('input#theme-switcher:checked')
        const lightSwicher = await page.$('input#theme-switcher')
        if (theme === 'dark') {
          // 当前是亮色
          if (darkSwitcher === null) {
            lightSwicher.click()
          }
        }
        if (theme === 'light') {
          // 当前是深色
          if (darkSwitcher) {
            darkSwitcher.click()
          }
        }
      })

      // 3、如果有确认框，点击确认弹窗按钮
      await page
        .waitForSelector("div.footer-2AC2DTdZ > button[name='yes']", {
          timeout: 1000,
        })
        .then(
          // 有弹窗
          (ele) => ele.click()
        )
        .catch((err) => {
          // 无弹窗
          console.log('do not need confirm dialog', err)
        })

      // 重新聚焦图表
      await page.keyboard.press('Escape')

      if (resetChart === true) {
        // ALT + R 快捷键 重置图表为 默认 K线宽度和坐标系自动缩放 auto scale
        await Promise.all([
          page.keyboard.down('AltLeft'),
          page.keyboard.press('KeyR'),
          page.keyboard.up('AltLeft'),
        ])
      }
      if (zoomOutTimes || zoomOutTimes > 0) {
        // 图表放大快捷键 Ctrl + ↑
        await page.keyboard.down('ControlLeft')
        for (let i = 0; i < zoomOutTimes; i++) {
          await page.keyboard.press('ArrowUp')
        }
        await page.keyboard.up('ControlLeft')
      }
      if (rightMargin || rightMargin > 0) {
        for (let i = 0; i < rightMargin; i++) {
          // 快捷键 → 调整第一个K线和坐标右侧的距离，单位为K线的根数
          await page.keyboard.press('ArrowRight')
        }
      }
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
      $.flow.exit('screenshot error')
    }
    Atomics.wait(
      new Int32Array(new SharedArrayBuffer(4)),
      0,
      0,
      1000 * waitTime
    )
    return { picUrl }
  },
}
