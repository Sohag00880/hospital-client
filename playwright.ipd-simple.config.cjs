const base=require("./playwright.config.cjs");
module.exports={...base,testMatch:"ipd-simple.spec.js",use:{...base.use,baseURL:"http://127.0.0.1:3117"},webServer:{...base.webServer,command:"node node_modules/next/dist/bin/next start -p 3117",url:"http://127.0.0.1:3117/login"}};
