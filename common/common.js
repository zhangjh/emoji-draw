// 全局变量
const debug = false;
const env = "prod";
const config = {
  httpDomainProd: "https://wx.zhangjh.me/wx/emoji",
  httpDomainTest: "https://test.zhangjh.me/wx/emoji",
  commonDomainProd: "https://wx.zhangjh.me/wx",
  commonDomainTest: "https://test.zhangjh.me/wx",
};
const global = {
  domain: debug ? "http://localhost:9000/wx/emoji" : (
    env === "prod" ? config.httpDomainProd : config.httpDomainTest
  ),
  commonDomain: debug ? "http://localhost:9000/wx" : (
    env === "prod" ? config.commonDomainProd : config.commonDomainTest
  )
};

// 封装wx.request请求，req: {url, data, cb}
const wxRequest = function(req) {
  let url = req.url;
  if(!url.startsWith("http")) {
    url = global.domain + url;
  }
  if(!req.method) {
    req.method = "GET";
  }
  if(!req.header) {
    req.header = {};
  }
  req.header["content-type"] = "application/json";
  wx.request({
    url: url,
    data: req.data,
    header: req.header,
    method: req.method,
    timeout: 60000,
    complete: req.completeCb,
    success: ret => {
      if(ret.statusCode === 200 && ret.data.success) {
        const status = ret.data && ret.data.data && ret.data.data.status;
        if(status === "402") {
          wx.showModal({
            title: '错误',
            content: '调用已达上限，请稍等',
            showCancel: false,
            complete: (res) => {
            }
          })
        } else {
          if(req.cb) req.cb(ret.data.data);
        }
      } else {
        console.error(ret);
        if(req.failCb) req.failCb(ret.data.errorMsg);
        wx.showModal({
          title: '调用错误',
          content: ret.data.errorMsg,
          showCancel: false,
          complete: (res) => {
          }
        })
      }
    },
    fail: err => {
      console.error(err);
      // 如果有失败回调先执行
      if(req.failCb) {
        req.failCb(err);
      }
      wx.showModal({
        title: '错误',
        content: '网络好像有点问题？',
        showCancel: false,
        complete: (res) => {
        }
      })
    }
  })
} 

// 获取通知内容
const getTips = function(cb) {
  wxRequest({
    url: "/getTips",
    cb: ret => {
      if(cb) cb(ret);
    }
  });
}

const escape = function(text) {
  const lines = text.split('\n');  
  const nodes = [];  
  
  lines.forEach((line, index) => {  
    nodes.push({ type: 'text', text: line });  
  
    if (index < lines.length - 1) {  
      nodes.push({ type: 'text', text: '\n' });  
    }  
  });  
  
  return nodes;  
}

module.exports = {
  global,
  wxRequest,
  getTips,
  escape
};