export const isOnlineQuery = text => {
  if (/不(要|用|想|需要)(联网|上网|查|搜索|新闻|资讯)/.test(text)) return false
  const date=!/新闻|资讯|天气|提醒|生日|纪念|约会/.test(text)&&/今天.*(日期|几号|几月|星期|周几|农历)|现在.*(时间|几点|日期)|明天.*(几号|星期|周几)|后天.*(几号|星期|周几)|^(日期|时间|几点了|今天几号|今天星期几)[？?。！!]*$/.test(text.trim())
  if(date||/github|开源项目|B站|哔哩哔哩|v2ex/i.test(text)||(/https:\/\//.test(text)&&/读|阅读|看看|看一下|总结|介绍/.test(text)))return true
  const search=/联网|上网|搜索|搜一下|查一下|查查|帮我查|查一查|查询/.test(text)
  return /天气|气温|下雨|降雨|weather/i.test(text) || search || (/新闻|资讯|头条|早报|晚报|简报|news/i.test(text) && (/今天|今日|昨天|明天|最近|最新|近一周|这周|查|有什么|有哪些|播报|讲讲|读|念|看一下|想听|听听|说说|介绍|\d{1,2}月\d{1,2}/.test(text) || text.replace(/[？?。]/g,'').length<=8))
}
