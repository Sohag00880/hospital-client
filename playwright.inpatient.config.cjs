const base=require("./playwright.config.cjs");
module.exports={...base,testMatch:"inpatient.spec.js",use:{...base.use,baseURL:"http://127.0.0.1:3118"},webServer:{...base.webServer,command:"node node_modules/next/dist/bin/next start -p 3118",url:"http://127.0.0.1:3118/login"}};
