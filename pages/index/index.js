// index.js
// 获取应用实例
const common = require("../../common/common");
import { $wuxLoading } from "../../miniprogram_npm/wux-weapp/index";
const app = getApp()

Page({
  data: {
    // 默认展示样例，隐藏图片预览和日志容器
    showStatus: {
      noticeStatus: true,
      sampleStatus: false,
      previewStatus: true,
      logStatus: false
    },
    tipContent: "",
    logContent: "",
    prompt: "",
    drawResult: "https://replicate.delivery/pbxt/DKFghOgmkTKVCpwgfIeKkTqMemHQMKtW9yxLYqeLyeonHtGMC/out-0.png",
    timer: undefined,
  },
  // 事件处理函数
  bindPromptInput: function(e) {
    this.setData({
      prompt: e.detail.value
    });
  },
  reset() {
    this.setData({
      prompt: ""
    });
  },
  submit() {
    if(!this.data.prompt) {
      console.log("prompt为空不需要提交");
      return;
    }
    $wuxLoading().show({
      text: "绘图中,请稍等..."
    });
    let prompt = this.data.prompt;
    if(!this.data.prompt.toUpperCase().startsWith("A TOK")) {
      prompt = "A TOK emoji of " + this.data.prompt;
    }
    console.log(prompt);
    const req = {
      url: "/submit",
      method: "POST",
      data: {
        prompt
      },
      cb: ret => {
        console.log(ret);
        const urls = ret.urls;
        const getUrl = urls[0].get;
        // 获取日志和结果
        this.data.timer = setInterval(() => {
          this.getPredicResult(getUrl);
        }, 1000);
      }
    };
    common.wxRequest(req);
    // 将样例模块隐藏，显示日志模块
    this.data.showStatus.sampleStatus = false;
  },
  getPredicResult: function(url) {
    const req = {
      url: "/getDraw?url=" + url,
      cb: ret => {
        const logs = ret.logs;
        const output = ret.output;
        // 显示日志
        if(logs) {
          $wuxLoading().hide();
          this.data.showStatus.logStatus = true;
          this.setData({
            showStatus: this.data.showStatus,
            logContent: logs
          });
        }
        // 显示结果
        if(output) {
          $wuxLoading().hide();
          this.data.showStatus.previewStatus = true;
          this.setData({
            showStatus: this.data.showStatus,
            drawResult: output[0]
          });
          clearInterval(this.data.timer);
        }
      }
    };
    common.wxRequest(req);
  },
  onLoad(options) {
    const url = options ? options.url : undefined;
    console.log("url:" + url);
    // 分享模式，直接显示预览模块，隐藏示例
    if(url) {
      this.data.showStatus.previewStatus = true;
      this.data.showStatus.logStatus = false;
      this.data.showStatus.sampleStatus = false;
      this.data.drawResult = url;
      this.setData({
        showStatus: this.data.showStatus,
        drawResult: this.data.drawResult
      });
    }
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
    common.getTips(ret => {
      this.setData({
        tipContent: ret
      });
    });
  },
  onShareAppMessage(res) {
    console.log(res);
    return {  
      title: '看看我用AI生成的Emoji风格头像',  
      path: '/pages/index/index?url=' + res.target.dataset.url,
      imageUrl: res,
      success: function (res) {  
        wx.showToast({ title: '分享成功', icon: 'success', duration: 1500 });  
      },  
      fail: function (res) {  
        wx.showToast({ title: '分享失败', icon: 'none', duration: 1500 });  
      },  
    };
  },
  onShareTimeline: function () {
    return {
      title: 'Emoji风格头像生成器',
    };
  },
  completeOrder(wxOrderId) {
    common.wxRequest({
        url: common.global.commonDomain + "/completeOrder?wxOrderId=" + wxOrderId
    });
  },
  cancelOrder(wxOrderId) {
    common.wxRequest({
        url: common.global.commonDomain + "/cancelOrder?wxOrderId=" + wxOrderId
    });
  },
  payOrder(wxOrderId) {
    common.wxRequest({
      url: common.global.commonDomain + "/getPayParam?wxOrderId=" + wxOrderId + "&productType=emoji",
      cb: ret => {
        let param = {nonceStr: ret.nonce,
            package: "prepay_id=" + ret.pack,
            paySign: ret.signature,
            timeStamp: ret.timestamp,
            signType: "RSA",};
        console.log(param);
        wx.requestPayment({
          nonceStr: ret.nonce,
          package: "prepay_id=" + ret.pack,
          paySign: ret.signature,
          timeStamp: ret.timestamp,
          signType: "RSA",
          success: res => {
            wx.showToast({
                title: '购买成功',
                duration: 3000,
                success: () => {
                    this.completeOrder(wxOrderId);
                    wx.navigateBack({})
                }
            });
          },
          fail: err => {
            let errMsg = "";
            let title = "支付失败";
            if(err.errMsg == "requestPayment:fail cancel") {
                title = "",
                errMsg = "支付取消";
            }
            wx.showModal({
              title: title,
              content: errMsg ? errMsg : err.errMsg,
              complete: (res) => {
                if (res.cancel) {
                  this.cancelOrder(wxOrderId);
                }
                if (res.confirm) {
                    this.cancelOrder(wxOrderId);
                }
              }
            });
          }
        })
      }
    });
  },
  createOrder: function() {
    // 生成订单
    common.wxRequest({
      url: common.global.commonDomain + "/createOrder",
      header: {
          userId: wx.getStorageSync('openId')
      },
      data: {
          code: "emoji_draw",
          price: 50,
          desc: "下载生成式Emoji头像付费",
      },
      method: 'POST',
      cb: ret => {
        console.log(ret);
        // 下单成功，调起支付
        this.payOrder(ret);
      }
    });
  },
  downloadResult() {
    const url = this.data.drawResult;
    $wuxLoading().show({
      text: "下载中，请稍等..."
    });
    wx.downloadFile({
      url,
      success: ret => {
        console.log(ret);
        wx.saveImageToPhotosAlbum({
          filePath: ret.tempFilePath,
          success: function (data) {
            wx.hideLoading(); //隐藏 loading 提示框
            $wuxLoading().hide();
            wx.showModal({
                title: '提示',
                content: '保存成功',
                modalType: false,
            });
          },
          // 接口调用失败的回调函数
          fail: function (err) {
            $wuxLoading().hide();
            if (err.errMsg === "saveImageToPhotosAlbum:fail:auth denied" || err.errMsg === "saveImageToPhotosAlbum:fail auth deny" || err.errMsg === "saveImageToPhotosAlbum:fail authorize no response") {
            wx.showModal({
              title: '提示',
              content: '需要您授权保存相册',
              modalType: false,
              success: modalSuccess => {
                wx.openSetting({
                  success(settingdata) {
                    console.log("settingdata", settingdata)
                    if (settingdata.authSetting['scope.writePhotosAlbum']) {
                      wx.showModal({
                        title: '提示',
                        content: '获取权限成功,再次点击下载即可保存',
                        modalType: false,
                      })
                    } else {
                      wx.showModal({
                          title: '提示',
                          content: '获取权限失败，将无法保存到相册',
                          modalType: false,
                      })
                    }
                  },
                })
              }
            })
          }
          },
        })
      },
      fail: err => {
          console.log(err);
          $wuxLoading().hide();
          wx.showModal({
            title: '',
            content: '下载失败:' + err.errMsg,
          })
      }
    })
  },
  getUserProfile(e) {
    // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认，开发者妥善保管用户快速填写的头像昵称，避免重复弹窗
    wx.getUserProfile({
      desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: (res) => {
        console.log(res)
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    })
  },
  getUserInfo(e) {
    // 不推荐使用getUserInfo获取用户信息，预计自2021年4月13日起，getUserInfo将不再弹出弹窗，并直接返回匿名的用户个人信息
    console.log(e)
    this.setData({
      userInfo: e.detail.userInfo,
      hasUserInfo: true
    })
  }
})
