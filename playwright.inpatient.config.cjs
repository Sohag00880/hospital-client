const {defineConfig}=require("@playwright/test");
const base=require("./playwright.config.cjs");
module.exports=defineConfig({...base,testMatch:"inpatient.spec.js",webServer:{...base.webServer,reuseExistingServer:true}});
