const { wxRequest, global } = require("./common/common");

// app.js
App({
  update() {
    const updateManager = wx.getUpdateManager();
    updateManager.onCheckForUpdate(res => {
      console.log(res);
      if(res.hasUpdate) {
        updateManager.onUpdateReady(() => {
          wx.showModal({
            title: '更新提示',
            content: '新版本已经准备好，是否重启应用?',
            complete: (res) => {
              if (res.cancel) {
                wx.showModal({
                  title: '提示',
                  content: '本次有新功能更新，旧版本不更新无法使用',
                  complete: (res) => {
                    if (res.cancel) {
                      this.update();
                    }
                    if (res.confirm) {
                      updateManager.applyUpdate();
                    }
                  }
                })
              }
              if (res.confirm) {
                updateManager.applyUpdate();
              }
            }
          })
        });
        updateManager.onUpdateFailed(() => {
            wx.showModal({
              title: '更新提示',
              content: '新版本已经更新，请卸载后再重新搜索打开',
            })
        });
      }
    });
  },
  onLaunch() {
    // 版本更新
    this.update();
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        console.log(res);
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
        wxRequest({
          url: global.commonDomain + "/getOpenId?jsCode=" + res.code + "&productType=emoji",
          cb: ret => {
            console.log("openId:" + ret.openId);
            wx.setStorageSync('openId', ret.openId);
          }
        });
      }
    })
  },
  globalData: {
    userInfo: null
  }
})
