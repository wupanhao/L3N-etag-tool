const app = getApp()
const dithering = require('./dithering')

const canvas2bytes = dithering.canvas2bytes

function hexToBytes(hex) {
  for (var bytes = [], c = 0; c < hex.length; c += 2)
    bytes.push(parseInt(hex.substr(c, 2), 16));
  return new Uint8Array(bytes);
}

function bytesToHex(data) {
  return new Uint8Array(data).reduce(
    function (memo, i) {
      return memo + ("0" + i.toString(16)).slice(-2);
    }, "");
}

function intToHex(intIn, bytes = 4) {
  return intIn.toString(16).padStart(bytes * 2, '0');
}

function getUnixTime() {
  const hourOffset = 0;
  const unixNow = Math.round(Date.now() / 1000) + (60 * 60 * hourOffset) - new Date().getTimezoneOffset() * 60;

  const date = new Date((unixNow + new Date().getTimezoneOffset() * 60) * 1000);
  const localeTimeString = date.toLocaleTimeString();

  return { unixNow, localeTimeString, year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(), week: date.getDay() || 7 }
}

Page({
  data: {
    inputText: '0055',
    receiveText: '',
    logText: '',
    name: '',
    connectedDeviceId: '',
    services: {},
    characteristics: {},
    connected: true
  },
  bindInput: function (e) {
    this.setData({
      inputText: e.detail.value
    })
    console.log(e.detail.value)
  },
  SendInputCmd: function () {
    var that = this
    var array = hexToBytes(that.data.inputText)
    that.SendRxTxCmd(array)
  },
  SwitchMode0: function () {
    var that = this
    var array = hexToBytes("e100")
    that.SendRxTxCmd(array)
  },
  SwitchMode1: function () {
    var that = this
    var array = hexToBytes("e101")
    that.SendRxTxCmd(array)
  },
  SwitchMode2: function () {
    var that = this
    var array = hexToBytes("e102")
    that.SendRxTxCmd(array)
  },
  SendRxTxCmd: function (array) {
    var that = this
    if (that.data.connected) {

      wx.writeBLECharacteristicValue({
        deviceId: that.data.connectedDeviceId,
        serviceId: "00001f10-0000-1000-8000-00805f9b34fb",
        characteristicId: "00001f1f-0000-1000-8000-00805f9b34fb",
        value: array.buffer,
        success: function (res) {
          that.AddLog('发送指令成功:' + bytesToHex(array))
        }
      })
    } else {
      wx.showModal({
        title: '提示',
        content: '蓝牙已断开',
        showCancel: false,
        success: function (res) {
          that.setData({
            searching: false
          })
        }
      })
    }
  },

  AddLog: function (text) {
    var that = this
    that.setData({
      logText: text + "\n" + that.data.logText 
    })
  },

  SendEpdCmd: async function (array) {
    var that = this
    if (that.data.connected) {
      // console.log(array)
      return new Promise(resolve => {
        wx.writeBLECharacteristicValue({
          deviceId: that.data.connectedDeviceId,
          serviceId: "13187b10-eba9-a3ba-044e-83d3217d9a38",
          characteristicId: "4b646063-6264-f3a7-8941-e65356ea82fe",
          value: array.buffer,
          success: (res) => {
            // console.log('发送成功')
            resolve('发送成功')
          }
        })
      })

    } else {
      wx.showModal({
        title: '提示',
        content: '蓝牙已断开',
        showCancel: false,
        success: function (res) {
          that.setData({
            searching: false
          })
        }
      })
    }
  },
  onLoad: function (options) {
    var that = this
    console.log(options)
    that.setData({
      name: options.name,
      connectedDeviceId: options.connectedDeviceId
    })
    return
    wx.getBLEDeviceServices({
      deviceId: that.data.connectedDeviceId,
      success: function (res) {
        console.log(res.services)
        that.setData({
          services: res.services
        })
        wx.getBLEDeviceCharacteristics({
          deviceId: options.connectedDeviceId,
          serviceId: res.services[0].uuid,
          success: function (res) {
            console.log(res.characteristics)
            that.setData({
              characteristics: res.characteristics
            })
            wx.notifyBLECharacteristicValueChange({
              state: true,
              deviceId: options.connectedDeviceId,
              serviceId: that.data.services[0].uuid,
              characteristicId: that.data.characteristics[0].uuid,
              success: function (res) {
                console.log('启用notify成功')
              }
            })
          }
        })
      }
    })
    wx.onBLEConnectionStateChange(function (res) {
      console.log(res.connected)
      that.setData({
        connected: res.connected
      })
    })
    wx.onBLECharacteristicValueChange(function (res) {
      var receiveText = app.buf2string(res.value)
      console.log('接收到数据：' + receiveText)
      that.setData({
        receiveText: receiveText
      })
    })
  },
  onReady: function () {
    const query = wx.createSelectorQuery()
    query.select('#myCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')

        const dpr = wx.getSystemInfoSync().pixelRatio

        canvas.width = 296
        canvas.height = 128

        // console.log(dpr)
        // canvas.width = res[0].width * dpr
        // canvas.height = res[0].height * dpr
        // ctx.scale(dpr, dpr)

        // ctx.fillRect(20, 20, 260, 80)
      })
  },
  onShow: function () {

  },
  onHide: function () {

  },
  uploadImage: function () {
    wx.chooseImage({
      count: 1,
      success: function (res) {
        console.log(res);
        wx.getImageInfo({
          src: res.tempFilePaths[0],
          success: function (res) {
            console.log(res)
            // 图片原始长宽
            var imageWidth = res.width;
            var imageHeight = res.height;
            var canvasWidth = 296;
            var canvasHeight = 128;

            const query = wx.createSelectorQuery()
            query.select('#myCanvas')
              .fields({ node: true, size: true })
              .exec((res2) => {
                const canvas = res2[0].node
                const ctx = canvas.getContext('2d')

                // 图片对象
                const image = canvas.createImage()
                // 图片加载完成回调
                image.onload = () => {
                  // 将图片绘制到 canvas 上
                  console.log(image.width, image.height, canvas.width, canvas.height)
                  ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight)
                  dithering.ditheringCanvasByPalette(canvas, null, 'bwr_floydsteinberg')
                }
                // 设置图片src
                image.src = res.path

              })
          }
        })
      }
    })
  },

  sendImage: async function (canvas) {
    var that = this

    const startTime = new Date().getTime();

    await that.SendEpdCmd(hexToBytes("0000"));

    await that.SendEpdCmd(hexToBytes("020000"));

    await that.sendBufferData(bytesToHex(canvas2bytes(canvas)), 'bw')
    await that.sendBufferData(bytesToHex(canvas2bytes(canvas, 'bwr')), 'bwr')

    await that.SendEpdCmd(hexToBytes("0101"))

    that.AddLog(`刷新完成，耗时${(new Date().getTime() - startTime) / 1000}s`);
  },

  sendBufferData: async function (value, type) {
    var that = this
    that.AddLog(`开始发送图片模式:${type}, 大小 ${value.length / 2 / 1024}KB`);
    let code = 'ff';
    if (type === 'bwr') {
      code = '00';
    }
    const step = 480;
    let partIndex = 0;
    for (let i = 0; i < value.length; i += step) {
      that.AddLog(`正在发送第${partIndex + 1}块. 块大小: ${step / 2 + 4}byte. 起始位置: ${i / 2}`);
      await that.SendEpdCmd(hexToBytes("03" + code + intToHex(i / 2, 2) + value.substring(i, i + step)));
      partIndex += 1;
    }
  },

  SendImage: function () {
    var that = this
    const query = wx.createSelectorQuery()
    query.select('#myCanvas')
      .fields({ node: true, size: true })
      .exec((res2) => {
        const canvas = res2[0].node
        that.sendImage(canvas)
      })
  },

  SetTime: async function () {
    var that = this
    const { unixNow, localeTimeString, year, month, day, week } = getUnixTime();

    that.AddLog("时间设置为: " + localeTimeString + " : dd" + intToHex(unixNow, 4));
    await that.SendRxTxCmd(hexToBytes('dd' +
      [intToHex(unixNow, 4), intToHex(year, 2), intToHex(month, 1), intToHex(day, 1), intToHex(week, 1)].join('')));

    await that.SendRxTxCmd(hexToBytes('e2'))
  }

})